"""Extração local de texto de prints antes da classificação pelo BERTimbau."""

from io import BytesIO

import numpy as np
from PIL import Image, ImageOps
from rapidocr import RapidOCR


class ImageTextExtractor:
    """Mantém os modelos do RapidOCR carregados para reutilizá-los entre requisições."""

    def __init__(self) -> None:
        self._engine = RapidOCR()

    def extract(self, image_bytes: bytes) -> str:
        """Corrige rotação, limita resolução e devolve somente linhas com confiança útil."""
        with Image.open(BytesIO(image_bytes)) as source:
            image = ImageOps.exif_transpose(source).convert("RGB")
            image.thumbnail((2200, 2200))
            image_array = np.asarray(image)

        result = self._engine(image_array)
        texts = getattr(result, "txts", None)
        scores = getattr(result, "scores", None)

        # Compatibilidade com o formato antigo do RapidOCR facilita atualizar a dependência.
        if texts is None and isinstance(result, tuple) and result:
            rows = result[0] or []
            texts = [row[1] for row in rows if len(row) >= 3 and float(row[2]) >= 0.35]
            scores = None

        if not texts:
            return ""

        clean_lines: list[str] = []
        for index, value in enumerate(texts):
            score = float(scores[index]) if scores is not None and index < len(scores) else 1.0
            cleaned = " ".join(str(value).split())
            if cleaned and score >= 0.35:
                clean_lines.append(cleaned)

        return "\n".join(clean_lines).strip()
