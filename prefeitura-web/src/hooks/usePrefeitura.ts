// usePrefeitura(): centraliza autenticação e ações administrativas.
// visualizarComprovante(): mantém a URL temporária do PDF apenas durante a visualização.
// analisarAluno(): exige documento aberto antes de enviar a decisão.

import { useEffect, useState } from 'react'
import type { DecisaoCadastro, Pagina, Usuario } from '../types/usuario'
import { autenticarAgente } from '../services/authService'
import { decidirCadastro, listarPendentes, obterComprovante } from '../services/estudantesService'
import { descricaoErro } from '../services/api'

export function usePrefeitura() {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [pagina, setPagina] = useState<Pagina>('inicio')
  const [alunos, setAlunos] = useState<Usuario[]>([])
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [carregandoAlunos, setCarregandoAlunos] = useState(false)
  const [falhaLista, setFalhaLista] = useState(false)
  const [carregandoPdf, setCarregandoPdf] = useState<number | null>(null)
  const [analisandoId, setAnalisandoId] = useState<number | null>(null)
  const [comprovante, setComprovante] = useState<{ aluno: Usuario; url: string } | null>(null)
  const [comprovantesConsultados, setComprovantesConsultados] = useState<number[]>([])

  useEffect(() => () => {
    if (comprovante) URL.revokeObjectURL(comprovante.url)
  }, [comprovante])

  async function login(email: string, senha: string) {
    setCarregando(true)
    setErro('')
    setMensagem('')
    try {
      const dados = await autenticarAgente(email, senha)
      setUsuario(dados.usuario)
      setToken(dados.access_token)
      setPagina('inicio')
    } catch (e) {
      setErro(descricaoErro(e, 'Erro ao realizar login.'))
    } finally {
      setCarregando(false)
    }
  }

  async function carregarAlunos(tokenAtual: string) {
    setCarregandoAlunos(true)
    setFalhaLista(false)
    setErro('')
    try {
      const dados = await listarPendentes(tokenAtual)
      setAlunos(dados)
      setComprovantesConsultados([])
    } catch (e) {
      setFalhaLista(true)
      setErro(descricaoErro(e, 'Erro ao consultar estudantes.'))
    } finally {
      setCarregandoAlunos(false)
    }
  }

  useEffect(() => {
    if (pagina === 'estudantes' && token) void carregarAlunos(token)
    // Atualiza a lista ao entrar na página ou trocar a sessão.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagina, token])

  async function visualizarComprovante(aluno: Usuario) {
    if (!token) return
    setCarregandoPdf(aluno.id)
    setErro('')
    try {
      const arquivo = await obterComprovante(token, aluno.id)
      const url = URL.createObjectURL(arquivo)
      setComprovante({ aluno, url })
      setComprovantesConsultados(anteriores => anteriores.includes(aluno.id)
        ? anteriores : [...anteriores, aluno.id])
    } catch (e) {
      setErro(descricaoErro(e, 'Erro ao consultar o PDF.'))
    } finally {
      setCarregandoPdf(null)
    }
  }

  function fecharComprovante() { setComprovante(null) }

  async function analisarAluno(aluno: Usuario, decisao: DecisaoCadastro) {
    if (!token || !comprovantesConsultados.includes(aluno.id)) {
      setErro('Visualize o comprovante antes de analisar o cadastro.')
      return
    }
    const verbo = decisao === 'aprovado' ? 'aprovar' : 'rejeitar'
    if (!window.confirm(`Deseja ${verbo} o cadastro de ${aluno.nome}?`)) return
    setAnalisandoId(aluno.id)
    setErro('')
    setMensagem('')
    try {
      await decidirCadastro(token, aluno.id, decisao)
      setAlunos(anteriores => anteriores.filter(item => item.id !== aluno.id))
      setComprovantesConsultados(anteriores => anteriores.filter(id => id !== aluno.id))
      setComprovante(null)
      setMensagem(`Cadastro de ${aluno.nome} ${decisao} com sucesso.`)
    } catch (e) {
      setErro(descricaoErro(e, 'Erro ao analisar o cadastro. Atualize a lista para verificar o resultado.'))
    } finally {
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
    setAlunos([])
    setComprovante(null)
    setComprovantesConsultados([])
    setPagina('inicio')
    setErro('')
    setMensagem('')
  }

  return {
    usuario, token, pagina, alunos, erro, mensagem, carregando, carregandoAlunos,
    falhaLista, carregandoPdf, analisandoId, comprovante, comprovantesConsultados,
    login, carregarAlunos, visualizarComprovante, fecharComprovante,
    analisarAluno, abrirPagina, sair,
  }
}

export type PrefeituraController = ReturnType<typeof usePrefeitura>
