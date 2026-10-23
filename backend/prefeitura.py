from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from autenticacao import obter_usuario_atual
from database import engine
from models import Usuario
from schemas import UsuarioResposta


router = APIRouter(
    prefix="/prefeitura",
    tags=["Prefeitura"],
)


def exigir_agente(
    usuario: UsuarioResposta = Depends(obter_usuario_atual),
):
    if usuario.perfil != "agente" or usuario.status != "aprovado":
        raise HTTPException(
            status_code=403,
            detail="Acesso permitido somente a agentes aprovados.",
        )

    return usuario


class DecisaoCadastro(BaseModel):
    status: Literal["aprovado", "rejeitado"]


@router.get(
    "/alunos/pendentes",
    response_model=list[UsuarioResposta],
)
def listar_alunos_pendentes(
    agente: UsuarioResposta = Depends(exigir_agente),
):
    with Session(engine) as sessao:
        alunos = sessao.scalars(
            select(Usuario)
            .where(
                Usuario.perfil == "aluno",
                Usuario.status == "pendente",
            )
            .order_by(Usuario.id)
        ).all()

        return [
            UsuarioResposta.model_validate(aluno)
            for aluno in alunos
        ]


@router.patch(
    "/alunos/{aluno_id}/status",
    response_model=UsuarioResposta,
)
def analisar_cadastro(
    aluno_id: int,
    decisao: DecisaoCadastro,
    agente: UsuarioResposta = Depends(exigir_agente),
):
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

        if aluno.comprovante_pdf is None:
            raise HTTPException(
                status_code=409,
                detail="O aluno ainda não enviou comprovante.",
            )

        if aluno.status != "pendente":
            raise HTTPException(
                status_code=409,
                detail="Esse cadastro já foi analisado.",
            )

        aluno.status = decisao.status

        sessao.commit()
        sessao.refresh(aluno)

        return UsuarioResposta.model_validate(aluno)