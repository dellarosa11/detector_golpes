# Treinamento no Google Colab

O arquivo `treinar_bertimbau_colab.py` contém o fluxo completo em blocos marcados
com `# %%`. Ele evita a biblioteca `datasets`, portanto não depende do `pyarrow`.

## Executar o arquivo inteiro

1. No Colab, selecione uma GPU em **Ambiente de execução > Alterar tipo de ambiente**.
2. Envie `treinar_bertimbau_colab.py` para os arquivos da sessão.
3. Execute em uma célula:

```python
%run /content/treinar_bertimbau_colab.py
```

O script baixa MOZ-Smishing e ScamBench automaticamente. Se existir o arquivo
`/content/exemplos_brasileiros_revisados.csv`, ele também será incluído. Esse CSV
opcional deve possuir este formato:

```csv
texto,rotulo
"Oi, vamos almoçar amanhã?",legitima
"Faça um Pix agora para liberar o prêmio",smishing
```

Ao terminar, o Colab baixa `bertimbau-smishing-v2.zip`. Não substitua o modelo da
API antes de conferir a matriz de confusão e os testes manuais exibidos no notebook.
