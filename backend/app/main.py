"""Aplicação FastAPI que disponibiliza o BERTimbau para o aplicativo mobile."""

import asyncio
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, Request
from pydantic import BaseModel, Field, field_validator

from .auth import require_firebase_user
from .classifier import BertimbauClassifier
from .risk import combined_risk_probability, recommended_action, risk_level, warning_signals


# Configurações podem ser substituídas por variáveis de ambiente ao publicar o contêiner.
PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_MODEL_PATH = PROJECT_ROOT / "models" / "bertimbau-smishing-real"
MODEL_PATH = Path(os.getenv("MODEL_PATH", str(DEFAULT_MODEL_PATH))).resolve()
LOW_THRESHOLD = float(os.getenv("LOW_RISK_THRESHOLD", "0.35"))
HIGH_THRESHOLD = float(os.getenv("HIGH_RISK_THRESHOLD", "0.70"))

if not 0 < LOW_THRESHOLD < HIGH_THRESHOLD < 1:
    raise ValueError("Os limites de risco devem obedecer 0 < baixo < alto < 1.")


class PredictionRequest(BaseModel):
    """Entrada aceita pela API; limita texto excessivo antes da tokenização."""
    text: str = Field(min_length=1, max_length=1500)

    @field_validator("text")
    @classmethod
    def clean_text(cls, value: str) -> str:
        cleaned = " ".join(value.split())
        if not cleaned:
            raise ValueError("A mensagem não pode ficar vazia.")
        return cleaned


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


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Carrega centenas de megabytes uma única vez, antes de aceitar requisições.
    app.state.classifier = BertimbauClassifier(MODEL_PATH)
    yield


app = FastAPI(
    title="Detector de Golpes — API de Classificação",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/health")
def health(request: Request) -> dict[str, str | bool]:
    """Permite verificar se a API iniciou e se o modelo está disponível."""
    classifier = getattr(request.app.state, "classifier", None)
    return {
        "status": "ok" if classifier else "starting",
        "modelReady": bool(classifier),
        "modelVersion": MODEL_PATH.name,
    }


@app.post("/v1/predict", response_model=PredictionResponse)
async def predict(
    payload: PredictionRequest,
    request: Request,
    _user: dict[str, object] | None = Depends(require_firebase_user),
) -> PredictionResponse:
    """Classifica fora da thread assíncrona e monta a análise híbrida explicável."""
    classifier: BertimbauClassifier = request.app.state.classifier
    # PyTorch é síncrono; to_thread evita bloquear outras rotas do servidor.
    prediction = await asyncio.to_thread(classifier.predict, payload.text)
    model_probability = float(prediction["smishing_probability"])
    probability, heuristic_probability = combined_risk_probability(model_probability, payload.text)
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
        warnings=warning_signals(payload.text, level),
        advice=recommended_action(level),
        modelVersion=MODEL_PATH.name,
    )
