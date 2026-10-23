import bcrypt

from fastapi import APIRouter, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import engine
from models import Usuario
from schemas import CadastroAluno, UsuarioResposta

router = APIRouter(prefix="/alunos", tags=["Alunos"])


@router.post(
    "",
    response_model=UsuarioResposta,
    status_code=201,
)
def cadastrar_aluno(dados: CadastroAluno):
    senha_hash = bcrypt.hashpw(
        dados.senha.encode("utf-8"),
        bcrypt.gensalt(rounds=12),
    ).decode("utf-8")

    usuario = Usuario(
        nome=dados.nome,
        email=str(dados.email),
        cpf=dados.cpf,
        matricula=dados.matricula,
        senha_hash=senha_hash,
        perfil="aluno",
        status="pendente",
    )

    with Session(engine) as sessao:
        sessao.add(usuario)

        try:
            sessao.commit()
        except IntegrityError:
            sessao.rollback()
            raise HTTPException(
                status_code=409,
                detail="E-mail, CPF ou matrícula já cadastrado.",
            ) from None

        sessao.refresh(usuario)
        return UsuarioResposta.model_validate(usuario)