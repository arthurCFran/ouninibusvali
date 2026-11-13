// ComprovanteModal: visualiza o PDF temporário sem armazenar o JWT na URL.

import { useEffect } from 'react'
import type { Usuario } from '../types/usuario'

type Props = {
  comprovante: { aluno: Usuario; url: string }
  onFechar: () => void
}

export function ComprovanteModal({ comprovante, onFechar }: Props) {
  useEffect(() => {
    function fecharComEscape(evento: KeyboardEvent) {
      if (evento.key === 'Escape') onFechar()
    }
    window.addEventListener('keydown', fecharComEscape)
    return () => window.removeEventListener('keydown', fecharComEscape)
  }, [onFechar])

  return (
    <div className="modal-fundo" onMouseDown={onFechar}>
      <section className="modal-pdf" role="dialog" aria-modal="true"
        aria-label={`Comprovante de ${comprovante.aluno.nome}`}
        onMouseDown={evento => evento.stopPropagation()}>
        <header className="modal-cabecalho">
          <div><h2>Comprovante de matrícula</h2><p>{comprovante.aluno.nome}</p></div>
          <button type="button" onClick={onFechar} autoFocus>Fechar</button>
        </header>
        <iframe className="visualizador-pdf" src={comprovante.url}
          title={`PDF de ${comprovante.aluno.nome}`} />
      </section>
    </div>
  )
}
