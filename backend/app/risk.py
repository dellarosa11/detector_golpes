"""Camada explicável que transforma probabilidades e sinais textuais em nível de risco."""

import re


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


def combined_risk_probability(model_probability: float, text: str) -> tuple[float, float]:
    """Usa a maior evidência entre o modelo e as regras para priorizar a segurança."""
    heuristic_probability = heuristic_risk_score(text)
    return max(model_probability, heuristic_probability), heuristic_probability


def warning_signals(text: str, level: str) -> list[str]:
    """Retorna no máximo quatro explicações curtas para a interface mobile."""
    warnings = [message for pattern, message in SIGNAL_PATTERNS if pattern.search(text)]
    if warnings:
        return warnings[:4]
    if level == "baixo":
        return ["Não foram encontrados pedidos explícitos de senha, código ou pagamento"]
    return ["O padrão geral do texto se aproxima de mensagens fraudulentas conhecidas"]


def recommended_action(level: str) -> str:
    """Escolhe uma orientação prática proporcional ao nível calculado."""
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
