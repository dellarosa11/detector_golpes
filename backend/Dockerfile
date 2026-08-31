FROM python:3.12-slim

# Configuração segura e previsível para execução em contêiner.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    MODEL_PATH=/app/model \
    REQUIRE_FIREBASE_AUTH=true \
    PORT=10000

WORKDIR /app

# Instala as bibliotecas antes de copiar o código para aproveitar o cache de build.
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt huggingface_hub[cli]

# Baixa o modelo do Hugging Face Hub durante o build (evita incluir ~436MB no git).
ARG HF_MODEL_REPO=dellarosa11/bertimbau-smishing-real
RUN huggingface-cli download ${HF_MODEL_REPO} --local-dir ./model

# A partir daqui o contêiner opera 100% offline.
ENV TRANSFORMERS_OFFLINE=1

COPY backend/app ./app

# Render fornece PORT=10000 por padrão; variável pode ser sobrescrita.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000}"]
