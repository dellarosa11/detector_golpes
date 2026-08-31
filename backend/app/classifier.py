"""Carregamento local e inferência do modelo BERTimbau treinado para smishing."""

import os
import threading
from pathlib import Path

import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer


class BertimbauClassifier:
    """Mantém tokenizer e modelo carregados uma única vez durante a vida da API."""

    def __init__(self, model_path: Path, max_length: int = 160) -> None:
        if not model_path.is_dir():
            raise FileNotFoundError(f"Pasta do modelo não encontrada: {model_path}")

        os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
        self.model_path = model_path
        self.max_length = max_length
        # local_files_only impede downloads inesperados; todos os arquivos vêm da pasta models.
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
        # Usa GPU quando disponível e funciona em CPU para desenvolvimento e Cloud Run.
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model.to(self.device)
        # Serializa a inferência para evitar concorrência insegura sobre a mesma instância.
        self._lock = threading.Lock()

        # Lê os índices do config.json para não depender de uma ordem fixa das classes.
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
            # inference_mode reduz memória porque não são calculados gradientes no servidor.
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
