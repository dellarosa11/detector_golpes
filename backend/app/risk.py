"""Camada explicável que transforma probabilidades e sinais textuais em nível de risco."""

import re
from ipaddress import ip_address
from urllib.parse import urlsplit


def determinar_nivel_risco(probabilidade: float, limite_baixo: float, limite_alto: float) -> str:
    """Converte uma probabilidade contínua nos três níveis exibidos pela interface."""
    if probabilidade < limite_baixo:
        return "baixo"
    if probabilidade < limite_alto:
        return "medio"
    return "alto"


# Cada expressão possui a explicação que será mostrada no cartão de resultado do aplicativo.
PADROES_SINAIS = (
    (
        re.compile(r"\b(c[oó]digo|token|otp|senha|pin)\b", re.IGNORECASE),
        "Solicita ou menciona senha, token ou código de verificação",
    ),
    (
        re.compile(r"\b(pix|transfer[eê]ncia|dep[oó]sito|pagamento|boleto)\b", re.IGNORECASE),
        "Envolve pagamento, transferência, boleto ou Pix",
    ),
    (
        re.compile(
            r"\b(agora|urgente|imediatamente|hoje|expira|bloquead[oa]|suspens[aã]o)\b",
            re.IGNORECASE,
        ),
        "Usa urgência, prazo curto ou ameaça de bloqueio",
    ),
    (
        re.compile(r"(?:https?://|www\.|\b[a-z0-9-]+\.(?:com|net|org|app|site|online)\b)", re.IGNORECASE),
        "Contém um endereço externo que deve ser verificado",
    ),
    (
        re.compile(r"\b(cpf|cart[aã]o|cvv|dados banc[aá]rios|data de nascimento)\b", re.IGNORECASE),
        "Pede ou menciona dados pessoais ou financeiros",
    ),
    (
        re.compile(r"\b(acesso remoto|compartilh(?:e|ar) a tela|instale|aplicativo de suporte)\b", re.IGNORECASE),
        "Pode tentar obter acesso ao aparelho ou à tela",
    ),
    (
        re.compile(r"\b(pr[eê]mio|sortead[oa]|taxa de libera[cç][aã]o|retorno garantido)\b", re.IGNORECASE),
        "Apresenta prêmio, taxa antecipada ou promessa improvável",
    ),
)

# Verbos de ação ajudam a diferenciar uma simples menção de um pedido potencialmente perigoso.
PADRAO_ACAO = re.compile(
    r"\b(clique|acesse|informe|envie|mande|compartilhe|digite|confirme|fa[cç]a|pague|"
    r"transfira|instale|precisamos|necessitamos)\b",
    re.IGNORECASE,
)
# Avisos educativos usam as mesmas palavras dos golpes, por isso recebem redução de pontuação.
PADRAO_PROTECAO = re.compile(
    r"\b(n[aã]o compartilhe|n[aã]o informe|nunca informe|nenhum atendente|"
    r"aplicativo oficial|site oficial|n[aã]o cont[eé]m link|porque voc[eê] pediu)\b",
    re.IGNORECASE,
)


def pontuar_sinais_textuais(texto: str) -> float:
    """Estima risco por sinais explícitos para complementar o classificador treinado."""
    sinais = [bool(pattern.search(texto)) for pattern, _message in PADROES_SINAIS]
    credential, payment, urgency, link, personal_data, remote_access, prize = sinais
    pede_acao = bool(PADRAO_ACAO.search(texto))

    pontuacao = 0.0
    pontuacao += 0.62 if credential and pede_acao else 0.08 if credential else 0.0
    pontuacao += 0.42 if payment and pede_acao else 0.12 if payment else 0.0
    pontuacao += 0.18 if urgency else 0.0
    pontuacao += 0.45 if link and pede_acao else 0.20 if link else 0.0
    pontuacao += 0.55 if personal_data and pede_acao else 0.12 if personal_data else 0.0
    pontuacao += 0.68 if remote_access else 0.0
    pontuacao += 0.45 if prize and pede_acao else 0.22 if prize else 0.0

    # Combinações são mais relevantes que sinais isolados, como Pix acompanhado de urgência.
    if payment and urgency:
        pontuacao += 0.18
    if credential and link:
        pontuacao += 0.15
    if remote_access and pede_acao:
        pontuacao += 0.15

    if PADRAO_PROTECAO.search(texto):
        pontuacao *= 0.30

    return min(max(pontuacao, 0.0), 0.98)


ENCURTADORES_URL = {
    "bit.ly",
    "cutt.ly",
    "is.gd",
    "rebrand.ly",
    "shorturl.at",
    "t.co",
    "tiny.cc",
    "tinyurl.com",
    "urlz.fr",
}
TERMOS_SUSPEITOS_URL = re.compile(
    r"(?:atualiz|bloque|cadastro|confirm|conta|fatura|login|premio|pix|resgate|"
    r"seguranca|senha|suporte|token|verific)",
    re.IGNORECASE,
)


def normalizar_url(value: str) -> str:
    """Aceita endereço sem protocolo, mas rejeita formatos que não são links HTTP(S)."""
    cleaned = value.strip()
    if not cleaned or len(cleaned) > 2048 or any(character.isspace() for character in cleaned):
        raise ValueError("Informe um link válido sem espaços.")
    candidate = cleaned if re.match(r"^https?://", cleaned, re.IGNORECASE) else f"https://{cleaned}"
    endereco = urlsplit(candidate)
    if endereco.scheme.lower() not in {"http", "https"} or not endereco.hostname:
        raise ValueError("O link deve usar HTTP ou HTTPS e possuir um domínio.")
    return candidate


def _host_eh_ip(hostname: str) -> bool:
    """Identifica hosts que são endereços IP em vez de nomes de domínio."""
    try:
        ip_address(hostname.strip("[]"))
        return True
    except ValueError:
        return False


def listar_sinais_do_link(value: str) -> list[str]:
    """Explica sinais visíveis na URL sem abrir o endereço potencialmente perigoso."""
    normalizado = normalizar_url(value)
    endereco = urlsplit(normalizado)
    hostname = (endereco.hostname or "").lower().rstrip(".")
    alertas: list[str] = []

    if endereco.scheme.lower() != "https":
        alertas.append("O endereço não utiliza uma conexão HTTPS")
    if _host_eh_ip(hostname):
        alertas.append("Usa um endereço IP no lugar de um domínio identificável")
    if "xn--" in hostname or any(ord(character) > 127 for character in hostname):
        alertas.append("O domínio possui caracteres que podem imitar outro endereço")
    if endereco.username or endereco.password or "@" in endereco.netloc:
        alertas.append("Contém @ ou credenciais capazes de esconder o domínio verdadeiro")
    if hostname in ENCURTADORES_URL:
        alertas.append("É um link encurtado e esconde o endereço de destino")
    if hostname.count(".") >= 4:
        alertas.append("Possui uma quantidade incomum de subdomínios")
    if hostname.count("-") >= 3:
        alertas.append("O domínio usa muitos hífens, padrão comum em endereços imitadores")
    if TERMOS_SUSPEITOS_URL.search(f"{hostname}{endereco.path}{endereco.query}"):
        alertas.append("O endereço usa termos associados a confirmação, bloqueio ou recompensa")
    if "%" in endereco.path or "%" in endereco.query:
        alertas.append("Há caracteres codificados que dificultam a leitura do destino")
    if re.search(r"https?%3a|https?://", endereco.query, re.IGNORECASE):
        alertas.append("O link contém outro endereço escondido nos parâmetros")
    if len(normalizado) > 140:
        alertas.append("O endereço é muito longo e difícil de verificar visualmente")

    return alertas[:4]


def pontuar_risco_link(value: str) -> float:
    """Pontua somente a estrutura do link; a API nunca abre o endereço informado."""
    normalizado = normalizar_url(value)
    endereco = urlsplit(normalizado)
    hostname = (endereco.hostname or "").lower().rstrip(".")
    pontuacao = 0.0

    pontuacao += 0.18 if endereco.scheme.lower() != "https" else 0.0
    pontuacao += 0.52 if _host_eh_ip(hostname) else 0.0
    pontuacao += 0.48 if "xn--" in hostname or any(ord(char) > 127 for char in hostname) else 0.0
    pontuacao += 0.55 if endereco.username or endereco.password or "@" in endereco.netloc else 0.0
    pontuacao += 0.40 if hostname in ENCURTADORES_URL else 0.0
    pontuacao += 0.18 if hostname.count(".") >= 4 else 0.0
    pontuacao += 0.16 if hostname.count("-") >= 3 else 0.0
    pontuacao += 0.34 if TERMOS_SUSPEITOS_URL.search(hostname) else 0.0
    pontuacao += 0.22 if TERMOS_SUSPEITOS_URL.search(f"{endereco.path}{endereco.query}") else 0.0
    pontuacao += 0.18 if "%" in endereco.path or "%" in endereco.query else 0.0
    pontuacao += 0.28 if re.search(r"https?%3a|https?://", endereco.query, re.IGNORECASE) else 0.0
    pontuacao += 0.22 if len(normalizado) > 140 else 0.10 if len(normalizado) > 90 else 0.0

    try:
        if endereco.port and endereco.port not in {80, 443}:
            pontuacao += 0.20
    except ValueError:
        pontuacao += 0.28

    return min(max(pontuacao, 0.0), 0.98)


def combinar_pontuacoes(
    probabilidade_modelo: float,
    texto: str,
    tipo_analise: str = "message",
) -> tuple[float, float]:
    """Combina BERTimbau e regras adequadas ao tipo de conteúdo analisado."""
    if tipo_analise == "link":
        pontuacao_heuristica = pontuar_risco_link(texto)
        # BERTimbau foi treinado com mensagens; sozinho ele não pode elevar uma URL comum
        # acima do risco baixo. Os sinais estruturais do endereço têm prioridade neste modo.
        return max(probabilidade_modelo * 0.25, pontuacao_heuristica), pontuacao_heuristica

    pontuacao_heuristica = pontuar_sinais_textuais(texto)
    return max(probabilidade_modelo, pontuacao_heuristica), pontuacao_heuristica


def listar_sinais_de_alerta(texto: str, level: str, tipo_analise: str = "message") -> list[str]:
    """Retorna no máximo quatro explicações curtas para a interface mobile."""
    if tipo_analise == "link":
        alertas = listar_sinais_do_link(texto)
        return alertas or ["Não foram encontrados sinais estruturais fortes neste endereço"]

    alertas = [message for pattern, message in PADROES_SINAIS if pattern.search(texto)]
    if alertas:
        return alertas[:4]
    if level == "baixo":
        return ["Não foram encontrados pedidos explícitos de senha, código ou pagamento"]
    return ["O padrão geral do texto se aproxima de mensagens fraudulentas conhecidas"]


def orientar_acao(level: str, tipo_analise: str = "message") -> str:
    """Escolhe uma orientação prática proporcional ao nível calculado."""
    if tipo_analise == "link":
        if level == "alto":
            return (
                "Não abra o link nem informe dados. Acesse o aplicativo ou digite manualmente o "
                "endereço oficial da instituição para confirmar a solicitação."
            )
        if level == "medio":
            return (
                "Evite abrir o endereço antes de confirmar o domínio com a instituição. Links "
                "encurtados ou recebidos sem solicitação exigem atenção adicional."
            )
        return (
            "A estrutura do link não apresentou sinais fortes, mas confirme o domínio e prefira "
            "acessar o serviço pelo aplicativo oficial."
        )

    if level == "alto":
        return (
            "Não responda, não clique em links e não faça pagamentos. Confirme a situação "
            "diretamente no aplicativo ou canal oficial da instituição."
        )
    if level == "medio":
        return (
            "Confirme o remetente por outro canal antes de responder, abrir links ou informar dados. "
            "Se houver cobrança, consulte o aplicativo oficial."
        )
    return (
        "A mensagem não apresentou sinais fortes de smishing, mas continue evitando compartilhar "
        "senhas, códigos e dados financeiros por conversa."
    )
