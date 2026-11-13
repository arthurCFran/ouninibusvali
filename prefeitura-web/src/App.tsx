import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

// API_URL: endereço da API online.
// login(): autentica o agente da prefeitura.
// carregarAlunos(): consulta estudantes pendentes.
// analisarAluno(): aprova ou rejeita um estudante.
// sair(): encerra a sessão administrativa.
// comprovante: armazena o PDF temporário para visualização.
// carregandoPdf: indica o carregamento do documento.
// comprovantesConsultados: identifica documentos abertos na sessão.
// fecharComprovante(): encerra a visualização do PDF.

const API_URL =
  import.meta.env.VITE_API_URL ||
  'https://ouninibusvali.onrender.com'

type Usuario = {
  id: number
  nome: string
  email: string
  cpf: string
  matricula: string
  perfil: string
  status: string
}

type LoginResposta = {
  access_token: string
  token_type: string
  usuario: Usuario
}

type Pagina = 'inicio' | 'estudantes'

function App() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')

  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [token, setToken] = useState<string | null>(null)

  const [pagina, setPagina] = useState<Pagina>('inicio')
  const [alunos, setAlunos] = useState<Usuario[]>([])

  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')

  const [carregando, setCarregando] = useState(false)
  const [carregandoAlunos, setCarregandoAlunos] = useState(false)
  const [falhaLista, setFalhaLista] = useState(false)
  const [analisandoId, setAnalisandoId] = useState<number | null>(null)

  const [comprovante, setComprovante] = useState<{
    aluno: Usuario
    url: string
  } | null>(null)

  const [carregandoPdf, setCarregandoPdf] = useState<number | null>(null)
  const [comprovantesConsultados, setComprovantesConsultados] =
    useState<number[]>([])

  useEffect(() => {
    return () => {
      if (comprovante) URL.revokeObjectURL(comprovante.url)
    }
  }, [comprovante])

  async function login(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()

    setErro('')
    setMensagem('')
    setCarregando(true)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 60000)

    try {
      const resposta = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, senha }),
        signal: controller.signal,
      })

      if (!resposta.ok) {
        throw new Error(
          resposta.status === 401
            ? 'E-mail ou senha incorretos.'
            : 'Não foi possível realizar o login.'
        )
      }

      const dados: LoginResposta = await resposta.json()

      if (
        dados.usuario.perfil !== 'agente' ||
        dados.usuario.status !== 'aprovado'
      ) {
        throw new Error(
          'Acesso permitido somente a agentes aprovados.'
        )
      }

      setUsuario(dados.usuario)
      setToken(dados.access_token)
      setSenha('')
      setPagina('inicio')
    } catch (error) {
      setErro(
        error instanceof Error && error.name === 'AbortError'
          ? 'Tempo de conexão esgotado.'
          : error instanceof Error
            ? error.message
            : 'Erro ao realizar login.'
      )
    } finally {
      clearTimeout(timeout)
      setCarregando(false)
    }
  }

  async function carregarAlunos(tokenAtual: string) {
    setCarregandoAlunos(true)
    setFalhaLista(false)
    setErro('')

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 60000)

    try {
      const resposta = await fetch(
        `${API_URL}/prefeitura/alunos/pendentes`,
        {
          headers: {
            Authorization: `Bearer ${tokenAtual}`,
          },
          signal: controller.signal,
        }
      )

      if (resposta.status === 401) {
        throw new Error(
          'Sessão expirada. Saia do painel e entre novamente.'
        )
      }

      if (resposta.status === 403) {
        throw new Error(
          'Você não possui permissão para consultar estudantes.'
        )
      }

      if (!resposta.ok) {
        throw new Error('Não foi possível carregar os estudantes.')
      }

      const dados: Usuario[] = await resposta.json()
      setAlunos(dados)
    } catch (error) {
      setFalhaLista(true)
      setErro(
        error instanceof Error
          ? error.name === 'AbortError'
            ? 'A consulta demorou demais. Tente novamente.'
            : error.message
          : 'Erro ao consultar estudantes.'
      )
    } finally {
      clearTimeout(timeout)
      setCarregandoAlunos(false)
    }
  }

  useEffect(() => {
    if (pagina === 'estudantes' && token) {
      void carregarAlunos(token)
    }
  }, [pagina, token])


  // visualizarComprovante(): consulta o PDF autenticado do aluno.
  async function visualizarComprovante(aluno: Usuario) {
    if (!token) return

    setErro('')
    setCarregandoPdf(aluno.id)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 60000)

    try {
      const resposta = await fetch(
        `${API_URL}/prefeitura/alunos/${aluno.id}/comprovante`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: 'no-store',
          signal: controller.signal,
        }
      )

      if (!resposta.ok) {
        throw new Error(
          resposta.status === 404
            ? 'Este estudante ainda não enviou o comprovante.'
            : resposta.status === 401 || resposta.status === 403
              ? 'Acesso não autorizado. Entre novamente.'
              : 'Não foi possível carregar o comprovante.'
        )
      }

      const arquivo = await resposta.blob()

      if (!arquivo.type.includes('application/pdf')) {
        throw new Error('O documento retornado não é um PDF.')
      }

      const url = URL.createObjectURL(arquivo)

      setComprovante({ aluno, url })
      setComprovantesConsultados(anteriores =>
        anteriores.includes(aluno.id)
          ? anteriores
          : [...anteriores, aluno.id]
      )
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.name === 'AbortError'
            ? 'Tempo esgotado ao carregar o documento.'
            : error.message
          : 'Erro ao consultar o PDF.'
      )
    } finally {
      clearTimeout(timeout)
      setCarregandoPdf(null)
    }
  }

  function fecharComprovante() {
    setComprovante(null)
  }

  async function analisarAluno(
    aluno: Usuario,
    decisao: 'aprovado' | 'rejeitado'
  ) {
    if (!token || !comprovantesConsultados.includes(aluno.id)) {
      setErro('Visualize o comprovante antes de analisar o cadastro.')
      return
    }

    const verbo = decisao === 'aprovado' ? 'aprovar' : 'rejeitar'

    const confirmado = window.confirm(
      `Deseja ${verbo} o cadastro de ${aluno.nome}?`
    )

    if (!confirmado) return

    setAnalisandoId(aluno.id)
    setErro('')
    setMensagem('')

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 60000)

    try {
      const resposta = await fetch(
        `${API_URL}/prefeitura/alunos/${aluno.id}/status`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: decisao,
          }),
          signal: controller.signal,
        }
      )

      if (!resposta.ok) {
        let detalhe = 'Não foi possível analisar o cadastro.'

        if (resposta.status === 401) {
          detalhe = 'Sessão expirada. Entre novamente.'
        } else if (resposta.status === 403) {
          detalhe = 'Você não tem permissão para esta operação.'
        } else if (resposta.status === 409) {
          detalhe =
            'O cadastro já foi analisado ou não possui comprovante PDF.'
        } else if (resposta.status === 404) {
          detalhe = 'Estudante não encontrado.'
        }

        throw new Error(detalhe)
      }

      setAlunos(anteriores =>
        anteriores.filter(item => item.id !== aluno.id)
      )
      setComprovantesConsultados(anteriores =>
        anteriores.filter(id => id !== aluno.id)
      )
      setComprovante(null)

      setMensagem(
        `Cadastro de ${aluno.nome} ${decisao === 'aprovado' ? 'aprovado' : 'rejeitado'
        } com sucesso.`
      )
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.name === 'AbortError'
            ? 'Tempo de conexão esgotado. Atualize a lista para verificar o resultado.'
            : error.message
          : 'Erro ao analisar o cadastro.'
      )
    } finally {
      clearTimeout(timeout)
      setAnalisandoId(null)
    }
  }

  function abrirPagina(novaPagina: Pagina) {
    setErro('')
    setMensagem('')
    setComprovante(null)
    setPagina(novaPagina)
  }

  function sair() {
    setUsuario(null)
    setToken(null)
    setSenha('')
    setAlunos([])
    setComprovante(null)
    setComprovantesConsultados([])
    setPagina('inicio')
    setErro('')
    setMensagem('')
  }

  if (!usuario || !token) {
    return (
      <main className="pagina-login">
        <section className="login-card">
          <div className="logo">OU</div>

          <h1>OUninibusvali</h1>
          <p className="subtitulo">Painel da Prefeitura</p>

          <h2>Acesso administrativo</h2>
          <p>Entre com suas credenciais de agente.</p>

          <form onSubmit={login}>
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Seu e-mail"
              autoComplete="username"
              required
            />

            <label htmlFor="senha">Senha</label>
            <input
              id="senha"
              type="password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              placeholder="Sua senha"
              autoComplete="current-password"
              required
            />

            {erro && <p className="erro" role="alert">{erro}</p>}

            <button type="submit" disabled={carregando}>
              {carregando ? 'Entrando...' : 'Entrar no painel'}
            </button>
          </form>

          <footer>Acesso exclusivo a agentes autorizados.</footer>
        </section>
      </main>
    )
  }

  return (
    <main className="painel">
      <header className="cabecalho">
        <div className="marca">
          <span className="logo">OU</span>
          <strong>OUninibusvali</strong>
        </div>

        <div className="usuario-cabecalho">
          <span>{usuario.nome}</span>
          <button className="botao-sair" onClick={sair}>
            Sair
          </button>
        </div>
      </header>

      <section className="conteudo">
        {pagina === 'inicio' ? (
          <>
            <span className="etiqueta">Painel da Prefeitura</span>

            <h1>Bem-vindo, {usuario.nome}</h1>
            <p>Gerencie o transporte universitário.</p>

            <div className="opcoes">
              <button
                className="opcao opcao-ativa"
                onClick={() => abrirPagina('estudantes')}
              >
                <span>01</span>
                <h2>Estudantes</h2>
                <p>Analisar e aprovar cadastros.</p>
                <strong>Acessar →</strong>
              </button>

              <article className="opcao">
                <span>02</span>
                <h2>Motoristas</h2>
                <p>Cadastrar e consultar motoristas.</p>
                <small>Em desenvolvimento</small>
              </article>

              <article className="opcao">
                <span>03</span>
                <h2>Agentes</h2>
                <p>Gerenciar usuários administrativos.</p>
                <small>Em desenvolvimento</small>
              </article>
            </div>
          </>
        ) : (
          <>
            <button
              className="voltar"
              onClick={() => abrirPagina('inicio')}
            >
              ← Voltar ao painel
            </button>

            <div className="titulo-secao">
              <div>
                <span className="etiqueta">Gerenciamento</span>
                <h1>Cadastros pendentes</h1>
                <p>
                  Analise as solicitações dos estudantes.
                </p>
              </div>

              <button
                className="botao-atualizar"
                onClick={() => void carregarAlunos(token)}
                disabled={carregandoAlunos || analisandoId !== null}
              >
                Atualizar lista
              </button>
            </div>

            {erro && <p className="alerta erro" role="alert">{erro}</p>}
            {mensagem && (
              <p className="alerta sucesso" role="status">{mensagem}</p>
            )}

            {carregandoAlunos ? (
              <div className="estado-lista">
                Carregando estudantes...
              </div>
            ) : falhaLista ? (
              <div className="estado-lista">Não foi possível atualizar a lista. Tente novamente.</div>
            ) : alunos.length === 0 ? (
              <div className="estado-lista">
                Nenhum estudante pendente encontrado.
              </div>
            ) : (
              <div className="lista-alunos">
                {alunos.map(aluno => (
                  <article className="aluno-card" key={aluno.id}>
                    <div className="aluno-topo">
                      <div>
                        <h2>{aluno.nome}</h2>
                        <p>{aluno.email}</p>
                      </div>

                      <span className="status-pendente">
                        Pendente
                      </span>
                    </div>

                    <div className="dados-aluno">
                      <div>
                        <small>Matrícula</small>
                        <strong>{aluno.matricula}</strong>
                      </div>

                      <div>
                        <small>CPF</small>
                        <strong>{aluno.cpf}</strong>
                      </div>
                    </div>

                    <div className="acoes-aluno">

                      <button
                        className="botao-comprovante"
                        disabled={carregandoPdf !== null || analisandoId !== null}
                        onClick={() => void visualizarComprovante(aluno)}
                      >
                        {carregandoPdf === aluno.id
                          ? 'Carregando PDF...'
                          : 'Visualizar comprovante'}
                      </button>

                      <button
                        className="botao-aprovar"
                        disabled={analisandoId !== null || carregandoAlunos || !comprovantesConsultados.includes(aluno.id)}
                        onClick={() =>
                          void analisarAluno(aluno, 'aprovado')
                        }
                      >
                        {analisandoId === aluno.id
                          ? 'Processando...'
                          : 'Aprovar'}
                      </button>

                      <button
                        className="botao-rejeitar"
                        disabled={analisandoId !== null || carregandoAlunos || !comprovantesConsultados.includes(aluno.id)}
                        onClick={() =>
                          void analisarAluno(aluno, 'rejeitado')
                        }
                      >
                        Rejeitar
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {comprovante && (
        <div className="modal-fundo" onMouseDown={fecharComprovante}>
          <section
            className="modal-pdf"
            role="dialog"
            aria-modal="true"
            aria-label={`Comprovante de ${comprovante.aluno.nome}`}
            onMouseDown={evento => evento.stopPropagation()}
          >
            <header className="modal-cabecalho">
              <div>
                <h2>Comprovante de matrícula</h2>
                <p>{comprovante.aluno.nome}</p>
              </div>
              <button type="button" onClick={fecharComprovante}>
                Fechar
              </button>
            </header>
            <iframe
              className="visualizador-pdf"
              src={comprovante.url}
              title={`PDF de ${comprovante.aluno.nome}`}
            />
          </section>
        </div>
      )}
    </main>
  )
}

export default App
