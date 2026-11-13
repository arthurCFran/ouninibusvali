// autenticarAgente(): valida credenciais e perfil administrativo.

import type { LoginResposta } from '../types/usuario'
import { requisitar } from './api'

export async function autenticarAgente(email: string, senha: string): Promise<LoginResposta> {
  const resposta = await requisitar('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim().toLowerCase(), senha }),
  })
  if (!resposta.ok) {
    throw new Error(resposta.status === 401 ? 'E-mail ou senha incorretos.' : 'Não foi possível realizar o login.')
  }
  const dados: LoginResposta = await resposta.json()
  if (!dados.access_token || dados.usuario.perfil !== 'agente' || dados.usuario.status !== 'aprovado') {
    throw new Error('Acesso permitido somente a agentes aprovados.')
  }
  return dados
}
