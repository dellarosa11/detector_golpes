# API do BERTimbau

A API carrega o modelo `bertimbau-smishing-real` e combina a previsão dele com sinais
explícitos de golpe (pedido de código, Pix urgente, link, acesso remoto e outros). Essa
proteção é importante enquanto o modelo baixado é revisado, pois o teste local mostrou
que ele está favorecendo excessivamente a classe `legitima`.

A API disponibiliza:

- `GET /health`: informa se o modelo terminou de carregar.
- `POST /v1/predict`: classifica uma mensagem de até 1.500 caracteres.

## Desenvolvimento local

O modelo deve estar extraído em `models/bertimbau-smishing-real`.

```powershell
npm run api
```

O arquivo local `backend/.env.local` desativa a verificação do token somente durante o
desenvolvimento. A versão publicada deve manter `REQUIRE_FIREBASE_AUTH=true`.

Exemplo de requisição:

```json
{
  "text": "Me informe o código recebido por SMS para cancelar a compra."
}
```

## Produção

O contêiner usa autenticação Firebase por padrão. O aplicativo envia o ID token no cabeçalho `Authorization`. Para construir a imagem a partir da raiz do projeto:

```powershell
docker build -f backend/Dockerfile -t detector-golpes-api .
```

No Cloud Run, mantenha `REQUIRE_FIREBASE_AUTH=true`, limite a concorrência por instância e configure memória suficiente para o modelo BERT em CPU.
