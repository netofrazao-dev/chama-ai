import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuth } from '@/stores/authStore'
import { useUi } from '@/stores/uiStore'
import { AppShell } from '@/components/layout/AppShell'
import { LoginGate } from '@/components/LoginGate'
import { Vitrine } from '@/features/vitrine/Vitrine'
import { Busca } from '@/features/prestador/Busca'
import { Perfil } from '@/features/prestador/Perfil'
import { Botao } from '@/components/ui'
import { LogIn } from 'lucide-react'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1 } },
})

// Tela que exige login: se não estiver logado, convida a entrar (sem bloquear o app).
function ExigeLogin({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const usuario = useAuth((s) => s.usuario)
  const pedirLogin = useUi((s) => s.pedirLogin)
  const { pathname } = useLocation()

  if (usuario) return <>{children}</>

  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-lg font-bold">{titulo}</p>
      <p className="text-tinta-suave">Entre com seu número para ver isso aqui.</p>
      <Botao variante="principal" icone={<LogIn />} onClick={() => pedirLogin('Entre para continuar')}>
        Entrar
      </Botao>
      <span className="sr-only">{pathname}</span>
    </div>
  )
}

// Placeholder das telas que chegam no Milestone 1.
function EmBreve({ nome }: { nome: string }) {
  return (
    <div className="flex min-h-[50dvh] flex-col items-center justify-center text-center">
      <p className="text-lg font-bold">{nome}</p>
      <p className="mt-1 text-tinta-suave">Essa parte chega no próximo passo.</p>
    </div>
  )
}

function AppInterno() {
  const { carregando, iniciar } = useAuth()

  useEffect(() => {
    iniciar()
  }, [iniciar])

  if (carregando) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-areia">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-igarape/20 border-t-igarape" />
      </div>
    )
  }

  return (
    <>
      <AppShell>
        <Routes>
          {/* A vitrine é pública — abre já mostrando gente e serviços. */}
          <Route path="/" element={<Vitrine />} />
          <Route path="/buscar" element={<Busca />} />
          <Route
            path="/pedidos"
            element={
              <ExigeLogin titulo="Meus pedidos">
                <EmBreve nome="Meus pedidos" />
              </ExigeLogin>
            }
          />
          <Route
            path="/perfil"
            element={
              <ExigeLogin titulo="Meu perfil">
                <Perfil />
              </ExigeLogin>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>

      {/* Portão de login: aparece só quando a pessoa quer interagir. */}
      <LoginGate />
    </>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppInterno />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
