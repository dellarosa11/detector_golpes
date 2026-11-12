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

from .auth import verificar_usuario_firebase
from .classifier import ClassificadorBertimbau
from .ocr import LeitorTextoImagem
from .risk import (
    combinar_pontuacoes,
    normalizar_url,
    orientar_acao,
    determinar_nivel_risco,
    listar_sinais_de_alerta,
)


# Caminho para o modelo fine-tunado. Sobrescreva MODEL_PATH via variável de ambiente
# para apontar para outra versão sem alterar o código.
# O modelo fica em models/bertimbau-smishing-v2/ na raiz do repositório.
PROJECT_ROOT = Path(__file__).resolve().parents[2]
CAMINHO_MODELO = Path(os.getenv("MODEL_PATH", str(PROJECT_ROOT / "models" / "bertimbau-smishing-v2")))
LIMITE_BAIXO = float(os.getenv("LOW_RISK_THRESHOLD", "0.35"))
LIMITE_ALTO = float(os.getenv("HIGH_RISK_THRESHOLD", "0.70"))
LIMITE_BYTES_IMAGEM = int(os.getenv("MAX_IMAGE_BYTES", str(4 * 1024 * 1024)))

if not 0 < LIMITE_BAIXO < LIMITE_ALTO < 1:
    raise ValueError("Os limites de risco devem obedecer 0 < baixo < alto < 1.")


class PredictionRequest(BaseModel):
    """Entrada textual usada para mensagens ou endereços web."""
    text: str = Field(min_length=1, max_length=2048)
    analysisType: Literal["message", "link"] = "message"

    @field_validator("text")
    @classmethod
    def normalizar_texto(cls, value: str) -> str:
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
    # Carrega o modelo e o OCR uma única vez na inicialização.
    # O lifespan garante que ambos ficam disponíveis durante toda a vida da API
    # e são liberados da memória ao desligar.
    app.state.classifier = ClassificadorBertimbau(CAMINHO_MODELO)
    app.state.ocr = LeitorTextoImagem()
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
        "modelVersion": CAMINHO_MODELO.name,
    }


async def classificar_texto(
    text: str,
    tipo_analise: Literal["message", "link", "image"],
    request: Request,
) -> PredictionResponse:
    """Executa a classificação comum depois da validação ou extração do conteúdo."""
    classifier: ClassificadorBertimbau = request.app.state.classifier
    prediction = await asyncio.to_thread(classifier.predict, text)
    probabilidade_modelo = float(prediction["smishing_probability"])
    probability, pontuacao_heuristica = combinar_pontuacoes(
        probabilidade_modelo,
        text,
        tipo_analise,
    )
    level = determinar_nivel_risco(probability, LIMITE_BAIXO, LIMITE_ALTO)
    label = "smishing" if probability >= 0.5 else "legitima"

    return PredictionResponse(
        level=level,
        riskScore=round(probability * 100),
        label=label,
        confidence=round(max(probability, 1 - probability), 6),
        fraudProbability=round(probability, 6),
        modelFraudProbability=round(probabilidade_modelo, 6),
        heuristicScore=round(pontuacao_heuristica, 6),
        analysisMode="hybrid",
        probabilities={
            "legitima": round(1 - probability, 6),
            "smishing": round(probability, 6),
        },
        warnings=listar_sinais_de_alerta(text, level, tipo_analise),
        advice=orientar_acao(level, tipo_analise),
        modelVersion=CAMINHO_MODELO.name,
        analysisType=tipo_analise,
        analyzedText=text,
    )


@app.post("/v1/predict", response_model=PredictionResponse)
async def predict(
    payload: PredictionRequest,
    request: Request,
    _user: dict[str, object] | None = Depends(verificar_usuario_firebase),
) -> PredictionResponse:
    """Classifica fora da thread assíncrona e monta a análise híbrida explicável."""
    if payload.analysisType == "message" and len(payload.text) > 1500:
        raise HTTPException(status_code=422, detail="A mensagem deve possuir até 1.500 caracteres.")

    try:
        text = normalizar_url(payload.text) if payload.analysisType == "link" else payload.text
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error

    return await classificar_texto(text, payload.analysisType, request)


def decodificar_imagem(image_data: str) -> bytes:
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
        bytes_imagem = base64.b64decode(encoded, validate=True)
    except (binascii.Error, ValueError) as error:
        raise HTTPException(status_code=422, detail="Os dados da imagem são inválidos.") from error

    if not bytes_imagem or len(bytes_imagem) > LIMITE_BYTES_IMAGEM:
        raise HTTPException(status_code=413, detail="A imagem ultrapassa o limite permitido.")
    return bytes_imagem


@app.post("/v1/predict/image", response_model=PredictionResponse)
async def predict_image(
    payload: ImagePredictionRequest,
    request: Request,
    _user: dict[str, object] | None = Depends(verificar_usuario_firebase),
) -> PredictionResponse:
    """Extrai o texto do print localmente e o envia ao mesmo classificador de mensagens."""
    bytes_imagem = decodificar_imagem(payload.imageData)
    extractor: LeitorTextoImagem = request.app.state.ocr

    try:
        texto_extraido = await asyncio.to_thread(extractor.extract, bytes_imagem)
    except Exception as error:
        raise HTTPException(status_code=422, detail="Não foi possível ler esta imagem.") from error

    if len(texto_extraido.strip()) < 3:
        raise HTTPException(
            status_code=422,
            detail="Nenhum texto legível foi encontrado na imagem.",
        )

    return await classificar_texto(texto_extraido[:1500], "image", request)
