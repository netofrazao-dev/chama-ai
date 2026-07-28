import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Search, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useUi } from '@/stores/uiStore'
import { useAuth } from '@/stores/authStore'
import { Botao } from '@/components/ui'
import { CardPrestador, CardPedido, type FeedPrestador, type FeedPedido } from './cards'
import type { Categoria } from '@/lib/database.types'

type Aba = 'prestadores' | 'pedidos'

export function Vitrine() {
  const [aba, setAba] = useState<Aba>('prestadores')
  const [cat, setCat] = useState<string | null>(null)
  const pedirLogin = useUi((s) => s.pedirLogin)
  const navegar = useNavigate()
  const usuario = useAuth((s) => s.usuario)

  const { data: categorias } = useQuery({
    queryKey: ['categorias'],
    queryFn: async () => {
      const { data } = await supabase.from('categorias').select('*').eq('ativa', true).order('ordem')
      return (data ?? []) as Categoria[]
    },
  })

  const { data: prestadores, isLoading: carregandoP } = useQuery({
    queryKey: ['feed_prestadores', cat],
    queryFn: async () => {
      let q = supabase.from('feed_prestadores').select('*')
      if (cat) q = q.contains('categorias_slugs', [cat])
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as FeedPrestador[]
    },
    enabled: aba === 'prestadores',
  })

  const { data: pedidos, isLoading: carregandoPed } = useQuery({
    queryKey: ['feed_pedidos', cat],
    queryFn: async () => {
      let q = supabase.from('feed_pedidos').select('*')
      if (cat) q = q.eq('categoria_slug', cat)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as FeedPedido[]
    },
    enabled: aba === 'pedidos',
  })

  function tocarPrestador(p: FeedPrestador) {
    // ver o perfil é livre — login só quando for interagir de verdade
    navegar(`/prestador/${p.id}`)
  }

  function tocarPedido(p: FeedPedido) {
    // responder a um pedido exige login (é onde se manda o preço)
    if (!usuario) {
      pedirLogin('Entre para oferecer esse serviço.', () => navegar(`/pedido/${p.id}`))
      return
    }
    navegar(`/pedido/${p.id}`)
  }

  function pedirServico() {
    // se não estiver logado, pede login e já leva ao fluxo depois de entrar
    if (!usuario) {
      pedirLogin('Entre para pedir um serviço.', () => navegar('/pedir'))
      return
    }
    navegar('/pedir')
  }

  return (
    <div className="space-y-4 pb-4">
      {/* Cabeçalho */}
      <header className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-xl leading-none">Chama Aí</h1>
          <p className="text-sm text-tinta-suave">Breves · Pará</p>
        </div>
        <button
          aria-label="Buscar"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-card"
        >
          <Search className="h-5 w-5 text-tinta" />
        </button>
      </header>

      {/* CTA principal — pedir serviço */}
      <Botao variante="acao" bloco icone={<Plus />} onClick={pedirServico}>
        Preciso de um serviço
      </Botao>

      {/* Abas */}
      <div className="flex rounded-2xl bg-areia-escura p-1">
        {(
          [
            ['prestadores', 'Quem faz'],
            ['pedidos', 'Precisa'],
          ] as [Aba, string][]
        ).map(([chave, rotulo]) => (
          <button
            key={chave}
            onClick={() => setAba(chave)}
            className={[
              'flex-1 rounded-xl py-2.5 text-base font-bold transition',
              aba === chave ? 'bg-white text-tinta shadow-card' : 'text-tinta-suave',
            ].join(' ')}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {/* Filtro por categoria */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <Chip ativo={cat === null} onClick={() => setCat(null)}>
          Tudo
        </Chip>
        {categorias?.map((c) => (
          <Chip key={c.id} ativo={cat === c.slug} onClick={() => setCat(c.slug)}>
            {c.nome}
          </Chip>
        ))}
      </div>

      {/* Lista */}
      {aba === 'prestadores' ? (
        <Lista
          carregando={carregandoP}
          vazio="Ainda não há profissionais aqui. Seja o primeiro a se cadastrar!"
        >
          {prestadores?.map((p) => (
            <CardPrestador key={p.id} p={p} aoTocar={tocarPrestador} />
          ))}
        </Lista>
      ) : (
        <Lista
          carregando={carregandoPed}
          vazio="Ninguém pediu serviço por aqui ainda. Que tal ser o primeiro?"
        >
          {pedidos?.map((p) => (
            <CardPedido key={p.id} p={p} aoTocar={tocarPedido} />
          ))}
        </Lista>
      )}
    </div>
  )
}

function Chip({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition',
        ativo ? 'bg-igarape text-white' : 'bg-white text-tinta-suave shadow-card',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

function Lista({
  carregando,
  vazio,
  children,
}: {
  carregando: boolean
  vazio: string
  children: React.ReactNode
}) {
  const vazioDeVerdade = !carregando && Array.isArray(children) && children.length === 0

  if (carregando) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-areia-escura" />
        ))}
      </div>
    )
  }

  if (vazioDeVerdade) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-card">
        <p className="text-tinta-suave">{vazio}</p>
      </div>
    )
  }

  return <div className="space-y-3">{children}</div>
}
