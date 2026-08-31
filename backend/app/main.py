"""Aplicação FastAPI que disponibiliza o BERTimbau para o aplicativo mobile."""

import asyncio
import base64
import binascii
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

from .auth import require_firebase_user
from .classifier import BertimbauClassifier
from .ocr import ImageTextExtractor
from .risk import (
    combined_risk_probability,
    normalize_url,
    recommended_action,
    risk_level,
    warning_signals,
)


# Configurações podem ser substituídas por variáveis de ambiente ao publicar o contêiner.
PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_MODEL_PATH = PROJECT_ROOT / "models" / "bertimbau-smishing-v2"
MODEL_PATH = Path(os.getenv("MODEL_PATH", str(DEFAULT_MODEL_PATH))).resolve()
LOW_THRESHOLD = float(os.getenv("LOW_RISK_THRESHOLD", "0.35"))
HIGH_THRESHOLD = float(os.getenv("HIGH_RISK_THRESHOLD", "0.70"))
MAX_IMAGE_BYTES = int(os.getenv("MAX_IMAGE_BYTES", str(4 * 1024 * 1024)))

if not 0 < LOW_THRESHOLD < HIGH_THRESHOLD < 1:
    raise ValueError("Os limites de risco devem obedecer 0 < baixo < alto < 1.")


class PredictionRequest(BaseModel):
    """Entrada textual usada para mensagens ou endereços web."""
    text: str = Field(min_length=1, max_length=2048)
    analysisType: Literal["message", "link"] = "message"

    @field_validator("text")
    @classmethod
    def clean_text(cls, value: str) -> str:
        cleaned = " ".join(value.split())
        if not cleaned:
            raise ValueError("A mensagem não pode ficar vazia.")
        return cleaned


class ImagePredictionRequest(BaseModel):
    """Print comprimido no celular e enviado como Data URL para o OCR local."""
    imageData: str = Field(min_length=100, max_length=6_000_000)


class PredictionResponse(BaseModel):
    """Resposta já pronta para cores, porcentagem, alertas e orientação da tela mobile."""
    level: str
    riskScore: int
    label: str
    confidence: float
    fraudProbability: float
    modelFraudProbability: float
    heuristicScore: float
    analysisMode: str
    probabilities: dict[str, float]
    warnings: list[str]
    advice: str
    modelVersion: str
    analysisType: str
    analyzedText: str


@asynccontextmanager
async def lifespan(app: FastAPI):
    # BERTimbau e OCR são carregados uma única vez, antes de aceitar requisições.
    app.state.classifier = BertimbauClassifier(MODEL_PATH)
    app.state.ocr = ImageTextExtractor()
    yield


app = FastAPI(
    title="Detector de Golpes — API de Classificação",
    version="1.0.0",
    lifespan=lifespan,
)

# O Expo pode enviar uma requisição OPTIONS antes do POST. Como esta API será
# usada somente na rede local, aceitamos as origens e cabeçalhos necessários.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.get("/health")
def health(request: Request) -> dict[str, str | bool]:
    """Permite verificar se a API iniciou e se o modelo está disponível."""
    classifier = getattr(request.app.state, "classifier", None)
    ocr = getattr(request.app.state, "ocr", None)
    return {
        "status": "ok" if classifier else "starting",
        "modelReady": bool(classifier),
        "ocrReady": bool(ocr),
        "modelVersion": MODEL_PATH.name,
    }


async def classify_text(
    text: str,
    analysis_type: Literal["message", "link", "image"],
    request: Request,
) -> PredictionResponse:
    """Executa a classificação comum depois da validação ou extração do conteúdo."""
    classifier: BertimbauClassifier = request.app.state.classifier
    prediction = await asyncio.to_thread(classifier.predict, text)
    model_probability = float(prediction["smishing_probability"])
    probability, heuristic_probability = combined_risk_probability(
        model_probability,
        text,
        analysis_type,
    )
    level = risk_level(probability, LOW_THRESHOLD, HIGH_THRESHOLD)
    label = "smishing" if probability >= 0.5 else "legitima"

    return PredictionResponse(
        level=level,
        riskScore=round(probability * 100),
        label=label,
        confidence=round(max(probability, 1 - probability), 6),
        fraudProbability=round(probability, 6),
        modelFraudProbability=round(model_probability, 6),
        heuristicScore=round(heuristic_probability, 6),
        analysisMode="hybrid",
        probabilities={
            "legitima": round(1 - probability, 6),
            "smishing": round(probability, 6),
        },
        warnings=warning_signals(text, level, analysis_type),
        advice=recommended_action(level, analysis_type),
        modelVersion=MODEL_PATH.name,
        analysisType=analysis_type,
        analyzedText=text,
    )


@app.post("/v1/predict", response_model=PredictionResponse)
async def predict(
    payload: PredictionRequest,
    request: Request,
    _user: dict[str, object] | None = Depends(require_firebase_user),
) -> PredictionResponse:
    """Classifica fora da thread assíncrona e monta a análise híbrida explicável."""
    if payload.analysisType == "message" and len(payload.text) > 1500:
        raise HTTPException(status_code=422, detail="A mensagem deve possuir até 1.500 caracteres.")

    try:
        text = normalize_url(payload.text) if payload.analysisType == "link" else payload.text
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error

    return await classify_text(text, payload.analysisType, request)


def decode_image_data(image_data: str) -> bytes:
    """Valida formato e tamanho antes de entregar bytes não confiáveis ao OCR."""
    header, separator, encoded = image_data.partition(",")
    if not separator or header.lower() not in {
        "data:image/jpeg;base64",
        "data:image/jpg;base64",
        "data:image/png;base64",
        "data:image/webp;base64",
    }:
        raise HTTPException(status_code=422, detail="Formato de imagem não suportado.")

    try:
        image_bytes = base64.b64decode(encoded, validate=True)
    except (binascii.Error, ValueError) as error:
        raise HTTPException(status_code=422, detail="Os dados da imagem são inválidos.") from error

    if not image_bytes or len(image_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="A imagem ultrapassa o limite permitido.")
    return image_bytes


@app.post("/v1/predict/image", response_model=PredictionResponse)
async def predict_image(
    payload: ImagePredictionRequest,
    request: Request,
    _user: dict[str, object] | None = Depends(require_firebase_user),
) -> PredictionResponse:
    """Extrai o texto do print localmente e o envia ao mesmo classificador de mensagens."""
    image_bytes = decode_image_data(payload.imageData)
    extractor: ImageTextExtractor = request.app.state.ocr

    try:
        extracted_text = await asyncio.to_thread(extractor.extract, image_bytes)
    except Exception as error:
        raise HTTPException(status_code=422, detail="Não foi possível ler esta imagem.") from error

    if len(extracted_text.strip()) < 3:
        raise HTTPException(
            status_code=422,
            detail="Nenhum texto legível foi encontrado na imagem.",
        )

    return await classify_text(extracted_text[:1500], "image", request)
