"""Proteção opcional das rotas da API usando tokens de sessão do Firebase."""

import os
from typing import Annotated

import firebase_admin
from fastapi import Header, HTTPException, status
from firebase_admin import auth


def _enabled(value: str | None, default: bool = False) -> bool:
    """Converte variáveis de ambiente textuais em valores booleanos."""
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def require_firebase_user(
    authorization: Annotated[str | None, Header()] = None,
) -> dict[str, object] | None:
    """Valida o Bearer token em produção ou libera a chamada no ambiente local."""
    require_auth = _enabled(os.getenv("REQUIRE_FIREBASE_AUTH"), default=True)
    if not require_auth:
        return None

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Autenticação Firebase obrigatória.",
        )

    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token Firebase ausente.",
        )

    try:
        # initialize_app usa as credenciais da conta de serviço fornecidas pelo ambiente publicado.
        if not firebase_admin._apps:
            firebase_admin.initialize_app()
        return auth.verify_id_token(token)
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sessão Firebase inválida ou expirada.",
        ) from error
