"""Testes rápidos para evitar regressões nos principais níveis da análise heurística."""

import unittest

from backend.app.risk import (
    pontuar_sinais_textuais,
    pontuar_risco_link,
    listar_sinais_do_link,
    normalizar_url,
    determinar_nivel_risco,
)


class TesteRegrasRisco(unittest.TestCase):
    # Cobre um golpe explícito, uma conversa normal e um aviso de segurança legítimo.
    def test_obvious_scam_is_high_risk(self) -> None:
        # Verifica que urgência, link e solicitação de senha elevam juntos o risco.
        pontuacao = pontuar_sinais_textuais(
            "Urgente! Clique no link e informe sua senha para evitar o bloqueio."
        )
        self.assertEqual(determinar_nivel_risco(pontuacao, 0.35, 0.70), "alto")

    def test_normal_conversation_is_low_risk(self) -> None:
        # Uma conversa cotidiana não deve ser sinalizada sem indicadores de golpe.
        pontuacao = pontuar_sinais_textuais("Oi, cheguei bem em casa. Vamos almoçar amanhã?")
        self.assertEqual(determinar_nivel_risco(pontuacao, 0.35, 0.70), "baixo")

    def test_protective_notice_does_not_become_high_risk(self) -> None:
        # Textos educativos podem mencionar códigos sem pedir que a pessoa os compartilhe.
        pontuacao = pontuar_sinais_textuais(
            "O código foi enviado porque você pediu. Nenhum atendente solicitará esse código."
        )
        self.assertLess(pontuacao, 0.35)

    def test_common_https_link_is_low_risk(self) -> None:
        # Um domínio HTTPS comum deve ter poucos sinais estruturais suspeitos.
        self.assertLess(pontuar_risco_link("https://www.gov.br"), 0.35)

    def test_disguised_link_is_high_risk(self) -> None:
        # O teste combina IP, credenciais embutidas e redirecionamento para outro endereço.
        link = "http://conta-seguranca-login@192.168.0.8/verificar?next=https://banco.com"
        self.assertGreaterEqual(pontuar_risco_link(link), 0.70)
        self.assertTrue(listar_sinais_do_link(link))

    def test_link_without_protocol_is_normalized(self) -> None:
        # URLs sem protocolo recebem HTTPS para serem avaliadas de maneira uniforme.
        self.assertEqual(normalizar_url("exemplo.com/ajuda"), "https://exemplo.com/ajuda")


if __name__ == "__main__":
    unittest.main()
