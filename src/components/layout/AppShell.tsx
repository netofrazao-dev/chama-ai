import { type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { Home, Search, ClipboardList, User } from 'lucide-react'

// Navegação inferior: 4 destinos, ícone grande + rótulo sempre visível.
// Nunca só ícone. O rótulo é o que ensina o caminho.
const abas = [
  { para: '/', rotulo: 'Início', icone: Home },
  { para: '/buscar', rotulo: 'Buscar', icone: Search },
  { para: '/pedidos', rotulo: 'Pedidos', icone: ClipboardList },
  { para: '/perfil', rotulo: 'Perfil', icone: User },
]

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-areia pb-24">
      <main className="tela pt-4">{children}</main>

      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-tinta/8 bg-white/95 backdrop-blur"
      >
        <div className="tela flex items-stretch justify-between">
          {abas.map(({ para, rotulo, icone: Icone }) => (
            <NavLink
              key={para}
              to={para}
              end={para === '/'}
              className={({ isActive }) =>
                [
                  'flex min-h-toque flex-1 flex-col items-center justify-center gap-0.5 py-2 text-sm font-bold',
                  isActive ? 'text-igarape' : 'text-tinta-suave',
                ].join(' ')
              }
            >
              <Icone className="h-6 w-6" />
              {rotulo}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
