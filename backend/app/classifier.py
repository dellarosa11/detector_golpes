"""Carregamento local e inferência do modelo BERTimbau treinado para smishing."""

import os
import threading
from pathlib import Path

import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer


class ClassificadorBertimbau:
    """Mantém tokenizer e modelo carregados uma única vez durante a vida da API."""

    def __init__(self, caminho_modelo: Path, max_length: int = 160) -> None:
        os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
        self.caminho_modelo = caminho_modelo
        self.max_length = max_length
        self._lock = threading.Lock()

        # Verifica se os arquivos do modelo treinado estão presentes
        tem_arquivos = (
            caminho_modelo.is_dir()
            and (caminho_modelo / "config.json").exists()
            and any((caminho_modelo / f).exists() for f in ["model.safetensors", "pytorch_model.bin"])
        )

        if not tem_arquivos:
            print(f"⚠️ [DEV] Arquivos do modelo BERTimbau não encontrados em {caminho_modelo}.")
            print("   Operando em modo de teste/desenvolvimento para permitir testes no app.")
            self.modo_fallback = True
            self.tokenizer = None
            self.model = None
            return

        self.modo_fallback = False
        self.tokenizer = AutoTokenizer.from_pretrained(
            caminho_modelo,
            local_files_only=True,
            use_fast=True,
        )
        self.model = AutoModelForSequenceClassification.from_pretrained(
            caminho_modelo,
            local_files_only=True,
        )
        self.model.eval()

        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model.to(self.device)

        label2id = {str(label).lower(): int(index) for label, index in self.model.config.label2id.items()}
        self.id_legitima = label2id.get("legitima", 0)
        self.id_smishing = label2id.get("smishing", 1)

    def predict(self, texto: str) -> dict[str, float | str]:
        """Tokeniza uma mensagem e devolve as probabilidades brutas do modelo."""
        if self.modo_fallback:
            texto_lower = texto.lower()
            termos_golpe = [
                "pix", "urgente", "bloqueio", "bloqueada", "premio", "premiação",
                "clique", "cancelar", "compra", "banco", "senha", "codigo", "código",
                "atualize", "multa", "processo", "limite", "aprovado", "resgate"
            ]
            matches = sum(1 for termo in termos_golpe if termo in texto_lower)
            if matches >= 3:
                probabilidade_smishing = min(0.92, 0.5 + (matches * 0.1))
            elif matches >= 1:
                probabilidade_smishing = 0.45 + (matches * 0.1)
            else:
                probabilidade_smishing = 0.12

            probabilidade_legitima = round(1.0 - probabilidade_smishing, 4)
            label = "smishing" if probabilidade_smishing >= probabilidade_legitima else "legitima"
            return {
                "label": label,
                "smishing_probability": probabilidade_smishing,
                "legitimate_probability": probabilidade_legitima,
                "confidence": max(probabilidade_smishing, probabilidade_legitima),
            }

        # Trunca entradas longas, move tensores para o dispositivo escolhido e calcula logits.
        entradas = self.tokenizer(
            texto,
            return_tensors="pt",
            truncation=True,
            max_length=self.max_length,
        )
        entradas = {name: tensor.to(self.device) for name, tensor in entradas.items()}

        with self._lock, torch.inference_mode():
            logits = self.model(**entradas).logits[0]
            probabilidades = torch.softmax(logits, dim=-1).cpu().tolist()

        probabilidade_smishing = float(probabilidades[self.id_smishing])
        probabilidade_legitima = float(probabilidades[self.id_legitima])
        label = "smishing" if probabilidade_smishing >= probabilidade_legitima else "legitima"

        return {
            "label": label,
            "smishing_probability": probabilidade_smishing,
            "legitimate_probability": probabilidade_legitima,
            "confidence": max(probabilidade_smishing, probabilidade_legitima),
        }
