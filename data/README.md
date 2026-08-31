# Base sintética de mensagens de risco

Esta pasta contém uma base inicial para ajustar o BERTimbau à classificação de mensagens em português brasileiro.

## Arquivos

- `mensagens_risco.csv`: conjunto completo com 2.400 mensagens.
- `treino.csv`: 1.680 mensagens usadas no treinamento.
- `validacao.csv`: 360 mensagens usadas para escolher configurações e acompanhar o treinamento.
- `teste.csv`: 360 mensagens reservadas para a avaliação final.
- `estatisticas.json`: contagens por rótulo, divisão e categoria.

Cada CSV contém as colunas:

- `id`: identificador interno da mensagem.
- `texto`: entrada que será enviada ao modelo.
- `nivel`: rótulo esperado (`baixo`, `medio` ou `alto`).
- `categoria`: tipo de situação usado para auditar a diversidade.
- `origem`: informa que o exemplo é sintético.
- `split`: divisão fixa (`treino`, `validacao` ou `teste`).

## Critérios de rotulagem

- **Baixo:** conversa comum ou comunicação claramente informativa, sem solicitação suspeita de dinheiro, credenciais ou códigos.
- **Médio:** presença de sinais suspeitos, como contato inesperado, link não solicitado, oferta improvável ou falta de contexto, mas sem evidência suficiente para afirmar uma tentativa direta de fraude.
- **Alto:** tentativa explícita de obter dinheiro, senha, código de verificação, acesso remoto ou dados financeiros; inclui também ameaça, falsa urgência e promessa de retorno garantido.

## Limitações importantes

Esta é uma base **sintética para prototipagem e trabalho acadêmico**. Ela não comprova que o aplicativo detecta golpes reais com segurança. As métricas podem ficar artificialmente altas porque mensagens geradas por padrões semelhantes compartilham vocabulário.

Antes de uso real, a base deve ser ampliada com mensagens anonimizadas e revisadas por pessoas, incluindo novos tipos de golpe, variações regionais, erros de digitação e exemplos legítimos difíceis. Nunca inclua nomes completos, telefones, documentos, chaves Pix, senhas ou links pessoais sem autorização e anonimização.

O modelo de texto também não verifica se um endereço é realmente malicioso. Links devem passar por uma verificação separada de domínio e reputação.

## Reprodução

Para gerar novamente os arquivos com a mesma semente:

```bash
node scripts/generate-risk-dataset.mjs
```
