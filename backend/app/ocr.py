"""Extração local de texto de prints antes da classificação pelo BERTimbau."""

from io import BytesIO

import numpy as np
from PIL import Image, ImageOps
from rapidocr import RapidOCR


class LeitorTextoImagem:
    """Mantém os modelos do RapidOCR carregados para reutilizá-los entre requisições."""

    def __init__(self) -> None:
        self._engine = RapidOCR()

    def extract(self, bytes_imagem: bytes) -> str:
        """Corrige rotação, limita resolução e devolve somente linhas com confiança útil."""
        # Corrige a orientação da foto e reduz imagens enormes antes de convertê-las para o OCR.
        with Image.open(BytesIO(bytes_imagem)) as source:
            image = ImageOps.exif_transpose(source).convert("RGB")
            image.thumbnail((2200, 2200))
            matriz_imagem = np.asarray(image)

        result = self._engine(matriz_imagem)
        texts = getattr(result, "txts", None)
        scores = getattr(result, "scores", None)

        # Compatibilidade com o formato antigo do RapidOCR facilita atualizar a dependência.
        if texts is None and isinstance(result, tuple) and result:
            rows = result[0] or []
            texts = [row[1] for row in rows if len(row) >= 3 and float(row[2]) >= 0.35]
            scores = None

        if not texts:
            return ""

        # Descarta linhas vazias ou com baixa confiança e junta o texto na ordem fornecida pelo OCR.
        linhas_limpas: list[str] = []
        for index, value in enumerate(texts):
            score = float(scores[index]) if scores is not None and index < len(scores) else 1.0
            cleaned = " ".join(str(value).split())
            if cleaned and score >= 0.35:
                linhas_limpas.append(cleaned)

        return "\n".join(linhas_limpas).strip()
