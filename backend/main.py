
# app: aplicação principal FastAPI.
# CORSMiddleware: autoriza o painel WEB a acessar a API.
# verificar_api(): verifica a disponibilidade do servidor.
# verificar_banco(): verifica a conexão com o PostgreSQL.

import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import SQLAlchemyError

from usuarios import router as usuarios_router
from autenticacao import router as autenticacao_router
from prefeitura import router as prefeitura_router
from documentos import router as documentos_router
from database import testar_conexao


app = FastAPI(
    title="API OUninibusvali",
    version="0.1.0",
)

origens_permitidas = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

origens_extras = os.getenv("CORS_ORIGINS", "")

origens_permitidas.extend(
    origem.strip()
    for origem in origens_extras.split(",")
    if origem.strip()
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origens_permitidas,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


app.include_router(usuarios_router)
app.include_router(autenticacao_router)
app.include_router(prefeitura_router)
app.include_router(documentos_router)


@app.get("/health", tags=["Sistema"])
def verificar_api():
    return {"status": "ok"}


@app.get("/health/database", tags=["Sistema"])
def verificar_banco():
    try:
        testar_conexao()
    except SQLAlchemyError:
        raise HTTPException(
            status_code=503,
            detail="Não foi possível conectar ao banco de dados.",
        ) from None

    return {
        "status": "ok",
        "banco": "ouninibusvali",
    }
