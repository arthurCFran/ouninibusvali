
# DATABASE_URL: configura a conexão com o PostgreSQL online.
# DB_PASSWORD: senha utilizada no PostgreSQL local.
# engine: gerencia as conexões com o banco.
# testar_conexao(): verifica se o banco está acessível.

import os

from sqlalchemy import URL, create_engine, text

DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    url = DATABASE_URL

    if url.startswith("postgresql://"):
        url = url.replace(
            "postgresql://",
            "postgresql+psycopg://",
            1
        )
else:
    url = URL.create(
        drivername="postgresql+psycopg",
        username="postgres",
        password=os.environ["DB_PASSWORD"],
        host="127.0.0.1",
        port=5432,
        database="ouninibusvali",
    )

engine = create_engine(
    url,
    pool_pre_ping=True,
    connect_args={"connect_timeout": 5},
)


def testar_conexao():
    with engine.connect() as conexao:
        conexao.execute(text("SELECT 1"))
