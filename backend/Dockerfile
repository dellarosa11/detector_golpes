FROM python:3.12-slim

# Configuração segura e previsível para execução em contêiner/Cloud Run.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    TRANSFORMERS_OFFLINE=1 \
    MODEL_PATH=/app/model \
    REQUIRE_FIREBASE_AUTH=true \
    PORT=8080

WORKDIR /app

# Instala as bibliotecas antes de copiar o código para aproveitar o cache de build.
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# O modelo é empacotado junto da API, então o servidor não depende da internet ao iniciar.
COPY backend/app ./app
COPY models/bertimbau-smishing-real ./model

# Cloud Run fornece PORT; localmente o valor padrão é 8080.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
