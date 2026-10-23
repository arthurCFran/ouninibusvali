from getpass import getpass

import bcrypt
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import engine
from models import Usuario
from schemas import CadastroAluno


def criar_agente():
    print("Criação do agente da Prefeitura")

    dados = CadastroAluno(
        nome=input("Nome: "),
        email=input("E-mail: "),
        cpf=input("CPF com 11 dígitos, sem pontuação: "),
        matricula=input("Matrícula do agente: "),
        senha=getpass("Senha com pelo menos 8 caracteres: "),
    )

    confirmacao = getpass("Confirme a senha: ")

    if dados.senha != confirmacao:
        print("As senhas não conferem. Nenhum agente foi criado.")
        return

    with Session(engine) as sessao:
        existente = sessao.scalar(
            select(Usuario).where(
                Usuario.email == str(dados.email)
            )
        )

        if existente:
            print("Esse e-mail já está cadastrado.")
            return

        agente = Usuario(
            nome=dados.nome,
            email=str(dados.email),
            cpf=dados.cpf,
            matricula=dados.matricula,
            senha_hash=bcrypt.hashpw(
                dados.senha.encode("utf-8"),
                bcrypt.gensalt(rounds=12),
            ).decode("utf-8"),
            perfil="agente",
            status="aprovado",
        )

        sessao.add(agente)

        try:
            sessao.commit()
        except IntegrityError:
            sessao.rollback()
            print("E-mail, CPF ou matrícula já cadastrado.")
            return

        print("Agente criado com sucesso.")


if __name__ == "__main__":
    criar_agente()