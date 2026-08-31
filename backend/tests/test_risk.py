"""Testes rápidos para evitar regressões nos principais níveis da análise heurística."""

import unittest

from backend.app.risk import heuristic_risk_score, risk_level


class RiskRulesTest(unittest.TestCase):
    # Cobre um golpe explícito, uma conversa normal e um aviso de segurança legítimo.
    def test_obvious_scam_is_high_risk(self) -> None:
        score = heuristic_risk_score(
            "Urgente! Clique no link e informe sua senha para evitar o bloqueio."
        )
        self.assertEqual(risk_level(score, 0.35, 0.70), "alto")

    def test_normal_conversation_is_low_risk(self) -> None:
        score = heuristic_risk_score("Oi, cheguei bem em casa. Vamos almoçar amanhã?")
        self.assertEqual(risk_level(score, 0.35, 0.70), "baixo")

    def test_protective_notice_does_not_become_high_risk(self) -> None:
        score = heuristic_risk_score(
            "O código foi enviado porque você pediu. Nenhum atendente solicitará esse código."
        )
        self.assertLess(score, 0.35)


if __name__ == "__main__":
    unittest.main()
