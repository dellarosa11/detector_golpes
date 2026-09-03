"""Carregamento local e inferência do modelo BERTimbau treinado para smishing."""

import os
import threading
from pathlib import Path

import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer


class BertimbauClassifier:
    """Mantém tokenizer e modelo carregados uma única vez durante a vida da API."""

    def __init__(self, model_path: Path, max_length: int = 160) -> None:
        # Garante que a pasta do modelo existe localmente antes de tentar carregar.
        # O modelo fica em models/bertimbau-smishing-v2/ na raiz do projeto.
        if not model_path.is_dir():
            raise FileNotFoundError(f"Pasta do modelo não encontrada: {model_path}")

        # Evita avisos de deadlock do tokenizador em ambientes com múltiplas threads.
        os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
        self.model_path = model_path
        self.max_length = max_length

        # local_files_only=True impede downloads acidentais do Hugging Face Hub;
        # todos os arquivos do modelo devem estar presentes na pasta local.
        # O tokenizer.json foi regenerado com AutoTokenizer para garantir compatibilidade
        # com a versão atual da biblioteca tokenizers (rodar backend/scripts/ se precisar refazer).
        self.tokenizer = AutoTokenizer.from_pretrained(
            model_path,
            local_files_only=True,
            use_fast=True,
        )
        self.model = AutoModelForSequenceClassification.from_pretrained(
            model_path,
            local_files_only=True,
        )
        self.model.eval()

        # Usa GPU automaticamente se disponível; caso contrário, roda em CPU.
        # inference_mode() reduz uso de memória por não calcular gradientes.
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model.to(self.device)

        # Lock serializa as inferências para evitar condição de corrida na mesma instância.
        self._lock = threading.Lock()

        # Lê os rótulos do config.json para não depender de uma ordem fixa entre classes.
        label2id = {str(label).lower(): int(index) for label, index in self.model.config.label2id.items()}
        self.legitimate_id = label2id.get("legitima", 0)
        self.smishing_id = label2id.get("smishing", 1)

    def predict(self, text: str) -> dict[str, float | str]:
        """Tokeniza uma mensagem e devolve as probabilidades brutas do modelo."""
        inputs = self.tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            max_length=self.max_length,
        )
        inputs = {name: tensor.to(self.device) for name, tensor in inputs.items()}

        with self._lock, torch.inference_mode():
            logits = self.model(**inputs).logits[0]
            probabilities = torch.softmax(logits, dim=-1).cpu().tolist()

        smishing_probability = float(probabilities[self.smishing_id])
        legitimate_probability = float(probabilities[self.legitimate_id])
        label = "smishing" if smishing_probability >= legitimate_probability else "legitima"

        return {
            "label": label,
            "smishing_probability": smishing_probability,
            "legitimate_probability": legitimate_probability,
            "confidence": max(smishing_probability, legitimate_probability),
        }
