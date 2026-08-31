"""Testes rápidos para evitar regressões nos principais níveis da análise heurística."""

import unittest

from backend.app.risk import (
    heuristic_risk_score,
    link_risk_score,
    link_warning_signals,
    normalize_url,
    risk_level,
)


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

    def test_common_https_link_is_low_risk(self) -> None:
        self.assertLess(link_risk_score("https://www.gov.br"), 0.35)

    def test_disguised_link_is_high_risk(self) -> None:
        link = "http://conta-seguranca-login@192.168.0.8/verificar?next=https://banco.com"
        self.assertGreaterEqual(link_risk_score(link), 0.70)
        self.assertTrue(link_warning_signals(link))

    def test_link_without_protocol_is_normalized(self) -> None:
        self.assertEqual(normalize_url("exemplo.com/ajuda"), "https://exemplo.com/ajuda")


if __name__ == "__main__":
    unittest.main()
