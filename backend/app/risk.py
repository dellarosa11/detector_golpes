"""Camada explicável que transforma probabilidades e sinais textuais em nível de risco."""

import re
from ipaddress import ip_address
from urllib.parse import urlsplit


def risk_level(probability: float, low_threshold: float, high_threshold: float) -> str:
    if probability < low_threshold:
        return "baixo"
    if probability < high_threshold:
        return "medio"
    return "alto"


# Cada expressão possui a explicação que será mostrada no cartão de resultado do aplicativo.
SIGNAL_PATTERNS = (
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
ACTION_PATTERN = re.compile(
    r"\b(clique|acesse|informe|envie|mande|compartilhe|digite|confirme|fa[cç]a|pague|"
    r"transfira|instale|precisamos|necessitamos)\b",
    re.IGNORECASE,
)
# Avisos educativos usam as mesmas palavras dos golpes, por isso recebem redução de pontuação.
PROTECTIVE_PATTERN = re.compile(
    r"\b(n[aã]o compartilhe|n[aã]o informe|nunca informe|nenhum atendente|"
    r"aplicativo oficial|site oficial|n[aã]o cont[eé]m link|porque voc[eê] pediu)\b",
    re.IGNORECASE,
)


def heuristic_risk_score(text: str) -> float:
    """Estima risco por sinais explícitos para complementar o classificador treinado."""
    matches = [bool(pattern.search(text)) for pattern, _message in SIGNAL_PATTERNS]
    credential, payment, urgency, link, personal_data, remote_access, prize = matches
    requests_action = bool(ACTION_PATTERN.search(text))

    score = 0.0
    score += 0.62 if credential and requests_action else 0.08 if credential else 0.0
    score += 0.42 if payment and requests_action else 0.12 if payment else 0.0
    score += 0.18 if urgency else 0.0
    score += 0.45 if link and requests_action else 0.20 if link else 0.0
    score += 0.55 if personal_data and requests_action else 0.12 if personal_data else 0.0
    score += 0.68 if remote_access else 0.0
    score += 0.45 if prize and requests_action else 0.22 if prize else 0.0

    # Combinações são mais relevantes que sinais isolados, como Pix acompanhado de urgência.
    if payment and urgency:
        score += 0.18
    if credential and link:
        score += 0.15
    if remote_access and requests_action:
        score += 0.15

    if PROTECTIVE_PATTERN.search(text):
        score *= 0.30

    return min(max(score, 0.0), 0.98)


URL_SHORTENERS = {
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
URL_SUSPICIOUS_TERMS = re.compile(
    r"(?:atualiz|bloque|cadastro|confirm|conta|fatura|login|premio|pix|resgate|"
    r"seguranca|senha|suporte|token|verific)",
    re.IGNORECASE,
)


def normalize_url(value: str) -> str:
    """Aceita endereço sem protocolo, mas rejeita formatos que não são links HTTP(S)."""
    cleaned = value.strip()
    if not cleaned or len(cleaned) > 2048 or any(character.isspace() for character in cleaned):
        raise ValueError("Informe um link válido sem espaços.")
    candidate = cleaned if re.match(r"^https?://", cleaned, re.IGNORECASE) else f"https://{cleaned}"
    parsed = urlsplit(candidate)
    if parsed.scheme.lower() not in {"http", "https"} or not parsed.hostname:
        raise ValueError("O link deve usar HTTP ou HTTPS e possuir um domínio.")
    return candidate


def _is_ip_host(hostname: str) -> bool:
    try:
        ip_address(hostname.strip("[]"))
        return True
    except ValueError:
        return False


def link_warning_signals(value: str) -> list[str]:
    """Explica sinais visíveis na URL sem abrir o endereço potencialmente perigoso."""
    normalized = normalize_url(value)
    parsed = urlsplit(normalized)
    hostname = (parsed.hostname or "").lower().rstrip(".")
    warnings: list[str] = []

    if parsed.scheme.lower() != "https":
        warnings.append("O endereço não utiliza uma conexão HTTPS")
    if _is_ip_host(hostname):
        warnings.append("Usa um endereço IP no lugar de um domínio identificável")
    if "xn--" in hostname or any(ord(character) > 127 for character in hostname):
        warnings.append("O domínio possui caracteres que podem imitar outro endereço")
    if parsed.username or parsed.password or "@" in parsed.netloc:
        warnings.append("Contém @ ou credenciais capazes de esconder o domínio verdadeiro")
    if hostname in URL_SHORTENERS:
        warnings.append("É um link encurtado e esconde o endereço de destino")
    if hostname.count(".") >= 4:
        warnings.append("Possui uma quantidade incomum de subdomínios")
    if hostname.count("-") >= 3:
        warnings.append("O domínio usa muitos hífens, padrão comum em endereços imitadores")
    if URL_SUSPICIOUS_TERMS.search(f"{hostname}{parsed.path}{parsed.query}"):
        warnings.append("O endereço usa termos associados a confirmação, bloqueio ou recompensa")
    if "%" in parsed.path or "%" in parsed.query:
        warnings.append("Há caracteres codificados que dificultam a leitura do destino")
    if re.search(r"https?%3a|https?://", parsed.query, re.IGNORECASE):
        warnings.append("O link contém outro endereço escondido nos parâmetros")
    if len(normalized) > 140:
        warnings.append("O endereço é muito longo e difícil de verificar visualmente")

    return warnings[:4]


def link_risk_score(value: str) -> float:
    """Pontua somente a estrutura do link; a API nunca abre o endereço informado."""
    normalized = normalize_url(value)
    parsed = urlsplit(normalized)
    hostname = (parsed.hostname or "").lower().rstrip(".")
    score = 0.0

    score += 0.18 if parsed.scheme.lower() != "https" else 0.0
    score += 0.52 if _is_ip_host(hostname) else 0.0
    score += 0.48 if "xn--" in hostname or any(ord(char) > 127 for char in hostname) else 0.0
    score += 0.55 if parsed.username or parsed.password or "@" in parsed.netloc else 0.0
    score += 0.40 if hostname in URL_SHORTENERS else 0.0
    score += 0.18 if hostname.count(".") >= 4 else 0.0
    score += 0.16 if hostname.count("-") >= 3 else 0.0
    score += 0.34 if URL_SUSPICIOUS_TERMS.search(hostname) else 0.0
    score += 0.22 if URL_SUSPICIOUS_TERMS.search(f"{parsed.path}{parsed.query}") else 0.0
    score += 0.18 if "%" in parsed.path or "%" in parsed.query else 0.0
    score += 0.28 if re.search(r"https?%3a|https?://", parsed.query, re.IGNORECASE) else 0.0
    score += 0.22 if len(normalized) > 140 else 0.10 if len(normalized) > 90 else 0.0

    try:
        if parsed.port and parsed.port not in {80, 443}:
            score += 0.20
    except ValueError:
        score += 0.28

    return min(max(score, 0.0), 0.98)


def combined_risk_probability(
    model_probability: float,
    text: str,
    analysis_type: str = "message",
) -> tuple[float, float]:
    """Combina BERTimbau e regras adequadas ao tipo de conteúdo analisado."""
    if analysis_type == "link":
        heuristic_probability = link_risk_score(text)
        # BERTimbau foi treinado com mensagens; sozinho ele não pode elevar uma URL comum
        # acima do risco baixo. Os sinais estruturais do endereço têm prioridade neste modo.
        return max(model_probability * 0.25, heuristic_probability), heuristic_probability

    heuristic_probability = heuristic_risk_score(text)
    return max(model_probability, heuristic_probability), heuristic_probability


def warning_signals(text: str, level: str, analysis_type: str = "message") -> list[str]:
    """Retorna no máximo quatro explicações curtas para a interface mobile."""
    if analysis_type == "link":
        warnings = link_warning_signals(text)
        return warnings or ["Não foram encontrados sinais estruturais fortes neste endereço"]

    warnings = [message for pattern, message in SIGNAL_PATTERNS if pattern.search(text)]
    if warnings:
        return warnings[:4]
    if level == "baixo":
        return ["Não foram encontrados pedidos explícitos de senha, código ou pagamento"]
    return ["O padrão geral do texto se aproxima de mensagens fraudulentas conhecidas"]


def recommended_action(level: str, analysis_type: str = "message") -> str:
    """Escolhe uma orientação prática proporcional ao nível calculado."""
    if analysis_type == "link":
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
