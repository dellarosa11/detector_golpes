# API do Detector de Golpes (BERTimbau)

API FastAPI que carrega o BERTimbau para mensagens, analisa a estrutura de links e usa OCR local para transformar prints em texto antes da classificação.

## Endpoints

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/health` | Verifica se a API, o modelo e o OCR estão prontos |
| `POST` | `/v1/predict` | Classifica uma mensagem ou um link |
| `POST` | `/v1/predict/image` | Extrai o texto de uma imagem e classifica o conteúdo |

## Desenvolvimento local

### Pré-requisitos

- Python 3.12+
- Modelo extraído em `models/bertimbau-smishing-v2/` (na raiz do projeto)

### Setup

```bash
# Na pasta backend/
python -m venv .venv

# Ativar o ambiente virtual (Windows PowerShell)
.\.venv\Scripts\Activate.ps1

# Instalar dependências
pip install -r requirements.txt
```

### Rodando

Da **raiz do projeto** (não da pasta backend):

```bash
# Via npm script
npm run api

# Ou manualmente (com venv ativado)
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --env-file backend/.env.local
```

> O `--host 0.0.0.0` é necessário para que o celular na mesma rede Wi-Fi consiga acessar a API.

### Configuração (`backend/.env.local`)

```env
MODEL_PATH=models/bertimbau-smishing-v2
LOW_RISK_THRESHOLD=0.35
HIGH_RISK_THRESHOLD=0.70
MAX_IMAGE_BYTES=4194304
REQUIRE_FIREBASE_AUTH=false
```

O `REQUIRE_FIREBASE_AUTH=false` **desativa** a verificação de token Firebase durante o desenvolvimento. Em produção, mantenha como `true`.

### Testando

```bash
# Health check
curl http://localhost:8000/health

# Classificação de mensagem
curl -X POST http://localhost:8000/v1/predict \
  -H "Content-Type: application/json" \
  -d "{\"text\": \"Me informe o código recebido por SMS para cancelar a compra.\", \"analysisType\": \"message\"}"

# Análise estrutural de link (o endereço não é aberto pela API)
curl -X POST http://localhost:8000/v1/predict \
  -H "Content-Type: application/json" \
  -d "{\"text\": \"http://login-seguranca@192.168.0.8/verificar\", \"analysisType\": \"link\"}"
```

## Estrutura

```
backend/
├── app/
│   ├── __init__.py       # Inicialização do pacote
│   ├── main.py           # Aplicação FastAPI (rotas, lifespan, modelos Pydantic)
│   ├── classifier.py     # Carregamento e inferência do BERTimbau
│   ├── ocr.py            # Extração local de texto das imagens
│   ├── auth.py           # Autenticação Firebase (opcional em dev)
│   └── risk.py           # Heurísticas e cálculo de risco combinado
├── tests/                # Testes automatizados
├── requirements.txt      # Dependências Python
├── Dockerfile            # Imagem para deploy em contêiner
├── .env.local            # Variáveis de ambiente locais (não versionado)
└── .env.example          # Template de variáveis de ambiente
```

## Docker (opcional)

Para rodar via contêiner:

```bash
# Da raiz do projeto
docker build -f backend/Dockerfile -t detector-golpes-api .
docker run -p 8000:10000 -e REQUIRE_FIREBASE_AUTH=false detector-golpes-api
```
