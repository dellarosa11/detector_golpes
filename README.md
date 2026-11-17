# Detector de Golpes

Aplicativo mobile (Expo/React Native) que analisa mensagens para identificar possíveis golpes usando BERTimbau e regras explicáveis.

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

| Ferramenta | Versão mínima / recomendada |
|---|---|
| [Node.js](https://nodejs.org/) | 18+ (testado nas versões 20 e 24) |
| [Python](https://www.python.org/) | 3.12 (recomendado para compatibilidade com PyTorch) |
| [Expo CLI](https://docs.expo.dev/get-started/installation/) | via `npx expo` |
| [Git](https://git-scm.com/) | qualquer |

## Instalação

### 1. Clone o repositório

```bash
git clone https://github.com/dellarosa11/detector_golpes.git
cd detector_golpes
```

### 2. Configure as variáveis de ambiente

Copie os arquivos de exemplo para criar suas configurações locais:

```bash
# Na raiz do projeto
cp .env.example .env.local
cp backend/.env.example backend/.env.local
```

Edite o `.env.local` da raiz com as credenciais do seu projeto Firebase e o endereço da API:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=sua_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=seu-projeto
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=seu-projeto.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=000000000000
EXPO_PUBLIC_FIREBASE_APP_ID=1:000000000000:web:xxxxxxxxxxxxxxxxxxxxxx

# Endereço da API do classificador:
# - Para testes no navegador web (npm run web): http://localhost:8000
# - Para testes no celular físico na mesma rede Wi-Fi: http://<IP_DO_COMPUTADOR>:8000
EXPO_PUBLIC_CLASSIFIER_API_URL=http://localhost:8000
```

> **Dica Firebase:** O projeto possui um script para testar e validar suas credenciais de autenticação e conexão com o Firestore:
> ```bash
> npm run test:firebase
> ```
> Consulte também o arquivo [FIREBASE_SETUP.md](FIREBASE_SETUP.md) para o passo a passo de ativação no console do Firebase.

### 3. Instale as dependências do app

```bash
npm install
```

### 4. Configure a API Python

```bash
cd backend
python -m venv .venv
```

**Windows (PowerShell):**
```powershell
cd backend
py -3.12 -m venv .venv
# ou: python -m venv .venv (se o python padrão for 3.12)
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
cd ..
```

**Windows (CMD):**
```cmd
.\.venv\Scripts\activate.bat
```

**Linux/macOS:**
```bash
cd backend
python3.12 -m venv .venv
# ou: python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ..
```

### 5. Modelo BERTimbau

O modelo neural pré-treinado (~436 MB) **não está incluído no repositório**. Quando disponível, coloque os arquivos na pasta `models/bertimbau-smishing-v2/` na raiz do projeto:

```
models/
└── bertimbau-smishing-v2/
    ├── config.json
    ├── model.safetensors
    ├── tokenizer.json
    └── tokenizer_config.json
```

> **Modo de desenvolvimento (Fallback):** Caso a pasta do modelo não contenha os pesos treinados, a API inicializa automaticamente em modo heurístico/regras explicáveis para desenvolvimento e testes, permitindo testar o fluxo de autenticação e classificação no app sem bloqueios.
>
> Se o modelo estiver disponível no Hugging Face Hub (privado ou público), você pode baixá-lo via script Python ou CLI com seu Read Token:
> ```bash
> pip install huggingface_hub
> huggingface-cli login
> huggingface-cli download dellarosa11/bertimbau-smishing-v2 --local-dir models/bertimbau-smishing-v2
> ```
> O comando de login pede um token com acesso de leitura; não o inclua em arquivos do projeto.

---

## Rodando o projeto

Você precisa de **dois terminais** abertos simultaneamente: um para a API e outro para o app Expo.

### Terminal 1 — API (FastAPI + Uvicorn)

Na raiz do projeto, execute o script gerenciador que detecta o ambiente virtual automaticamente:

```bash
npm run api
```

Ou manualmente (a partir da raiz):

```bash
# Windows
.\backend\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --env-file backend/.env.local

# Linux/macOS
./backend/.venv/bin/python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --env-file backend/.env.local
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
  "ocrReady": true,
  "modelVersion": "bertimbau-smishing-v2"
}
```

### Terminal 2 — App Expo

Para testar no navegador (Web):
```bash
npm run web
```

Ou para iniciar o servidor Expo geral (Celular / Emuladores):
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

```text
detector_golpes/
├── app/                         # Rotas e layouts do Expo Router
├── assets/images/               # Imagens e ícones do aplicativo
├── src/
│   ├── Aplicativo.tsx           # Navegação interna e conexão entre telas e hooks
│   ├── componentes/             # Controles reutilizáveis e navegação inferior
│   ├── estilos/                 # Paleta, temas e estilos das telas
│   ├── hooks/                   # Estado da sessão, da análise e do tema
│   ├── servicos/
│   │   ├── classificador.ts     # Requisição HTTP e resposta da API
│   │   └── firebase/            # Configuração, persistência, conta e histórico
│   ├── telas/                   # Interface de cada etapa do aplicativo
│   ├── tipos/                   # Tipos da navegação interna
│   └── utilitarios/             # Formatação e validação
├── backend/                     # FastAPI, inferência BERTimbau, OCR e testes
└── training/                    # Treinamento e avaliação do modelo
```

### Caminho de uma análise

1. `app/(tabs)/index.tsx` monta `src/Aplicativo.tsx`. O aplicativo usa `useAutenticacao` para observar a sessão do Firebase e selecionar a tela.
2. `TelaAnalise` passa o texto digitado a `alterarMensagem`. Ao tocar em Analisar risco, `iniciarAnalise` consulta a última resposta em memória do usuário, válida por 15 minutos.
3. Quando não há resultado válido, `classificarMensagem` envia o texto e o token do Firebase para `POST /v1/predict`. O backend executa o BERTimbau e combina a saída do modelo com as regras de risco.
4. `TelaResultado` mostra a resposta. Ao salvar, o serviço de histórico grava no Firestore. `TelaHistorico` lê a cópia local e acompanha as atualizações do Firestore.
5. `TelaAprender` abre os guias externos pelo Expo Router.

<details>
<summary>Mapa dos arquivos movidos ou renomeados</summary>

| Caminho anterior | Caminho atual |
| --- | --- |
| `components/detector-app.tsx` | `src/Aplicativo.tsx` |
| `components/detector-app.styles.ts` | `src/estilos/aplicativo.ts` |
| `lib/firebase-auth-persistence.native.ts` | `src/servicos/firebase/persistencia.native.ts` |
| `lib/firebase-auth-persistence.ts` | `src/servicos/firebase/persistencia.ts` |
| `lib/firebase-auth-persistence.web.ts` | `src/servicos/firebase/persistencia.web.ts` |
| `lib/firebase.ts` | `src/servicos/firebase/configuracao.ts` |
| `src/components/AppScreen.tsx` | `src/componentes/TelaBase.tsx` |
| `lib/risk-classifier.ts` | `src/servicos/classificador.ts` |
| `src/components/AuthButton.tsx` | `src/componentes/BotaoAutenticacao.tsx` |
| `src/components/AuthFeedback.tsx` | `src/componentes/AvisoAutenticacao.tsx` |
| `src/components/BackHeader.tsx` | `src/componentes/CabecalhoVoltar.tsx` |
| `src/components/Entrance.tsx` | `src/componentes/EntradaAnimada.tsx` |
| `src/components/BrandHeader.tsx` | `src/componentes/CabecalhoMarca.tsx` |
| `src/components/index.ts` | `src/componentes/index.ts` |
| `src/components/MotionPressable.tsx` | `src/componentes/BotaoAnimado.tsx` |
| `src/components/FormField.tsx` | `src/componentes/CampoFormulario.tsx` |
| `src/components/PasswordStrength.tsx` | `src/componentes/ForcaSenha.tsx` |
| `src/components/PhoneFrame.tsx` | `src/componentes/MolduraTela.tsx` |
| `src/hooks/useTheme.ts` | `src/hooks/useTema.ts` |
| `src/components/RiskProgress.tsx` | `src/componentes/BarraRisco.tsx` |
| `src/screens/AccountScreen.tsx` | `src/telas/TelaConta.tsx` |
| `src/hooks/useAnalysis.ts` | `src/hooks/useAnalise.ts` |
| `src/hooks/useAuth.ts` | `src/hooks/useAutenticacao.ts` |
| `src/screens/AnalyzeScreen.tsx` | `src/telas/TelaAnalise.tsx` |
| `src/screens/HistoryScreen.tsx` | `src/telas/TelaHistorico.tsx` |
| `src/screens/historyHelpers.ts` | `src/telas/apresentacaoHistorico.ts` |
| `src/screens/index.ts` | `src/telas/index.ts` |
| `src/screens/HomeScreen.tsx` | `src/telas/TelaInicio.tsx` |
| `src/screens/ProcessingScreen.tsx` | `src/telas/TelaProcessamento.tsx` |
| `src/screens/ResultScreen.tsx` | `src/telas/TelaResultado.tsx` |
| `src/utils/formatters.ts` | `src/utilitarios/formatacao.ts` |
| `src/screens/SignupScreen.tsx` | `src/telas/TelaCadastro.tsx` |
| `src/utils/validators.ts` | `src/utilitarios/validacao.ts` |
| `src/screens/HistoryDetailScreen.tsx` | `src/telas/TelaDetalhesHistorico.tsx` |
| `src/types/navigation.ts` | `src/tipos/navegacao.ts` |
| `src/screens/LoginScreen.tsx` | `src/telas/TelaEntrada.tsx` |
| `src/screens/LearnScreen.tsx` | `src/telas/TelaAprender.tsx` |
| `lib/firebase-data.ts` | `src/servicos/firebase/conta.ts` |

O histórico antes concentrado em `lib/firebase-data.ts` agora está em `src/servicos/firebase/historico.ts`.

</details>

---

## Variáveis de ambiente

### App Expo (`.env.local` na raiz)

| Variável  | Descrição |
|-----------|-----------|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Chave da API do Firebase |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | Domínio de autenticação |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | ID do projeto Firebase |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | Bucket do Storage |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Sender ID do Cloud Messaging |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | App ID do Firebase |
| `EXPO_PUBLIC_CLASSIFIER_API_URL` | URL da API de classificação (IP local) |

### API Python (`backend/.env.local`)

| Variável  |  Padrão   | Descrição |
|-----------|-----------|-----------|
| `MODEL_PATH` | `models/bertimbau-smishing-v2` | Caminho para a pasta do modelo |
| `LOW_RISK_THRESHOLD` | `0.35` | Limite inferior de risco |
| `HIGH_RISK_THRESHOLD` | `0.70` | Limite superior de risco |
| `REQUIRE_FIREBASE_AUTH` | `false` | Exigir token Firebase nas requisições |
