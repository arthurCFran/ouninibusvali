// DashboardPage: apresenta as áreas administrativas disponíveis no projeto.

import type { Usuario } from '../types/usuario'

type Props = { usuario: Usuario; onAbrirEstudantes: () => void }

export function DashboardPage({ usuario, onAbrirEstudantes }: Props) {
  return (
    <>
      <span className="etiqueta">Painel da Prefeitura</span>
      <h1>Bem-vindo, {usuario.nome}</h1>
      <p>Gerencie o transporte universitário.</p>
      <div className="opcoes">
        <button className="opcao opcao-ativa" onClick={onAbrirEstudantes}>
          <span>01</span><h2>Estudantes</h2><p>Analisar e aprovar cadastros.</p><strong>Acessar →</strong>
        </button>
        <article className="opcao"><span>02</span><h2>Motoristas</h2>
          <p>Cadastrar e consultar motoristas.</p><small>Em desenvolvimento</small></article>
        <article className="opcao"><span>03</span><h2>Agentes</h2>
          <p>Gerenciar usuários administrativos.</p><small>Em desenvolvimento</small></article>
      </div>
    </>
  )
}
