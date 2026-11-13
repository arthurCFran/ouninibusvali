// App: controla a navegação e conecta as páginas à lógica administrativa.

import { Cabecalho } from './components/Cabecalho'
import { ComprovanteModal } from './components/ComprovanteModal'
import { usePrefeitura } from './hooks/usePrefeitura'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { EstudantesPage } from './pages/EstudantesPage'
import './styles/App.css'

function App() {
  const controller = usePrefeitura()
  if (!controller.usuario || !controller.token) {
    return <LoginPage erro={controller.erro} carregando={controller.carregando} onEntrar={controller.login} />
  }
  return (
    <main className="painel">
      <Cabecalho usuario={controller.usuario} onSair={controller.sair} />
      <section className="conteudo">
        {controller.pagina === 'inicio'
          ? <DashboardPage usuario={controller.usuario}
            onAbrirEstudantes={() => controller.abrirPagina('estudantes')} />
          : <EstudantesPage controller={controller} />}
      </section>
      {controller.comprovante && <ComprovanteModal comprovante={controller.comprovante}
        onFechar={controller.fecharComprovante} />}
    </main>
  )
}

export default App
