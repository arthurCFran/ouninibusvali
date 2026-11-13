// listarPendentes(): consulta estudantes aguardando análise.
// obterComprovante(): carrega PDF com autenticação JWT.
// decidirCadastro(): aprova ou rejeita um estudante.

import type { DecisaoCadastro, Usuario } from '../types/usuario'
import { detalheHttp, requisitar } from './api'

function autenticar(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` }
}

export async function listarPendentes(token: string): Promise<Usuario[]> {
  const resposta = await requisitar('/prefeitura/alunos/pendentes', {
    headers: autenticar(token),
    cache: 'no-store',
  })
  if (resposta.status === 401) throw new Error('Sessão expirada. Saia do painel e entre novamente.')
  if (resposta.status === 403) throw new Error('Você não possui permissão para consultar estudantes.')
  if (!resposta.ok) throw new Error(await detalheHttp(resposta, 'Não foi possível carregar os estudantes.'))
  return resposta.json() as Promise<Usuario[]>
}

export async function obterComprovante(token: string, alunoId: number): Promise<Blob> {
  const resposta = await requisitar(`/prefeitura/alunos/${alunoId}/comprovante`, {
    headers: autenticar(token),
    cache: 'no-store',
  })
  if (!resposta.ok) {
    throw new Error(await detalheHttp(resposta, resposta.status === 404
      ? 'Este estudante ainda não enviou o comprovante.'
      : 'Não foi possível carregar o comprovante.'))
  }
  const arquivo = await resposta.blob()
  if (!arquivo.type.includes('application/pdf')) throw new Error('O documento retornado não é um PDF.')
  return arquivo
}

export async function decidirCadastro(token: string, alunoId: number, status: DecisaoCadastro): Promise<void> {
  const resposta = await requisitar(`/prefeitura/alunos/${alunoId}/status`, {
    method: 'PATCH',
    headers: { ...autenticar(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
  if (!resposta.ok) throw new Error(await detalheHttp(resposta, 'Não foi possível analisar o cadastro.'))
}
