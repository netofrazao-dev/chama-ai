import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { configFaltando } from '@/lib/supabase'
import { useAuth } from '@/stores/authStore'
import { useUi } from '@/stores/uiStore'
import { AppShell } from '@/components/layout/AppShell'
import { LoginGate } from '@/components/LoginGate'
import { Vitrine } from '@/features/vitrine/Vitrine'
import { Busca } from '@/features/prestador/Busca'
import { Perfil } from '@/features/prestador/Perfil'
import { PedidosETrabalhos } from '@/features/cliente/PedidosETrabalhos'
import { PerfilPrestador } from '@/features/prestador/PerfilPrestador'
import { DetalhePedido } from '@/features/prestador/DetalhePedido'
import { PedirServico } from '@/features/cliente/PedirServico'
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

// Wrapper do fluxo de pedir serviço, pra ligar os botões de voltar/concluir.
function RotaPedir() {
  const navegar = useNavigate()
  return (
    <PedirServico
      aoConcluir={() => navegar('/pedidos')}
      aoCancelar={() => navegar('/')}
    />
  )
}

// Tela de ajuda quando falta configuração — melhor que tela branca.
function ConfigFaltando() {
  return (
    <div className="tela flex min-h-dvh flex-col justify-center gap-3 py-10">
      <h1 className="text-xl">Falta configurar o acesso</h1>
      <p className="text-tinta-suave">
        O app não achou o endereço e a chave do Supabase.
      </p>
      <div className="rounded-2xl bg-white p-4 shadow-card">
        <p className="font-bold">No seu computador</p>
        <p className="text-tinta-suave">
          Copie <code>.env.example</code> para <code>.env.local</code> e preencha
          <code> VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code>.
        </p>
      </div>
      <div className="rounded-2xl bg-white p-4 shadow-card">
        <p className="font-bold">Na Vercel</p>
        <p className="text-tinta-suave">
          Settings → Environment Variables, adicione as duas, e refaça o deploy.
          Variáveis <code>VITE_</code> entram no app no momento do build, então
          um deploy novo é obrigatório depois de adicioná-las.
        </p>
      </div>
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
          {/* Perfil do profissional é público — ver não exige login. */}
          <Route path="/prestador/:id" element={<PerfilPrestador />} />
          {/* Responder a um pedido exige login (é onde se manda o preço). */}
          <Route
            path="/pedido/:id"
            element={
              <ExigeLogin titulo="Este pedido">
                <DetalhePedido />
              </ExigeLogin>
            }
          />
          <Route
            path="/pedidos"
            element={
              <ExigeLogin titulo="Meus pedidos">
                <PedidosETrabalhos />
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
          <Route
            path="/pedir"
            element={
              <ExigeLogin titulo="Pedir um serviço">
                <RotaPedir />
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
  if (configFaltando) return <ConfigFaltando />
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppInterno />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
