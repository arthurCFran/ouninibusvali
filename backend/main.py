from fastapi import FastAPI, HTTPException
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