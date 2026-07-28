import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Users,
  ClipboardList,
  Wallet,
  ShieldAlert,
  Check,
  Ban,
  RotateCcw,
  Star,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Botao, Cartao, Selo } from '@/components/ui'
import { reais, tempoRelativo } from '@/lib/formato'

// Painel de administração. Tudo que antes exigia abrir o SQL Editor:
// aprovar prestador, confirmar pagamento, ver denúncia, devolver contato.

type Aba = 'resumo' | 'prestadores' | 'compras' | 'denuncias' | 'leads'

const ABAS: { chave: Aba; rotulo: string; icone: typeof Users }[] = [
  { chave: 'resumo', rotulo: 'Resumo', icone: ClipboardList },
  { chave: 'prestadores', rotulo: 'Profissionais', icone: Users },
  { chave: 'compras', rotulo: 'Pagamentos', icone: Wallet },
  { chave: 'denuncias', rotulo: 'Denúncias', icone: ShieldAlert },
  { chave: 'leads', rotulo: 'Contatos', icone: RotateCcw },
]

export function Admin() {
  const navegar = useNavigate()
  const [aba, setAba] = useState<Aba>('resumo')

  // se não for admin, o resumo volta vazio — usamos isso para barrar a tela
  const { data: resumo, isLoading } = useQuery({
    queryKey: ['resumo_admin'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('resumo_admin')
      if (error) throw error
      const lista = (data ?? []) as Record<string, number>[]
      return lista[0] ?? null
    },
  })

  if (isLoading) {
    return (
      <div className="flex min-h-[50dvh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-igarape/20 border-t-igarape" />
      </div>
    )
  }

  if (!resumo) {
    return (
      <div className="py-16 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-tinta-suave" />
        <p className="mt-2 font-bold">Esta área é só para administradores.</p>
        <Botao variante="contorno" className="mt-4" onClick={() => navegar('/')}>
          Voltar ao início
        </Botao>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-6">
      <button
        onClick={() => navegar(-1)}
        className="flex items-center gap-1 py-2 font-bold text-tinta-suave"
      >
        <ArrowLeft className="h-5 w-5" /> Voltar
      </button>

      <header>
        <h1 className="text-xl">Administração</h1>
        <p className="text-tinta-suave">Chama Aí — Breves</p>
      </header>

      {/* abas roláveis */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {ABAS.map(({ chave, rotulo, icone: Icone }) => {
          const pendencia =
            (chave === 'compras' && Number(resumo.compras_pendentes) > 0) ||
            (chave === 'denuncias' && Number(resumo.denuncias_abertas) > 0)
          return (
            <button
              key={chave}
              onClick={() => setAba(chave)}
              className={[
                'flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-sm font-bold transition',
                aba === chave ? 'bg-igarape text-white' : 'bg-white text-tinta-suave shadow-card',
              ].join(' ')}
            >
              <Icone className="h-4 w-4" />
              {rotulo}
              {pendencia && <span className="h-2 w-2 rounded-full bg-alerta" />}
            </button>
          )
        })}
      </div>

      {aba === 'resumo' && <Resumo resumo={resumo} />}
      {aba === 'prestadores' && <Prestadores />}
      {aba === 'compras' && <Compras />}
      {aba === 'denuncias' && <Denuncias />}
      {aba === 'leads' && <Leads />}
    </div>
  )
}

function Numero({ rotulo, valor, alerta }: { rotulo: string; valor: number; alerta?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 ${alerta && valor > 0 ? 'bg-alerta/10' : 'bg-white shadow-card'}`}>
      <p className="text-sm text-tinta-suave">{rotulo}</p>
      <p className={`text-2xl font-bold ${alerta && valor > 0 ? 'text-alerta' : 'text-tinta'}`}>
        {valor}
      </p>
    </div>
  )
}

function Resumo({ resumo }: { resumo: Record<string, number> }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Numero rotulo="Pessoas" valor={Number(resumo.total_usuarios)} />
      <Numero rotulo="Profissionais" valor={Number(resumo.total_prestadores)} />
      <Numero rotulo="Pedidos abertos" valor={Number(resumo.pedidos_abertos)} />
      <Numero rotulo="Serviços feitos" valor={Number(resumo.pedidos_concluidos)} />
      <Numero rotulo="Orçamentos" valor={Number(resumo.orcamentos_enviados)} />
      <Numero rotulo="Contatos usados" valor={Number(resumo.leads_cobrados)} />
      <Numero rotulo="Pagamentos a conferir" valor={Number(resumo.compras_pendentes)} alerta />
      <Numero rotulo="Denúncias abertas" valor={Number(resumo.denuncias_abertas)} alerta />
    </div>
  )
}

// ---------------- Profissionais ----------------
function Prestadores() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['admin_prestadores'],
    queryFn: async () => {
      const { data } = await supabase.from('admin_prestadores').select('*')
      return (data ?? []) as Record<string, never>[] as unknown as {
        id: string
        usuario_id: string
        nome: string
        whatsapp: string | null
        banido: boolean
        nivel: string
        nota_media: number
        total_avaliacoes: number
        total_concluidos: number
        credito_disponivel: number
        leads_gratis_restantes: number
      }[]
    },
  })

  const mudarNivel = useMutation({
    mutationFn: async ({ id, nivel }: { id: string; nivel: string }) => {
      const { error } = await supabase.rpc('definir_nivel_prestador', {
        p_prestador_id: id,
        p_nivel: nivel,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin_prestadores'] }),
  })

  const banir = useMutation({
    mutationFn: async ({ id, banido }: { id: string; banido: boolean }) => {
      const { error } = await supabase.rpc('definir_banimento', {
        p_usuario_id: id,
        p_banido: banido,
        p_motivo: banido ? 'Decisão da administração' : null,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin_prestadores'] }),
  })

  if (isLoading) return <div className="h-24 animate-pulse rounded-2xl bg-areia-escura" />

  return (
    <div className="space-y-3">
      {data?.map((p) => (
        <Cartao key={p.id}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-lg leading-tight">{p.nome}</h3>
              <p className="text-sm text-tinta-suave">
                <Star className="mr-0.5 inline h-4 w-4 fill-sol text-sol" />
                {p.total_avaliacoes > 0 ? p.nota_media.toFixed(1) : '—'} · {p.total_concluidos}{' '}
                serviços · {p.credito_disponivel + p.leads_gratis_restantes} contatos
              </p>
            </div>
            {p.banido && <Selo cor="suave">Banido</Selo>}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {['iniciante', 'verificado', 'comprovado'].map((n) => (
              <button
                key={n}
                onClick={() => mudarNivel.mutate({ id: p.id, nivel: n })}
                className={[
                  'min-h-[40px] rounded-xl px-3 text-sm font-bold transition',
                  p.nivel === n ? 'bg-igarape text-white' : 'bg-areia-escura/60 text-tinta',
                ].join(' ')}
              >
                {p.nivel === n && <Check className="mr-1 inline h-3.5 w-3.5" />}
                {n}
              </button>
            ))}
            <button
              onClick={() => banir.mutate({ id: p.usuario_id, banido: !p.banido })}
              className="ml-auto flex min-h-[40px] items-center gap-1 rounded-xl bg-alerta/10 px-3 text-sm font-bold text-alerta"
            >
              <Ban className="h-4 w-4" />
              {p.banido ? 'Desbanir' : 'Banir'}
            </button>
          </div>
        </Cartao>
      ))}
    </div>
  )
}

// ---------------- Pagamentos ----------------
function Compras() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['admin_compras'],
    queryFn: async () => {
      const { data } = await supabase.from('admin_compras').select('*')
      return (data ?? []) as unknown as {
        id: string
        prestador_nome: string
        pacote: string
        creditos: number
        valor_reais: number
        status: string
        criado_em: string
      }[]
    },
  })

  const confirmar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('confirmar_compra_creditos', { p_compra_id: id })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin_compras'] })
      qc.invalidateQueries({ queryKey: ['resumo_admin'] })
    },
  })

  if (isLoading) return <div className="h-24 animate-pulse rounded-2xl bg-areia-escura" />

  if ((data?.length ?? 0) === 0) {
    return (
      <p className="rounded-2xl bg-white p-8 text-center text-tinta-suave shadow-card">
        Nenhum pagamento ainda.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {data!.map((c) => (
        <Cartao key={c.id} className={c.status === 'pendente' ? '!border-2 !border-sol' : ''}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-lg leading-tight">{c.prestador_nome}</h3>
              <p className="text-sm text-tinta-suave">
                {c.pacote} · {reais(Number(c.valor_reais))} · {tempoRelativo(c.criado_em)}
              </p>
            </div>
            <Selo cor={c.status === 'pago' ? 'igarape' : 'sol'}>
              {c.status === 'pago' ? 'Liberado' : 'Conferir'}
            </Selo>
          </div>

          {c.status !== 'pago' && (
            <Botao
              variante="acao"
              bloco
              className="mt-3"
              icone={<Check />}
              disabled={confirmar.isPending}
              onClick={() => confirmar.mutate(c.id)}
            >
              {confirmar.isPending ? 'Liberando…' : `Recebi — liberar ${c.creditos} contatos`}
            </Botao>
          )}
        </Cartao>
      ))}
    </div>
  )
}

// ---------------- Denúncias ----------------
function Denuncias() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['admin_denuncias'],
    queryFn: async () => {
      const { data } = await supabase.from('admin_denuncias').select('*')
      return (data ?? []) as unknown as {
        id: string
        tipo: string
        descricao: string | null
        status: string
        criado_em: string
        denunciante_nome: string
        denunciado_id: string
        denunciado_nome: string
        denunciado_banido: boolean
      }[]
    },
  })

  const resolver = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('denuncias')
        .update({ status: 'resolvida', resolvido_em: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin_denuncias'] })
      qc.invalidateQueries({ queryKey: ['resumo_admin'] })
    },
  })

  const banir = useMutation({
    mutationFn: async (usuarioId: string) => {
      const { error } = await supabase.rpc('definir_banimento', {
        p_usuario_id: usuarioId,
        p_banido: true,
        p_motivo: 'Denúncia procedente',
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin_denuncias'] }),
  })

  if (isLoading) return <div className="h-24 animate-pulse rounded-2xl bg-areia-escura" />

  if ((data?.length ?? 0) === 0) {
    return (
      <p className="rounded-2xl bg-white p-8 text-center text-tinta-suave shadow-card">
        Nenhuma denúncia. Bom sinal.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {data!.map((d) => (
        <Cartao key={d.id} className={d.status === 'aberta' ? '!border-2 !border-alerta' : ''}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-lg leading-tight">{d.denunciado_nome}</h3>
              <p className="text-sm text-tinta-suave">
                denunciado por {d.denunciante_nome} · {tempoRelativo(d.criado_em)}
              </p>
            </div>
            <Selo cor={d.status === 'aberta' ? 'tucupi' : 'suave'}>{d.status}</Selo>
          </div>

          <p className="mt-2 font-bold">{d.tipo}</p>
          {d.descricao && <p className="mt-1 text-tinta-suave">{d.descricao}</p>}

          {d.status === 'aberta' && (
            <div className="mt-3 flex gap-2">
              <Botao variante="contorno" bloco onClick={() => resolver.mutate(d.id)}>
                Resolver
              </Botao>
              {!d.denunciado_banido && (
                <Botao
                  variante="acao"
                  icone={<Ban />}
                  onClick={() => {
                    banir.mutate(d.denunciado_id)
                    resolver.mutate(d.id)
                  }}
                >
                  Banir
                </Botao>
              )}
            </div>
          )}
        </Cartao>
      ))}
    </div>
  )
}

// ---------------- Contatos cobrados ----------------
function Leads() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['admin_leads'],
    queryFn: async () => {
      const { data } = await supabase.from('admin_leads').select('*').limit(50)
      return (data ?? []) as unknown as {
        id: string
        cobrado_em: string
        creditos_gastos: number
        usou_lead_gratis: boolean
        devolvido: boolean
        prestador_nome: string
        cliente_nome: string
        servico: string | null
      }[]
    },
  })

  const devolver = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('devolver_lead', {
        p_lead_id: id,
        p_motivo: 'Devolvido pela administração',
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin_leads'] }),
  })

  if (isLoading) return <div className="h-24 animate-pulse rounded-2xl bg-areia-escura" />

  if ((data?.length ?? 0) === 0) {
    return (
      <p className="rounded-2xl bg-white p-8 text-center text-tinta-suave shadow-card">
        Nenhum contato liberado ainda.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {data!.map((l) => (
        <Cartao key={l.id}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-bold">{l.prestador_nome}</p>
              <p className="text-sm text-tinta-suave">
                {l.servico ?? 'serviço'} · cliente {l.cliente_nome} · {tempoRelativo(l.cobrado_em)}
              </p>
            </div>
            <Selo cor={l.devolvido ? 'suave' : l.usou_lead_gratis ? 'sol' : 'igarape'}>
              {l.devolvido ? 'devolvido' : l.usou_lead_gratis ? 'grátis' : `${l.creditos_gastos}`}
            </Selo>
          </div>

          {!l.devolvido && (
            <Botao
              variante="contorno"
              bloco
              className="mt-2"
              icone={<RotateCcw className="h-4 w-4" />}
              onClick={() => devolver.mutate(l.id)}
            >
              Devolver contato
            </Botao>
          )}
        </Cartao>
      ))}
    </div>
  )
}
