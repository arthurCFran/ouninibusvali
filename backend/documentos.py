from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    UploadFile,
)
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from autenticacao import obter_usuario_atual
from database import engine
from models import Usuario
from prefeitura import exigir_agente
from schemas import UsuarioResposta


router = APIRouter(tags=["Comprovantes"])

LIMITE_PDF = 5 * 1024 * 1024


def validar_pdf(conteudo: bytes):
    if len(conteudo) > LIMITE_PDF:
        raise HTTPException(
            status_code=413,
            detail="O PDF deve ter no máximo 5 MB.",
        )

    if not conteudo.startswith(b"%PDF-"):
        raise HTTPException(
            status_code=422,
            detail="Envie um arquivo PDF.",
        )


def salvar_comprovante(aluno_id: int, conteudo: bytes):
    validar_pdf(conteudo)

    with Session(engine) as sessao:
        aluno = sessao.scalar(
            select(Usuario)
            .where(Usuario.id == aluno_id)
            .with_for_update()
        )

        if aluno is None or aluno.perfil != "aluno":
            raise HTTPException(
                status_code=404,
                detail="Aluno não encontrado.",
            )

        aluno.comprovante_pdf = conteudo
        aluno.status = "pendente"

        sessao.commit()

    return {
        "mensagem": "Comprovante enviado para análise.",
        "status": "pendente",
    }


def exigir_aluno(usuario: UsuarioResposta):
    if usuario.perfil != "aluno":
        raise HTTPException(
            status_code=403,
            detail="Somente alunos podem enviar comprovantes.",
        )


# Envio multipart: permite selecionar um arquivo pelo /docs.
@router.post("/alunos/me/comprovante")
def enviar_comprovante(
    arquivo: UploadFile,
    usuario: UsuarioResposta = Depends(obter_usuario_atual),
):
    try:
        exigir_aluno(usuario)
        conteudo = arquivo.file.read(LIMITE_PDF + 1)
    finally:
        arquivo.file.close()

    return salvar_comprovante(usuario.id, conteudo)


# Envio direto dos bytes: será usado pelo aplicativo Android.
@router.put("/alunos/me/comprovante")
async def enviar_pdf_direto(
    request: Request,
    usuario: UsuarioResposta = Depends(obter_usuario_atual),
):
    exigir_aluno(usuario)

    conteudo = bytearray()

    async for parte in request.stream():
        if len(conteudo) + len(parte) > LIMITE_PDF:
            raise HTTPException(
                status_code=413,
                detail="O PDF deve ter no máximo 5 MB.",
            )

        conteudo.extend(parte)

    return await run_in_threadpool(
        salvar_comprovante,
        usuario.id,
        bytes(conteudo),
    )


# Consulta protegida: somente agentes aprovados.
@router.get("/prefeitura/alunos/{aluno_id}/comprovante")
def consultar_comprovante(
    aluno_id: int,
    agente: UsuarioResposta = Depends(exigir_agente),
):
    with Session(engine) as sessao:
        aluno = sessao.get(Usuario, aluno_id)

        if aluno is None or aluno.perfil != "aluno":
            raise HTTPException(
                status_code=404,
                detail="Aluno não encontrado.",
            )

        if aluno.comprovante_pdf is None:
            raise HTTPException(
                status_code=404,
                detail="Esse aluno ainda não enviou comprovante.",
            )

        return Response(
            content=aluno.comprovante_pdf,
            media_type="application/pdf",
            headers={
                "Content-Disposition":
                    f'inline; filename="comprovante-{aluno_id}.pdf"',
                "Cache-Control": "no-store",
                "X-Content-Type-Options": "nosniff",
            },
        )