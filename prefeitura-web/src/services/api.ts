// API_URL: endereço HTTPS do backend.
// requisitar(): executa requisições com limite de espera.
// descricaoErro(): traduz falhas de conexão.

export const API_URL = import.meta.env.VITE_API_URL || 'https://ouninibusvali.onrender.com'
const TIMEOUT_API = 60000

export async function requisitar(caminho: string, opcoes: RequestInit = {}): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_API)
  try {
    return await fetch(`${API_URL}${caminho}`, {
      ...opcoes,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }
}

export function descricaoErro(erro: unknown, mensagem: string): string {
  if (!(erro instanceof Error)) return mensagem
  if (erro.name === 'AbortError') return 'Tempo de conexão esgotado. Tente novamente.'
  if (erro instanceof TypeError && erro.message === 'Failed to fetch') {
    return 'Não foi possível conectar à API. Verifique a conexão e a disponibilidade do servidor.'
  }
  return erro.message
}

export async function detalheHttp(resposta: Response, padrao: string): Promise<string> {
  const dados: unknown = await resposta.json().catch(() => null)
  if (dados && typeof dados === 'object' && 'detail' in dados && typeof dados.detail === 'string') {
    return dados.detail
  }
  return padrao
}
