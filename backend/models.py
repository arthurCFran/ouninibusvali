from datetime import datetime, timezone

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    LargeBinary,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Usuario(Base):
    __tablename__ = "usuarios"

    __table_args__ = (
        CheckConstraint(
            "perfil IN ('aluno', 'motorista', 'agente')",
            name="ck_usuario_perfil",
        ),
        CheckConstraint(
            "status IN ('pendente', 'aprovado', 'rejeitado')",
            name="ck_usuario_status",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    nome: Mapped[str] = mapped_column(String(150))

    email: Mapped[str] = mapped_column(
        String(254),
        unique=True,
    )

    cpf: Mapped[str] = mapped_column(
        String(11),
        unique=True,
    )

    matricula: Mapped[str] = mapped_column(
        String(30),
        unique=True,
    )

    senha_hash: Mapped[str] = mapped_column(String(255))

    perfil: Mapped[str] = mapped_column(
        String(20),
        default="aluno",
    )

    status: Mapped[str] = mapped_column(
        String(20),
        default="pendente",
    )

    comprovante_pdf: Mapped[bytes | None] = mapped_column(
        LargeBinary,
        nullable=True,
    )


class Rota(Base):
    __tablename__ = "rotas"

    id: Mapped[int] = mapped_column(primary_key=True)

    nome: Mapped[str] = mapped_column(String(150))

    origem: Mapped[str] = mapped_column(String(150))

    destino: Mapped[str] = mapped_column(String(150))


class Onibus(Base):
    __tablename__ = "onibus"

    __table_args__ = (
        CheckConstraint(
            "capacidade > 0",
            name="ck_onibus_capacidade",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    placa: Mapped[str] = mapped_column(
        String(7),
        unique=True,
    )

    capacidade: Mapped[int]


class Viagem(Base):
    __tablename__ = "viagens"

    __table_args__ = (
        CheckConstraint(
            "capacidade > 0",
            name="ck_viagem_capacidade",
        ),
        CheckConstraint(
            "status IN ('agendada', 'em_andamento', 'concluida')",
            name="ck_viagem_status",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    rota_id: Mapped[int] = mapped_column(
        ForeignKey("rotas.id", ondelete="RESTRICT"),
        index=True,
    )

    onibus_id: Mapped[int] = mapped_column(
        ForeignKey("onibus.id", ondelete="RESTRICT"),
        index=True,
    )

    partida: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        index=True,
    )

    # Copiada do ônibus ao cadastrar a viagem.
    capacidade: Mapped[int]

    status: Mapped[str] = mapped_column(
        String(20),
        default="agendada",
    )


class Reserva(Base):
    __tablename__ = "reservas"

    __table_args__ = (
        UniqueConstraint(
            "aluno_id",
            "viagem_id",
            name="uq_reserva_aluno_viagem",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)

    aluno_id: Mapped[int] = mapped_column(
        ForeignKey("usuarios.id", ondelete="RESTRICT"),
        index=True,
    )

    viagem_id: Mapped[int] = mapped_column(
        ForeignKey("viagens.id", ondelete="RESTRICT"),
        index=True,
    )

    criada_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )