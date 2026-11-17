import asyncio
import unittest
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException
from pydantic import ValidationError

from backend.app.main import PredictionRequest, predict


class TesteLimiteMensagem(unittest.TestCase):
    def test_aceita_mensagem_acima_do_limite_anterior(self) -> None:
        payload = PredictionRequest(text="x" * 3164, analysisType="message")

        with patch("backend.app.main.classificar_texto", new_callable=AsyncMock) as classificar:
            resultado = object()
            classificar.return_value = resultado
            resposta = asyncio.run(predict(payload, object(), None))

        self.assertIs(resposta, resultado)
        classificar.assert_awaited_once()

    def test_rejeita_mensagem_acima_de_5000_caracteres(self) -> None:
        with self.assertRaises(ValidationError):
            PredictionRequest(text="x" * 5001, analysisType="message")

    def test_preserva_limite_de_caracteres_para_links(self) -> None:
        payload = PredictionRequest(text="x" * 2049, analysisType="link")

        with self.assertRaises(HTTPException) as context:
            asyncio.run(predict(payload, object(), None))

        self.assertEqual(context.exception.status_code, 422)


if __name__ == "__main__":
    unittest.main()
