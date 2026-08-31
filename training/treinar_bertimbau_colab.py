# %% [markdown]
# # Treinamento BERTimbau — detector de smishing
#
# Este roteiro foi preparado para o Google Colab. Ele combina:
#
# - MOZ-Smishing (mensagens reais em português);
# - a parte em português do ScamBench;
# - um CSV brasileiro revisado, caso ele seja enviado ao Colab.
#
# O treinamento recomeça do BERTimbau oficial porque o modelo anterior ficou
# concentrado na classe `legitima`. A biblioteca `datasets` não é usada, evitando
# o erro de incompatibilidade do `pyarrow` que ocorreu anteriormente.

# %%
# Execute esta célula primeiro. A forma abaixo também permite enviar este arquivo
# inteiro ao Colab e executá-lo com `%run /content/treinar_bertimbau_colab.py`.
import subprocess
import sys

subprocess.check_call(
    [
        sys.executable,
        "-m",
        "pip",
        "install",
        "-q",
        "-U",
        "transformers==5.16.1",
        "accelerate>=1.10,<2",
        "pandas>=2.2",
        "polars>=1.30",
        "scikit-learn>=1.5",
        "matplotlib>=3.9",
        "seaborn>=0.13",
        "requests>=2.32",
        "safetensors>=0.5",
    ]
)

# %%
import inspect
import json
import math
import random
import re
import shutil
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import polars as pl
import requests
import seaborn as sns
import torch
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    precision_recall_fscore_support,
)
from sklearn.model_selection import train_test_split
from torch.nn import CrossEntropyLoss
from torch.utils.data import Dataset
from transformers import (
    AutoModelForSequenceClassification,
    AutoTokenizer,
    DataCollatorWithPadding,
    EarlyStoppingCallback,
    Trainer,
    TrainingArguments,
    set_seed,
)

SEED = 42
set_seed(SEED)
random.seed(SEED)
np.random.seed(SEED)

print("PyTorch:", torch.__version__)
print("GPU disponível:", torch.cuda.is_available())
if torch.cuda.is_available():
    print("GPU:", torch.cuda.get_device_name(0))
else:
    print("Aviso: ative Ambiente de execução > Alterar tipo de ambiente > GPU T4.")

# %%
# Configurações principais. O arquivo brasileiro é opcional e deve possuir as
# colunas `texto` e `rotulo`, com `legitima` ou `smishing`.
PASTA_TRABALHO = Path("/content/treinamento-smishing")
PASTA_DADOS = PASTA_TRABALHO / "dados"
PASTA_CHECKPOINTS = PASTA_TRABALHO / "checkpoints"
PASTA_MODELO_FINAL = Path("/content/bertimbau-smishing-v2")
ARQUIVO_BRASILEIRO = Path("/content/exemplos_brasileiros_revisados.csv")

MODELO_BASE = "neuralmind/bert-base-portuguese-cased"
MAX_LENGTH = 160
NUM_EPOCHS = 4
LEARNING_RATE = 2e-5

PASTA_DADOS.mkdir(parents=True, exist_ok=True)
PASTA_CHECKPOINTS.mkdir(parents=True, exist_ok=True)

ID2LABEL = {0: "legitima", 1: "smishing"}
LABEL2ID = {"legitima": 0, "smishing": 1}

# %%
def baixar_arquivo(url: str, destino: Path) -> Path:
    """Baixa uma fonte somente quando ela ainda não está no ambiente do Colab."""
    if destino.exists() and destino.stat().st_size > 0:
        print("Já existe:", destino.name)
        return destino

    print("Baixando:", destino.name)
    with requests.get(url, stream=True, timeout=180) as resposta:
        resposta.raise_for_status()
        with destino.open("wb") as arquivo:
            for bloco in resposta.iter_content(chunk_size=1024 * 1024):
                if bloco:
                    arquivo.write(bloco)
    return destino


URL_MOZ = (
    "https://huggingface.co/datasets/MOZNLP/MOZ-Smishing/"
    "resolve/main/test.csv"
)
URLS_SCAMBENCH = {
    split: (
        "https://huggingface.co/datasets/shaw/scambench-training/resolve/main/"
        f"data/{split}/{split}-00000-of-00001.parquet"
    )
    for split in ("train", "validation", "test")
}

arquivo_moz = baixar_arquivo(URL_MOZ, PASTA_DADOS / "moz_smishing.csv")
arquivos_scambench = {
    split: baixar_arquivo(url, PASTA_DADOS / f"scambench_{split}.parquet")
    for split, url in URLS_SCAMBENCH.items()
}

print("Downloads concluídos.")

# %%
ROTULOS_ACEITOS = {
    "legitimate": 0,
    "legitima": 0,
    "legítima": 0,
    "ham": 0,
    "benigna": 0,
    "benigno": 0,
    "normal": 0,
    "smishing": 1,
    "fraud": 1,
    "fraude": 1,
    "golpe": 1,
    "phishing": 1,
}


def limpar_texto(valor: object) -> str:
    """Preserva acentos e links, removendo apenas espaços e quebras repetidas."""
    if valor is None:
        return ""
    return re.sub(r"\s+", " ", str(valor)).strip()


def texto_normalizado(valor: object) -> str:
    """Forma usada somente para procurar duplicatas e conflitos de rótulo."""
    texto = limpar_texto(valor).lower()
    texto = re.sub(r"https?://\S+", " URL ", texto)
    texto = re.sub(r"\d+", " NUM ", texto)
    texto = re.sub(r"[^a-záàâãéêíóôõúüç0-9 ]+", " ", texto)
    return re.sub(r"\s+", " ", texto).strip()


def converter_rotulo(valor: object) -> int:
    chave = limpar_texto(valor).lower()
    if chave not in ROTULOS_ACEITOS:
        raise ValueError(f"Rótulo desconhecido: {valor!r}")
    return ROTULOS_ACEITOS[chave]


def ultima_mensagem_usuario(messages_json: object) -> str:
    """Transforma uma conversa do ScamBench em uma única mensagem classificável."""
    try:
        mensagens = json.loads(str(messages_json))
    except (TypeError, json.JSONDecodeError):
        return ""

    mensagens_usuario = [
        limpar_texto(item.get("content"))
        for item in mensagens
        if isinstance(item, dict) and item.get("role") == "user"
    ]
    return mensagens_usuario[-1] if mensagens_usuario else ""


# O ScamBench também contém ataques contra agentes, como prompt injection.
# Mantemos somente categorias relacionadas a fraude, phishing e engenharia social.
TERMOS_DE_GOLPE = (
    "scam",
    "fraud",
    "phish",
    "social-engineer",
    "imperson",
    "credential",
    "advance-fee",
    "payment",
    "bank",
    "pix",
    "transfer",
    "money",
    "otp",
    "prize",
    "lottery",
    "romance",
    "delivery",
    "government",
    "urgency",
)


def ataque_relevante(linha: dict[str, object]) -> bool:
    if not bool(linha["should_trigger_scam_defense"]):
        return True
    descricao = " ".join(
        limpar_texto(linha.get(coluna)).lower()
        for coluna in ("scenario_category", "unsafe_signals", "diagnostic_labels")
    )
    return any(termo in descricao for termo in TERMOS_DE_GOLPE)

# %%
# 1) MOZ-Smishing
moz_original = pl.read_csv(arquivo_moz).to_pandas()
moz = pd.DataFrame(
    {
        "texto": moz_original["text"].map(limpar_texto),
        "label": moz_original["label"].map(converter_rotulo),
        "origem": "MOZ-Smishing",
    }
)

# 2) ScamBench em português
linhas_scambench: list[dict[str, object]] = []
for split, caminho in arquivos_scambench.items():
    dados_split = (
        pl.read_parquet(caminho)
        .filter(pl.col("language") == "pt")
        .select(
            "messages",
            "should_trigger_scam_defense",
            "scenario_category",
            "unsafe_signals",
            "diagnostic_labels",
        )
    )

    for linha in dados_split.iter_rows(named=True):
        if not ataque_relevante(linha):
            continue
        linhas_scambench.append(
            {
                "texto": ultima_mensagem_usuario(linha["messages"]),
                "label": int(bool(linha["should_trigger_scam_defense"])),
                "origem": "ScamBench-pt",
            }
        )

scambench = pd.DataFrame(linhas_scambench)

# 3) Exemplos brasileiros revisados — opcional
frames = [moz, scambench]
if ARQUIVO_BRASILEIRO.exists():
    brasileiro_original = pd.read_csv(ARQUIVO_BRASILEIRO)
    colunas_faltando = {"texto", "rotulo"} - set(brasileiro_original.columns)
    if colunas_faltando:
        raise ValueError(
            "O CSV brasileiro precisa das colunas texto e rotulo. Faltando: "
            + ", ".join(sorted(colunas_faltando))
        )
    brasileiro = pd.DataFrame(
        {
            "texto": brasileiro_original["texto"].map(limpar_texto),
            "label": brasileiro_original["rotulo"].map(converter_rotulo),
            "origem": "Brasil-revisado",
        }
    )
    frames.append(brasileiro)
    print("Base brasileira adicionada:", len(brasileiro))
else:
    print("CSV brasileiro não encontrado; treinamento seguirá com MOZ + ScamBench.")

base = pd.concat(frames, ignore_index=True)
base = base[base["texto"].str.len().between(5, 1500)].copy()
base["texto_normalizado"] = base["texto"].map(texto_normalizado)
base = base[base["texto_normalizado"].str.len() >= 3].copy()

print("Antes da limpeza final:", len(base))
display(pd.crosstab(base["origem"], base["label"], margins=True).rename(columns=ID2LABEL))

# %%
# Remove qualquer texto que apareça com rótulos contraditórios.
rotulos_por_texto = base.groupby("texto_normalizado")["label"].nunique()
conflitos = set(rotulos_por_texto[rotulos_por_texto > 1].index)
base = base[~base["texto_normalizado"].isin(conflitos)].copy()

# Remove duplicatas exatas/normalizadas antes de criar os splits, evitando vazamento.
base = base.drop_duplicates(subset=["texto_normalizado"], keep="first").reset_index(drop=True)

print("Conflitos removidos:", len(conflitos))
print("Total limpo:", len(base))
print(base["label"].map(ID2LABEL).value_counts())

if base["label"].nunique() != 2:
    raise RuntimeError("A base final precisa conter as duas classes.")

# %%
# Divisão estratificada: 70% treino, 15% validação e 15% teste.
treino_validacao, teste = train_test_split(
    base,
    test_size=0.15,
    random_state=SEED,
    stratify=base["label"],
)
treino, validacao = train_test_split(
    treino_validacao,
    test_size=0.1764705882,  # 15% do total original
    random_state=SEED,
    stratify=treino_validacao["label"],
)

treino = treino.reset_index(drop=True)
validacao = validacao.reset_index(drop=True)
teste = teste.reset_index(drop=True)

for nome, frame in (("treino", treino), ("validacao", validacao), ("teste", teste)):
    frame[["texto", "label", "origem"]].to_csv(
        PASTA_DADOS / f"{nome}_combinado.csv",
        index=False,
    )
    print(nome, len(frame), frame["label"].map(ID2LABEL).value_counts().to_dict())

# Verificação explícita contra vazamento de textos entre as divisões.
assert set(treino["texto_normalizado"]).isdisjoint(validacao["texto_normalizado"])
assert set(treino["texto_normalizado"]).isdisjoint(teste["texto_normalizado"])
assert set(validacao["texto_normalizado"]).isdisjoint(teste["texto_normalizado"])
print("Splits sem duplicatas entre si.")

# %%
tokenizer = AutoTokenizer.from_pretrained(MODELO_BASE, use_fast=True)


class DatasetMensagens(Dataset):
    """Dataset PyTorch simples, sem Hugging Face Datasets e sem pyarrow."""

    def __init__(self, frame: pd.DataFrame):
        self.textos = frame["texto"].tolist()
        self.labels = frame["label"].astype(int).tolist()

    def __len__(self) -> int:
        return len(self.textos)

    def __getitem__(self, indice: int) -> dict[str, object]:
        item = tokenizer(
            self.textos[indice],
            truncation=True,
            max_length=MAX_LENGTH,
        )
        item["labels"] = self.labels[indice]
        return item


dataset_treino = DatasetMensagens(treino)
dataset_validacao = DatasetMensagens(validacao)
dataset_teste = DatasetMensagens(teste)
data_collator = DataCollatorWithPadding(tokenizer=tokenizer)

model = AutoModelForSequenceClassification.from_pretrained(
    MODELO_BASE,
    num_labels=2,
    id2label=ID2LABEL,
    label2id=LABEL2ID,
)

print("Modelo base carregado:", MODELO_BASE)

# %%
def calcular_metricas(resultado) -> dict[str, float]:
    logits, labels = resultado
    previsoes = np.argmax(logits, axis=-1)
    precision_macro, recall_macro, f1_macro, _ = precision_recall_fscore_support(
        labels,
        previsoes,
        average="macro",
        zero_division=0,
    )
    precision_smishing, recall_smishing, f1_smishing, _ = precision_recall_fscore_support(
        labels,
        previsoes,
        average="binary",
        pos_label=1,
        zero_division=0,
    )
    return {
        "accuracy": accuracy_score(labels, previsoes),
        "precision_macro": precision_macro,
        "recall_macro": recall_macro,
        "f1_macro": f1_macro,
        "precision_smishing": precision_smishing,
        "recall_smishing": recall_smishing,
        "f1_smishing": f1_smishing,
    }


# Pesos inversamente proporcionais evitam que a classe legítima domine o treinamento.
contagens = treino["label"].value_counts().sort_index()
pesos = len(treino) / (2 * contagens.to_numpy(dtype=np.float32))
pesos_classes = torch.tensor(pesos, dtype=torch.float32)
print("Pesos [legitima, smishing]:", pesos_classes.tolist())


class TrainerComPesos(Trainer):
    def __init__(self, *args, class_weights: torch.Tensor, **kwargs):
        super().__init__(*args, **kwargs)
        self.class_weights = class_weights

    def compute_loss(
        self,
        model,
        inputs,
        return_outputs=False,
        num_items_in_batch=None,
    ):
        labels = inputs.pop("labels")
        outputs = model(**inputs)
        funcao_perda = CrossEntropyLoss(weight=self.class_weights.to(outputs.logits.device))
        loss = funcao_perda(outputs.logits, labels)
        return (loss, outputs) if return_outputs else loss

# %%
# Compatibilidade com versões que usam eval_strategy ou evaluation_strategy.
assinatura_argumentos = inspect.signature(TrainingArguments.__init__).parameters
argumentos = {
    "output_dir": str(PASTA_CHECKPOINTS),
    "learning_rate": LEARNING_RATE,
    "per_device_train_batch_size": 16 if torch.cuda.is_available() else 4,
    "per_device_eval_batch_size": 32 if torch.cuda.is_available() else 8,
    "gradient_accumulation_steps": 1 if torch.cuda.is_available() else 4,
    "num_train_epochs": NUM_EPOCHS,
    "weight_decay": 0.01,
    "save_strategy": "epoch",
    "logging_steps": 25,
    "save_total_limit": 2,
    "load_best_model_at_end": True,
    "metric_for_best_model": "f1_macro",
    "greater_is_better": True,
    "fp16": torch.cuda.is_available(),
    "report_to": "none",
    "seed": SEED,
    "data_seed": SEED,
}

if "eval_strategy" in assinatura_argumentos:
    argumentos["eval_strategy"] = "epoch"
else:
    argumentos["evaluation_strategy"] = "epoch"

if "warmup_ratio" in assinatura_argumentos:
    argumentos["warmup_ratio"] = 0.10
else:
    passos_por_epoca = math.ceil(
        len(dataset_treino)
        / argumentos["per_device_train_batch_size"]
        / argumentos["gradient_accumulation_steps"]
    )
    argumentos["warmup_steps"] = max(1, round(passos_por_epoca * NUM_EPOCHS * 0.10))

training_args = TrainingArguments(**argumentos)

parametros_trainer = {
    "model": model,
    "args": training_args,
    "train_dataset": dataset_treino,
    "eval_dataset": dataset_validacao,
    "data_collator": data_collator,
    "compute_metrics": calcular_metricas,
    "callbacks": [EarlyStoppingCallback(early_stopping_patience=2)],
    "class_weights": pesos_classes,
}

# Transformers 5 usa processing_class; versões anteriores usam tokenizer.
assinatura_trainer = inspect.signature(Trainer.__init__).parameters
if "processing_class" in assinatura_trainer:
    parametros_trainer["processing_class"] = tokenizer
elif "tokenizer" in assinatura_trainer:
    parametros_trainer["tokenizer"] = tokenizer

trainer = TrainerComPesos(**parametros_trainer)
print(training_args)

# %%
# O tempo depende da GPU. Em uma T4, mantenha esta célula executando até concluir.
resultado_treino = trainer.train()
print(resultado_treino)

# %%
resultado_teste = trainer.predict(dataset_teste)
previsoes_teste = np.argmax(resultado_teste.predictions, axis=-1)
labels_teste = resultado_teste.label_ids

print("Métricas finais:")
print(calcular_metricas((resultado_teste.predictions, labels_teste)))
print()
print(
    classification_report(
        labels_teste,
        previsoes_teste,
        labels=[0, 1],
        target_names=["legitima", "smishing"],
        digits=4,
        zero_division=0,
    )
)

matriz = confusion_matrix(labels_teste, previsoes_teste, labels=[0, 1])
plt.figure(figsize=(6, 5))
sns.heatmap(
    matriz,
    annot=True,
    fmt="d",
    cmap="Blues",
    xticklabels=["legitima", "smishing"],
    yticklabels=["legitima", "smishing"],
)
plt.xlabel("Previsão")
plt.ylabel("Rótulo real")
plt.title("Matriz de confusão — conjunto de teste")
plt.show()

classes_previstas = np.unique(previsoes_teste)
if len(classes_previstas) < 2:
    raise RuntimeError(
        "O modelo previu apenas uma classe. Não salve ainda; revise a base e os rótulos."
    )

# %%
def classificar_mensagem(texto: str) -> list[dict[str, float | str]]:
    entradas = tokenizer(
        limpar_texto(texto),
        return_tensors="pt",
        truncation=True,
        max_length=MAX_LENGTH,
    ).to(trainer.model.device)
    trainer.model.eval()
    with torch.inference_mode():
        logits = trainer.model(**entradas).logits[0]
        probabilidades = torch.softmax(logits, dim=-1).cpu().numpy()
    return [
        {"label": ID2LABEL[indice], "score": float(probabilidades[indice])}
        for indice in np.argsort(probabilidades)[::-1]
    ]


mensagens_manuais = [
    "Oi, cheguei bem em casa. Vamos almoçar amanhã?",
    "Sua fatura está disponível no aplicativo oficial. Não informe códigos a ninguém.",
    "Urgente! Sua conta foi bloqueada. Clique no link e informe sua senha agora.",
    "Mãe, troquei de número. Faça um Pix de R$ 800 para esta chave e depois explico.",
    "Você ganhou um prêmio. Pague a taxa de liberação para receber o valor.",
]

for mensagem in mensagens_manuais:
    print("\nMENSAGEM:", mensagem)
    print(classificar_mensagem(mensagem))

# %%
# Salva somente depois de passar pela avaliação e pelos testes manuais.
if PASTA_MODELO_FINAL.exists():
    shutil.rmtree(PASTA_MODELO_FINAL)

trainer.save_model(PASTA_MODELO_FINAL)
tokenizer.save_pretrained(PASTA_MODELO_FINAL)

metricas_finais = calcular_metricas((resultado_teste.predictions, labels_teste))
metadados = {
    "modelo_base": MODELO_BASE,
    "versao": "bertimbau-smishing-v2",
    "labels": ID2LABEL,
    "total": len(base),
    "treino": len(treino),
    "validacao": len(validacao),
    "teste": len(teste),
    "origens": base["origem"].value_counts().to_dict(),
    "metricas_teste": metricas_finais,
    "seed": SEED,
}

with (PASTA_MODELO_FINAL / "training_metadata.json").open("w", encoding="utf-8") as arquivo:
    json.dump(metadados, arquivo, ensure_ascii=False, indent=2)

print("Modelo salvo em:", PASTA_MODELO_FINAL)
print("Arquivos:", sorted(item.name for item in PASTA_MODELO_FINAL.iterdir()))

# %%
# Compacta e inicia o download para o computador.
arquivo_zip = shutil.make_archive(
    "/content/bertimbau-smishing-v2",
    "zip",
    root_dir=PASTA_MODELO_FINAL,
)
print("ZIP criado:", arquivo_zip)

from google.colab import files

files.download(arquivo_zip)
