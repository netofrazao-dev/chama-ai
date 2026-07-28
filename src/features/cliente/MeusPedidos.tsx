import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Clock, MapPin, Star, MessageCircle, ChevronDown, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/stores/authStore'
import { Botao, Cartao, Selo } from '@/components/ui'
import { tempoRelativo, reais } from '@/lib/formato'
import { abrirWhatsApp, mensagemParaPrestador } from '@/lib/whatsapp'

interface MeuPedido {
  id: string
  modo: string
  status: string
  descricao: string | null
  prazo_desejado: string | null
  criado_em: string
  prestador_aceito_id: string | null
  subcategorias: { nome: string } | null
  bairros: { nome: string } | null
}

interface OrcamentoRecebido {
  id: string
  prestador_id: string
  valor: number | null
  prazo: string | null
  mensagem: string | null
  criado_em: string
}

interface PrestadorResumo {
  id: string
  nome: string
  nota_media: number
  total_avaliacoes: number
  nivel: string
}

const ROTULO_STATUS: Record<string, { texto: string; cor: 'igarape' | 'sol' | 'suave' | 'tucupi' }> = {
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
  const [aberto, setAberto] = useState<string | null>(null)

  const { data: pedidos, isLoading } = useQuery({
    queryKey: ['meus_pedidos', usuario?.id],
    enabled: Boolean(usuario?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pedidos')
        .select(
          'id, modo, status, descricao, prazo_desejado, criado_em, prestador_aceito_id, subcategorias(nome), bairros(nome)',
        )
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
          const expandido = aberto === p.id
          return (
            <Cartao key={p.id}>
              <div className="flex items-start justify-between gap-2">
                <Selo cor={st.cor}>{st.texto}</Selo>
                <span className="text-sm text-tinta-suave">{tempoRelativo(p.criado_em)}</span>
              </div>
              <h3 className="mt-2 text-lg leading-tight">{p.subcategorias?.nome ?? 'Serviço'}</h3>
              {p.descricao && <p className="mt-1 line-clamp-2 text-tinta-suave">{p.descricao}</p>}
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

              <button
                onClick={() => setAberto(expandido ? null : p.id)}
                className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl bg-areia-escura/60 py-3 font-bold text-tinta"
              >
                {expandido ? 'Fechar' : 'Ver quem respondeu'}
                <ChevronDown className={`h-5 w-5 transition ${expandido ? 'rotate-180' : ''}`} />
              </button>

              {expandido && (
                <Orcamentos pedido={p} servico={p.subcategorias?.nome ?? 'serviço'} />
              )}
            </Cartao>
          )
        })}
      </div>
    </div>
  )
}

// ------------------------------------------------------------
// Lista de orçamentos de um pedido, com o botão de escolher.
// Quando o cliente escolhe, ele recebe o WhatsApp do prestador
// SEM PAGAR NADA — quem paga o contato é o prestador, do lado dele.
// ------------------------------------------------------------
function Orcamentos({ pedido, servico }: { pedido: MeuPedido; servico: string }) {
  const usuario = useAuth((s) => s.usuario)
  const qc = useQueryClient()
  const [erro, setErro] = useState<string | null>(null)

  const { data: orcamentos, isLoading } = useQuery({
    queryKey: ['orcamentos_do_pedido', pedido.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orcamentos')
        .select('id, prestador_id, valor, prazo, mensagem, criado_em')
        .eq('pedido_id', pedido.id)
        .order('criado_em')
      if (error) throw error
      return (data ?? []) as OrcamentoRecebido[]
    },
  })

  // nomes/notas vêm da vitrine pública (a tabela de prestadores é privada)
  const ids = (orcamentos ?? []).map((o) => o.prestador_id)
  const { data: perfis } = useQuery({
    queryKey: ['perfis_orcamentos', ids.join(',')],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from('feed_prestadores')
        .select('id, nome, nota_media, total_avaliacoes, nivel')
        .in('id', ids)
      return (data ?? []) as PrestadorResumo[]
    },
  })

  const escolher = useMutation({
    mutationFn: async (prestadorId: string) => {
      const { error } = await supabase
        .from('pedidos')
        .update({ prestador_aceito_id: prestadorId, status: 'aceito' })
        .eq('id', pedido.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meus_pedidos'] })
      qc.invalidateQueries({ queryKey: ['contato_pedido', pedido.id] })
    },
    onError: (e) => setErro(e instanceof Error ? e.message : 'Não deu pra escolher agora.'),
  })

  // contato liberado depois de escolher
  const { data: contato } = useQuery({
    queryKey: ['contato_pedido', pedido.id],
    enabled: Boolean(pedido.prestador_aceito_id),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('whatsapp_do_pedido', { p_pedido_id: pedido.id })
      if (error) throw error
      const lista = (data ?? []) as { nome: string; whatsapp: string }[]
      return lista[0] ?? null
    },
  })

  if (isLoading) return <div className="mt-3 h-20 animate-pulse rounded-xl bg-areia-escura" />

  if ((orcamentos?.length ?? 0) === 0) {
    return (
      <p className="mt-3 rounded-xl bg-areia-escura/60 p-4 text-center text-tinta-suave">
        Ninguém respondeu ainda. Assim que alguém mandar o preço, aparece aqui.
      </p>
    )
  }

  return (
    <div className="mt-3 space-y-2">
      {erro && <p className="text-alerta">{erro}</p>}

      {orcamentos!.map((o) => {
        const perfil = perfis?.find((p) => p.id === o.prestador_id)
        const escolhido = pedido.prestador_aceito_id === o.prestador_id
        const jaFechou = Boolean(pedido.prestador_aceito_id)

        return (
          <div
            key={o.id}
            className={`rounded-xl p-3 ${escolhido ? 'bg-igarape/10 ring-2 ring-igarape' : 'bg-areia-escura/50'}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold">{perfil?.nome ?? 'Profissional'}</p>
                {perfil && perfil.total_avaliacoes > 0 && (
                  <span className="inline-flex items-center gap-1 text-sm text-tinta-suave">
                    <Star className="h-4 w-4 fill-sol text-sol" />
                    {perfil.nota_media.toFixed(1)} ({perfil.total_avaliacoes})
                  </span>
                )}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-lg font-bold text-igarape">
                  {o.valor ? reais(o.valor) : 'A combinar'}
                </p>
                {o.prazo && <p className="text-sm text-tinta-suave">{o.prazo}</p>}
              </div>
            </div>

            {o.mensagem && <p className="mt-1 text-sm text-tinta-suave">{o.mensagem}</p>}

            {escolhido ? (
              <div className="mt-2 space-y-2">
                <p className="flex items-center gap-1 font-bold text-igarape-escuro">
                  <Check className="h-5 w-5" /> Você escolheu esse
                </p>
                {contato && (
                  <Botao
                    variante="acao"
                    bloco
                    icone={<MessageCircle />}
                    onClick={() =>
                      abrirWhatsApp(
                        contato.whatsapp,
                        mensagemParaPrestador(usuario?.nome ?? 'um cliente', servico),
                      )
                    }
                  >
                    Falar no WhatsApp
                  </Botao>
                )}
              </div>
            ) : (
              !jaFechou && (
                <Botao
                  variante="principal"
                  bloco
                  className="mt-2"
                  disabled={escolher.isPending}
                  onClick={() => escolher.mutate(o.prestador_id)}
                >
                  {escolher.isPending ? 'Escolhendo…' : 'Escolher esse'}
                </Botao>
              )
            )}
          </div>
        )
      })}
    </div>
  )
}
