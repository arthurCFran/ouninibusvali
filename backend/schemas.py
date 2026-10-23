from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
)


class CadastroAluno(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nome: str = Field(min_length=3, max_length=150)
    email: EmailStr = Field(max_length=254)
    cpf: str = Field(pattern=r"^[0-9]{11}$")
    matricula: str = Field(min_length=1, max_length=30)
    senha: str = Field(min_length=8, max_length=72)

    @field_validator("nome", "matricula", mode="before")
    @classmethod
    def remover_espacos(cls, valor):
        return valor.strip() if isinstance(valor, str) else valor

    @field_validator("email", mode="before")
    @classmethod
    def normalizar_email(cls, valor):
        return valor.strip().lower() if isinstance(valor, str) else valor

    @field_validator("senha")
    @classmethod
    def limitar_bytes_senha(cls, valor):
        if len(valor.encode("utf-8")) > 72:
            raise ValueError("A senha deve ter no máximo 72 bytes.")
        return valor


class UsuarioResposta(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    nome: str
    email: str
    perfil: str
    status: str