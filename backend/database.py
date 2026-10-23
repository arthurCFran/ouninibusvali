import os

from sqlalchemy import URL, create_engine, text

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