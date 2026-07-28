import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Zap, MapPin, Clock, Radio } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Botao, Cartao, Selo } from '@/components/ui'
import { useMeuPrestador } from './usePrestador'
import { tempoRelativo } from '@/lib/formato'
import type { Prestador } from '@/lib/database.types'

// ------------------------------------------------------------
// Modo rápido: quem está disponível agora recebe chamados na hora.
//
// O chamado chega sem recarregar a tela porque assinamos as mudanças
// da tabela de pedidos (Supabase Realtime). A permissão continua
// valendo: cada prestador só recebe evento do que já poderia ler.
//
// Quem chegar primeiro leva — e o banco garante isso, não a tela.
// ------------------------------------------------------------

interface ChamadoRapido {
  id: string
  descricao: string | null
  criado_em: string
  prazo_desejado: string | null
  subcategoria: string
  bairro: string | null
  cliente_nome: string
}

export function ModoRapido() {
  const qc = useQueryClient()
  const { data: prestador } = useMeuPrestador()
  const [aviso, setAviso] = useState<string | null>(null)

  const online = prestador?.esta_online ?? false

  const alternar = useMutation({
    mutationFn: async (novo: boolean) => {
      const { error } = await supabase
        .from('prestadores')
        .update({ esta_online: novo, ultima_vez_online: new Date().toISOString() })
        .eq('id', prestador!.id)
      if (error) throw error
    },
    onMutate: async (novo) => {
      // resposta imediata: o botão não pode "pensar" antes de mudar
      qc.setQueryData(['meu_prestador', prestador?.usuario_id], (velho: Prestador | null) =>
        velho ? { ...velho, esta_online: novo } : velho,
      )
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['meu_prestador'] }),
  })

  // chamados rápidos abertos que este prestador pode atender
  const { data: chamados, refetch } = useQuery({
    queryKey: ['chamados_rapidos', prestador?.id],
    enabled: Boolean(prestador?.id) && online,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feed_pedidos')
        .select('id, descricao, criado_em, prazo_desejado, subcategoria, bairro, cliente_nome')
        .eq('modo', 'rapido')
        .order('criado_em', { ascending: false })
        .limit(20)
      if (error) throw error
      return (data ?? []) as ChamadoRapido[]
    },
  })

  // assina mudanças na tabela de pedidos enquanto estiver online
  useEffect(() => {
    if (!online || !prestador?.id) return

    const canal = supabase
      .channel('chamados-rapidos')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pedidos' },
        () => refetch(),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [online, prestador?.id, refetch])

  const aceitar = useMutation({
    mutationFn: async (pedidoId: string) => {
      const { data, error } = await supabase.rpc('aceitar_pedido_rapido', {
        p_pedido_id: pedidoId,
      })
      if (error) throw error
      return data as boolean
    },
    onSuccess: (pegou) => {
      setAviso(
        pegou
          ? 'Chamado seu! Veja em "Você foi escolhido" para falar com o cliente.'
          : 'Outra pessoa pegou esse chamado primeiro. Fique de olho no próximo.',
      )
      qc.invalidateQueries({ queryKey: ['chamados_rapidos'] })
      qc.invalidateQueries({ queryKey: ['meus_trabalhos'] })
      refetch()
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : ''
      setAviso(
        msg.includes('fora_da_sua_area')
          ? 'Esse chamado está fora da área que você atende.'
          : 'Não deu pra aceitar agora. Tente de novo.',
      )
    },
  })

  if (!prestador?.aceita_pedido_rapido) return null

  return (
    <section className="space-y-3">
      {/* Interruptor de disponibilidade */}
      <div
        className={`rounded-2xl p-4 transition ${
          online ? 'bg-tucupi text-white shadow-acao' : 'bg-white shadow-card'
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className={`text-lg font-bold ${online ? 'text-white' : 'text-tinta'}`}>
              {online ? 'Você está disponível' : 'Ficar disponível agora'}
            </p>
            <p className={`text-sm ${online ? 'text-white/85' : 'text-tinta-suave'}`}>
              {online
                ? 'Os chamados de quem precisa agora aparecem aqui.'
                : 'Ligue quando puder atender na hora.'}
            </p>
          </div>

          <button
            role="switch"
            aria-checked={online}
            aria-label="Ficar disponível agora"
            onClick={() => alternar.mutate(!online)}
            className={`relative h-9 w-16 shrink-0 rounded-full transition ${
              online ? 'bg-white/30' : 'bg-tinta/15'
            }`}
          >
            <span
              className={`absolute top-1 h-7 w-7 rounded-full bg-white shadow transition-all ${
                online ? 'left-8' : 'left-1'
              }`}
            />
          </button>
        </div>
      </div>

      {aviso && (
        <p className="rounded-xl bg-igarape/10 p-3 font-bold text-igarape-escuro">{aviso}</p>
      )}

      {/* Lista de chamados */}
      {online && (
        <>
          <div className="flex items-center gap-2 pt-1">
            <Radio className="h-5 w-5 animate-pulse text-tucupi" />
            <h2 className="text-lg">Chamados agora</h2>
          </div>

          {(chamados?.length ?? 0) === 0 ? (
            <p className="rounded-2xl bg-white p-6 text-center text-tinta-suave shadow-card">
              Nenhum chamado no momento. Assim que alguém precisar de você por perto, aparece
              aqui na hora.
            </p>
          ) : (
            <div className="space-y-2">
              {chamados!.map((c) => (
                <Cartao key={c.id} className="!border-2 !border-tucupi">
                  <div className="flex items-start justify-between gap-2">
                    <Selo cor="tucupi">
                      <Zap className="h-3.5 w-3.5" /> Pra agora
                    </Selo>
                    <span className="text-sm text-tinta-suave">{tempoRelativo(c.criado_em)}</span>
                  </div>

                  <h3 className="mt-2 text-lg leading-tight">{c.subcategoria}</h3>
                  {c.descricao && <p className="mt-1 text-tinta-suave">{c.descricao}</p>}

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-tinta-suave">
                    {c.bairro && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-4 w-4" /> {c.bairro}
                      </span>
                    )}
                    {c.prazo_desejado && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-4 w-4" /> {c.prazo_desejado}
                      </span>
                    )}
                    <span>· {c.cliente_nome}</span>
                  </div>

                  <Botao
                    variante="acao"
                    bloco
                    className="mt-3"
                    disabled={aceitar.isPending}
                    onClick={() => {
                      setAviso(null)
                      aceitar.mutate(c.id)
                    }}
                  >
                    {aceitar.isPending ? 'Pegando…' : 'Pegar esse chamado'}
                  </Botao>
                </Cartao>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}
