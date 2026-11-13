// EstudantesPage: exibe estudantes pendentes e encaminha ações para o controlador.

import type { PrefeituraController } from '../hooks/usePrefeitura'
import { AlunoCard } from '../components/AlunoCard'

export function EstudantesPage({ controller }: { controller: PrefeituraController }) {
  const { token, alunos, erro, mensagem, carregandoAlunos, falhaLista, carregandoPdf,
    analisandoId, comprovantesConsultados, carregarAlunos, visualizarComprovante,
    analisarAluno, abrirPagina } = controller

  return (
    <>
      <button className="voltar" onClick={() => abrirPagina('inicio')}>← Voltar ao painel</button>
      <div className="titulo-secao">
        <div>
          <span className="etiqueta">Gerenciamento</span>
          <h1>Cadastros pendentes</h1>
          <p>Analise as solicitações dos estudantes.</p>
        </div>
        <button className="botao-atualizar" onClick={() => { if (token) void carregarAlunos(token) }}
          disabled={carregandoAlunos || analisandoId !== null}>Atualizar lista</button>
      </div>
      {erro && <p className="alerta erro" role="alert">{erro}</p>}
      {mensagem && <p className="alerta sucesso" role="status">{mensagem}</p>}
      {carregandoAlunos ? (
        <div className="estado-lista">Carregando estudantes...</div>
      ) : falhaLista ? (
        <div className="estado-lista">Não foi possível atualizar a lista. Tente novamente.</div>
      ) : alunos.length === 0 ? (
        <div className="estado-lista">Nenhum estudante pendente encontrado.</div>
      ) : (
        <div className="lista-alunos">
          {alunos.map(aluno => <AlunoCard key={aluno.id} aluno={aluno}
            carregandoPdf={carregandoPdf} analisandoId={analisandoId}
            carregandoAlunos={carregandoAlunos}
            comprovanteConsultado={comprovantesConsultados.includes(aluno.id)}
            onVisualizar={alunoAtual => void visualizarComprovante(alunoAtual)}
            onAnalisar={(alunoAtual, decisao) => void analisarAluno(alunoAtual, decisao)} />)}
        </div>
      )}
    </>
  )
}
