import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Clock, MapPin } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/stores/authStore'
import { Botao, Cartao, Selo } from '@/components/ui'
import { tempoRelativo } from '@/lib/formato'

interface MeuPedido {
  id: string
  modo: string
  status: string
  descricao: string | null
  prazo_desejado: string | null
  criado_em: string
  subcategorias: { nome: string } | null
  bairros: { nome: string } | null
}

const ROTULO_STATUS: Record<string, { texto: string; cor: 'igarape' | 'sol' | 'suave' | 'tucupi' }> =
  {
    aberto: { texto: 'Esperando resposta', cor: 'sol' },
    com_orcamentos: { texto: 'Tem orçamento!', cor: 'igarape' },
    em_negociacao: { texto: 'Conversando', cor: 'tucupi' },
    aceito: { texto: 'Fechado', cor: 'igarape' },
    em_andamento: { texto: 'Em andamento', cor: 'tucupi' },
    concluido: { texto: 'Concluído', cor: 'suave' },
    cancelado: { texto: 'Cancelado', cor: 'suave' },
  }

export function MeusPedidos() {
  const usuario = useAuth((s) => s.usuario)
  const navegar = useNavigate()

  const { data: pedidos, isLoading } = useQuery({
    queryKey: ['meus_pedidos', usuario?.id],
    enabled: Boolean(usuario?.id),
    queryFn: async () => {
      // RLS já limita aos próprios pedidos; filtramos por clareza.
      const { data, error } = await supabase
        .from('pedidos')
        .select('id, modo, status, descricao, prazo_desejado, criado_em, subcategorias(nome), bairros(nome)')
        .eq('cliente_id', usuario!.id)
        .order('criado_em', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as MeuPedido[]
    },
  })

  return (
    <div className="space-y-4 pb-4">
      <header className="pt-2">
        <h1 className="text-xl">Meus pedidos</h1>
        <p className="text-tinta-suave">O que você pediu e como está cada um.</p>
      </header>

      <Botao variante="acao" bloco icone={<Plus />} onClick={() => navegar('/pedir')}>
        Preciso de um serviço
      </Botao>

      {isLoading && <div className="h-28 animate-pulse rounded-2xl bg-areia-escura" />}

      {!isLoading && (pedidos?.length ?? 0) === 0 && (
        <div className="rounded-2xl bg-white p-8 text-center shadow-card">
          <p className="text-tinta-suave">
            Você ainda não pediu nenhum serviço. Toque no botão acima pra pedir o primeiro.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {pedidos?.map((p) => {
          const st = ROTULO_STATUS[p.status] ?? ROTULO_STATUS.aberto
          return (
            <Cartao key={p.id}>
              <div className="flex items-start justify-between gap-2">
                <Selo cor={st.cor}>{st.texto}</Selo>
                <span className="text-sm text-tinta-suave">{tempoRelativo(p.criado_em)}</span>
              </div>
              <h3 className="mt-2 text-lg leading-tight">
                {p.subcategorias?.nome ?? 'Serviço'}
              </h3>
              {p.descricao && (
                <p className="mt-1 line-clamp-2 text-tinta-suave">{p.descricao}</p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-tinta-suave">
                {p.bairros?.nome && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-4 w-4" /> {p.bairros.nome}
                  </span>
                )}
                {p.prazo_desejado && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-4 w-4" /> {p.prazo_desejado}
                  </span>
                )}
              </div>
            </Cartao>
          )
        })}
      </div>
    </div>
  )
}
