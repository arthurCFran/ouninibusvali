// Usuario: dados públicos do usuário retornados pela API.
// LoginResposta: estrutura do retorno da autenticação.

export type Usuario = {
  id: number
  nome: string
  email: string
  perfil: string
  status: string
  cpf?: string
  matricula_academica?: string | null
  matricula_funcional?: string | null
  matricula?: string | null
}

export type LoginResposta = {
  access_token: string
  token_type: string
  usuario: Usuario
}

export type DecisaoCadastro = 'aprovado' | 'rejeitado'
export type Pagina = 'inicio' | 'estudantes'
