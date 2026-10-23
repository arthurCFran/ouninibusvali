import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import engine
from models import Usuario
from schemas import UsuarioResposta

router = APIRouter(prefix="/auth", tags=["Autenticação"])
seguranca = HTTPBearer()

CHAVE_JWT = os.environ["JWT_SECRET"]
ALGORITMO = "HS256"


class LoginEntrada(BaseModel):
    email: EmailStr
    senha: str = Field(min_length=1, max_length=72)


class LoginResposta(BaseModel):
    access_token: str
    token_type: str = "bearer"
    usuario: UsuarioResposta


def erro_autenticacao():
    return HTTPException(
        status_code=401,
        detail="Credenciais inválidas ou sessão expirada.",
        headers={"WWW-Authenticate": "Bearer"},
    )


@router.post("/login", response_model=LoginResposta)
def login(dados: LoginEntrada):
    email = str(dados.email).strip().lower()
    senha = dados.senha.encode("utf-8")

    if len(senha) > 72:
        raise erro_autenticacao()

    with Session(engine) as sessao:
        usuario = sessao.scalar(
            select(Usuario).where(Usuario.email == email)
        )

        if usuario is None:
            raise erro_autenticacao()

        if not bcrypt.checkpw(
            senha,
            usuario.senha_hash.encode("utf-8"),
        ):
            raise erro_autenticacao()

        agora = datetime.now(timezone.utc)

        token = jwt.encode(
            {
                "sub": str(usuario.id),
                "iat": agora,
                "exp": agora + timedelta(hours=2),
            },
            CHAVE_JWT,
            algorithm=ALGORITMO,
        )

        return LoginResposta(
            access_token=token,
            usuario=UsuarioResposta.model_validate(usuario),
        )


def obter_usuario_atual(
    credenciais: HTTPAuthorizationCredentials = Depends(seguranca),
):
    try:
        payload = jwt.decode(
            credenciais.credentials,
            CHAVE_JWT,
            algorithms=[ALGORITMO],
            options={"require": ["sub", "iat", "exp"]},
        )
        usuario_id = int(payload["sub"])
    except (jwt.InvalidTokenError, ValueError, TypeError):
        raise erro_autenticacao() from None

    with Session(engine) as sessao:
        usuario = sessao.get(Usuario, usuario_id)

        if usuario is None:
            raise erro_autenticacao()

        return UsuarioResposta.model_validate(usuario)


@router.get("/me", response_model=UsuarioResposta)
def consultar_meu_perfil(
    usuario: UsuarioResposta = Depends(obter_usuario_atual),
):
    return usuario