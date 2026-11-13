// Cabecalho: exibe a identidade do projeto e permite encerrar a sessão.

import type { Usuario } from '../types/usuario'

type Props = { usuario: Usuario; onSair: () => void }

export function Cabecalho({ usuario, onSair }: Props) {
  return (
    <header className="cabecalho">
      <div className="marca"><span className="logo">OU</span><strong>OUninibusvali</strong></div>
      <div className="usuario-cabecalho">
        <span>{usuario.nome}</span>
        <button type="button" className="botao-sair" onClick={onSair}>Sair</button>
      </div>
    </header>
  )
}
