// LoginPage: formulário visual para autenticação de agentes aprovados.

import { useState } from 'react'
import type { FormEvent } from 'react'

type Props = {
  erro: string
  carregando: boolean
  onEntrar: (email: string, senha: string) => Promise<void>
}

export function LoginPage({ erro, carregando, onEntrar }: Props) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    await onEntrar(email, senha)
    setSenha('')
  }

  return (
    <main className="pagina-login">
      <section className="login-card">
        <div className="logo">OU</div>
        <h1>OUninibusvali</h1>
        <p className="subtitulo">Painel da Prefeitura</p>
        <h2>Acesso administrativo</h2>
        <p>Entre com suas credenciais de agente.</p>
        <form onSubmit={evento => void enviar(evento)}>
          <label htmlFor="email">E-mail</label>
          <input id="email" type="email" value={email} autoComplete="username"
            placeholder="Seu e-mail" onChange={evento => setEmail(evento.target.value)} required />
          <label htmlFor="senha">Senha</label>
          <input id="senha" type="password" value={senha} autoComplete="current-password"
            placeholder="Sua senha" onChange={evento => setSenha(evento.target.value)} required />
          {erro && <p className="erro" role="alert">{erro}</p>}
          <button type="submit" disabled={carregando}>{carregando ? 'Entrando...' : 'Entrar no painel'}</button>
        </form>
        <footer>Acesso exclusivo a agentes autorizados.</footer>
      </section>
    </main>
  )
}
