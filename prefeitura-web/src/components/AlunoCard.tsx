// AlunoCard: apresenta dados acadêmicos e ações de análise do cadastro.

import type { Usuario, DecisaoCadastro } from '../types/usuario'

type Props = {
  aluno: Usuario
  carregandoPdf: number | null
  analisandoId: number | null
  carregandoAlunos: boolean
  comprovanteConsultado: boolean
  onVisualizar: (aluno: Usuario) => void
  onAnalisar: (aluno: Usuario, decisao: DecisaoCadastro) => void
}

export function AlunoCard({ aluno, carregandoPdf, analisandoId, carregandoAlunos,
  comprovanteConsultado, onVisualizar, onAnalisar }: Props) {
  const bloqueado = analisandoId !== null || carregandoAlunos
  return (
    <article className="aluno-card">
      <div className="aluno-topo">
        <div><h2>{aluno.nome}</h2><p>{aluno.email}</p></div>
        <span className="status-pendente">Pendente</span>
      </div>
      <div className="dados-aluno">
        <div><small>Matrícula acadêmica</small><strong>{aluno.matricula_academica ?? aluno.matricula ?? 'Não informada'}</strong></div>
        {aluno.cpf && <div><small>CPF</small><strong>{aluno.cpf}</strong></div>}
      </div>
      <div className="acoes-aluno">
        <button type="button" className="botao-comprovante"
          disabled={carregandoPdf !== null || bloqueado} onClick={() => onVisualizar(aluno)}>
          {carregandoPdf === aluno.id ? 'Carregando PDF...' : 'Visualizar comprovante'}
        </button>
        <button type="button" className="botao-aprovar"
          disabled={bloqueado || !comprovanteConsultado}
          onClick={() => onAnalisar(aluno, 'aprovado')}>
          {analisandoId === aluno.id ? 'Processando...' : 'Aprovar'}
        </button>
        <button type="button" className="botao-rejeitar"
          disabled={bloqueado || !comprovanteConsultado}
          onClick={() => onAnalisar(aluno, 'rejeitado')}>Rejeitar</button>
      </div>
    </article>
  )
}
