# Detector de Golpes

Aplicativo mobile (Expo/React Native) que analisa mensagens, links e prints para identificar possíveis golpes usando BERTimbau, regras explicáveis e OCR local.

## Arquitetura

```
┌─────────────────────┐         ┌──────────────────────────┐
│   App Mobile (Expo) │  HTTP   │   API Python (FastAPI)   │
│   React Native      │────────▶│   BERTimbau + Heurísticas│
│   Firebase Auth     │◀────────│   Uvicorn                │
└─────────────────────┘         └──────────────────────────┘
         │                                  │
         ▼                                  ▼
   Firebase Auth                 Modelo local (.safetensors)
   Firestore
```

## Pré-requisitos

| Ferramenta | Versão mínima |
|---|---|
| [Node.js](https://nodejs.org/) | 18+ |
| [Python](https://www.python.org/) | 3.12+ |
| [Expo CLI](https://docs.expo.dev/get-started/installation/) | via `npx expo` |
| [Git](https://git-scm.com/) | qualquer |

## Instalação

### 1. Clone o repositório

```bash
git clone https://github.com/dellarosa11/detector_golpes.git
cd detector_golpes
```

### 2. Configure as variáveis de ambiente

Copie os exemplos e preencha com suas credenciais Firebase:

```bash
cp .env.example .env.local
cp backend/.env.example backend/.env.local
```

Edite o `.env.local` da raiz com as credenciais do seu projeto Firebase:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=sua_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=seu-projeto
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=seu-projeto.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=000000000000
EXPO_PUBLIC_FIREBASE_APP_ID=1:000000000000:web:xxxxxxxxxxxxxxxxxxxxxx
EXPO_PUBLIC_CLASSIFIER_API_URL=http://<IP_DA_SUA_MAQUINA>:8000
```

> **Importante:** Em `EXPO_PUBLIC_CLASSIFIER_API_URL`, use o **IP local da sua máquina na rede Wi-Fi** (ex: `http://192.168.100.46:8000`), não `localhost`, para que o celular consiga acessar a API.

### 3. Instale as dependências do app

```bash
npm install
```

### 4. Configure a API Python

```bash
cd backend
python -m venv .venv
```

Ative o ambiente virtual:

**Windows (PowerShell):**
```powershell
.\.venv\Scripts\Activate.ps1
```

**Windows (CMD):**
```cmd
.\.venv\Scripts\activate.bat
```

**Linux/macOS:**
```bash
source .venv/bin/activate
```

Instale as dependências Python:

```bash
pip install -r requirements.txt
```

### 5. Modelo BERTimbau

O modelo treinado (~436 MB) **não está incluído no repositório**. Coloque os arquivos do modelo na pasta `models/bertimbau-smishing-v2/` na raiz do projeto:

```
models/
└── bertimbau-smishing-v2/
    ├── config.json
    ├── model.safetensors
    ├── tokenizer.json
    └── tokenizer_config.json
```

> Se o modelo estiver disponível no Hugging Face Hub, baixe com:
> ```bash
> pip install huggingface_hub
> hf download dellarosa11/bertimbau-smishing-v2 --local-dir models/bertimbau-smishing-v2
> ```

---

## Rodando o projeto

Você precisa de **dois terminais** abertos simultaneamente: um para a API e outro para o app Expo.

### Terminal 1 — API (FastAPI + Uvicorn)

Na raiz do projeto:

```bash
npm run api
```

Ou manualmente (com o venv ativado):

```bash
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --env-file backend/.env.local
```

A API estará disponível em `http://localhost:8000`. Verifique com:

```bash
curl http://localhost:8000/health
```

Resposta esperada:
```json
{
  "status": "ok",
  "modelReady": true,
  "modelVersion": "bertimbau-smishing-v2"
}
```

### Terminal 2 — App Expo

```bash
npx expo start
```

Escaneie o QR code com o **Expo Go** no celular, ou pressione:
- `a` para abrir no emulador Android
- `w` para abrir no navegador

> **Dica:** O celular e o computador precisam estar na **mesma rede Wi-Fi** para a API funcionar.

---

## Endpoints da API

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/health` | Verifica se a API, o modelo e o OCR estão prontos |
| `POST` | `/v1/predict` | Classifica uma mensagem ou analisa a estrutura de um link |
| `POST` | `/v1/predict/image` | Extrai texto de um print e classifica o conteúdo |

### Exemplo de requisição

```bash
curl -X POST http://localhost:8000/v1/predict \
  -H "Content-Type: application/json" \
  -d '{"text": "Me informe o código recebido por SMS para cancelar a compra."}'
```

### Exemplo de resposta

```json
{
  "level": "alto",
  "riskScore": 87,
  "label": "smishing",
  "confidence": 0.872345,
  "fraudProbability": 0.872345,
  "modelFraudProbability": 0.851234,
  "heuristicScore": 0.45,
  "analysisMode": "hybrid",
  "probabilities": {
    "legitima": 0.127655,
    "smishing": 0.872345
  },
  "warnings": ["Pede código recebido por SMS"],
  "advice": "Não responda e bloqueie o remetente."
}
```

---

## Estrutura do projeto

```
detector_golpes/
├── app/                  # Telas do app (Expo Router, file-based routing)
├── assets/               # Imagens, ícones e fontes
├── backend/
│   ├── app/
│   │   ├── main.py       # Aplicação FastAPI (rotas e lifespan)
│   │   ├── ocr.py        # OCR local para leitura de prints
│   │   ├── classifier.py # Carregamento e inferência do BERTimbau
│   │   ├── auth.py       # Autenticação Firebase (opcional em dev)
│   │   └── risk.py       # Heurísticas e cálculo de risco combinado
│   ├── requirements.txt  # Dependências Python
│   └── Dockerfile        # Imagem para deploy em contêiner
├── components/           # Componentes React Native reutilizáveis
├── constants/            # Cores, temas e constantes do app
├── hooks/                # Custom hooks React
├── lib/                  # Utilitários (Firebase config, API client)
├── models/               # Modelo BERTimbau (não versionado, .gitignore)
├── .env.example          # Template de variáveis do app Expo
├── backend/.env.example  # Template de variáveis da API
└── package.json          # Dependências Node e scripts
```

---

## Variáveis de ambiente

### App Expo (`.env.local` na raiz)

| Variável | Descrição |
|---|---|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Chave da API do Firebase |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | Domínio de autenticação |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | ID do projeto Firebase |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | Bucket do Storage |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Sender ID do Cloud Messaging |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | App ID do Firebase |
| `EXPO_PUBLIC_CLASSIFIER_API_URL` | URL da API de classificação (IP local) |

### API Python (`backend/.env.local`)

| Variável | Padrão | Descrição |
|---|---|---|
| `MODEL_PATH` | `models/bertimbau-smishing-v2` | Caminho para a pasta do modelo |
| `LOW_RISK_THRESHOLD` | `0.35` | Limite inferior de risco |
| `HIGH_RISK_THRESHOLD` | `0.70` | Limite superior de risco |
| `REQUIRE_FIREBASE_AUTH` | `false` | Exigir token Firebase nas requisições |
