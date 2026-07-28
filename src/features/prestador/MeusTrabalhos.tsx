import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MessageCircle, Star, Wallet, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/stores/authStore'
import { Botao, Cartao, Selo } from '@/components/ui'
import { useMeuPrestador } from './usePrestador'
import { reais, tempoRelativo } from '@/lib/formato'
import { abrirWhatsApp, mensagemParaCliente } from '@/lib/whatsapp'
import { Avaliar } from '@/components/Avaliar'
import { ModoRapido } from './ModoRapido'

interface MeuOrcamento {
  id: string
  pedido_id: string
  valor: number | null
  prazo: string | null
  criado_em: string
}

interface TrabalhoFechado {
  id: string
  cliente_id: string
  status: string
  descricao: string | null
  criado_em: string
  subcategorias: { nome: string } | null
  bairros: { nome: string } | null
}

// Painel de quem trabalha: o que mandei e o que fechei.
export function MeusTrabalhos() {
  const { data: prestador, isLoading } = useMeuPrestador()
  const navegar = useNavigate()

  const { data: orcamentos } = useQuery({
    queryKey: ['meus_orcamentos', prestador?.id],
    enabled: Boolean(prestador?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orcamentos')
        .select('id, pedido_id, valor, prazo, criado_em')
        .eq('prestador_id', prestador!.id)
        .order('criado_em', { ascending: false })
      if (error) throw error
      return (data ?? []) as MeuOrcamento[]
    },
  })

  // pedidos em que fui escolhido
  const { data: fechados } = useQuery({
    queryKey: ['meus_trabalhos', prestador?.id],
    enabled: Boolean(prestador?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pedidos')
        .select('id, cliente_id, status, descricao, criado_em, subcategorias(nome), bairros(nome)')
        .eq('prestador_aceito_id', prestador!.id)
        .order('criado_em', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as TrabalhoFechado[]
    },
  })

  if (isLoading) {
    return <div className="h-32 animate-pulse rounded-2xl bg-areia-escura" />
  }

  if (!prestador) {
    return (
      <div className="py-10 text-center">
        <p className="text-tinta-suave">Cadastre o que você faz para começar a receber trabalho.</p>
        <Botao variante="acao" className="mt-4" onClick={() => navegar('/perfil')}>
          Quero oferecer meu serviço
        </Botao>
      </div>
    )
  }

  const pendentes = (orcamentos ?? []).filter(
    (o) => !(fechados ?? []).some((f) => f.id === o.pedido_id),
  )

  return (
    <div className="space-y-5 pb-4">
      <header className="pt-2">
        <h1 className="text-xl">Meus trabalhos</h1>
        <p className="text-tinta-suave">O que você mandou e o que já fechou.</p>
      </header>

      <ModoRapido />

      <div className="flex items-center gap-2 rounded-2xl bg-white p-4 shadow-card">
        <Wallet className="h-6 w-6 text-tucupi" />
        <div className="flex-1">
          <p className="font-bold">
            {prestador.credito_disponivel + prestador.leads_gratis_restantes} contatos disponíveis
          </p>
          {prestador.leads_gratis_restantes > 0 && (
            <p className="text-sm text-tinta-suave">
              {prestador.leads_gratis_restantes} são grátis, para você começar.
            </p>
          )}
        </div>
        <Botao variante="contorno" onClick={() => navegar('/creditos')}>
          Comprar
        </Botao>
      </div>

      {/* Trabalhos fechados */}
      <section>
        <h2 className="mb-2 text-lg">Você foi escolhido</h2>
        {(fechados?.length ?? 0) === 0 ? (
          <p className="rounded-2xl bg-white p-6 text-center text-tinta-suave shadow-card">
            Ainda não. Mande seu preço nos pedidos abertos para aparecer aqui.
          </p>
        ) : (
          <div className="space-y-3">
            {fechados!.map((f) => (
              <TrabalhoFechadoCard key={f.id} trabalho={f} prestadorId={prestador.id} />
            ))}
          </div>
        )}
      </section>

      {/* Orçamentos aguardando */}
      <section>
        <h2 className="mb-2 text-lg">Esperando resposta</h2>
        {pendentes.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-center shadow-card">
            <p className="text-tinta-suave">Você não tem preço esperando resposta.</p>
            <Botao
              variante="contorno"
              className="mt-3"
              icone={<Search className="h-5 w-5" />}
              onClick={() => navegar('/')}
            >
              Ver quem está precisando
            </Botao>
          </div>
        ) : (
          <div className="space-y-2">
            {pendentes.map((o) => (
              <Cartao key={o.id} onClick={() => navegar(`/pedido/${o.pedido_id}`)}>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-bold">
                      {o.valor ? reais(o.valor) : 'A combinar'}
                      {o.prazo ? ` · ${o.prazo}` : ''}
                    </p>
                    <p className="text-sm text-tinta-suave">
                      enviado {tempoRelativo(o.criado_em)}
                    </p>
                  </div>
                  <Selo cor="sol">Aguardando</Selo>
                </div>
              </Cartao>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

// ------------------------------------------------------------
// Um trabalho fechado. O contato do cliente só aparece quando o
// prestador decide gastar um contato — nunca em silêncio.
// ------------------------------------------------------------
function TrabalhoFechadoCard({
  trabalho,
  prestadorId,
}: {
  trabalho: TrabalhoFechado
  prestadorId: string
}) {
  const usuario = useAuth((s) => s.usuario)
  const qc = useQueryClient()
  const [erro, setErro] = useState<string | null>(null)

  const { data: contato, refetch } = useQuery({
    queryKey: ['contato_trabalho', trabalho.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('whatsapp_do_pedido', {
        p_pedido_id: trabalho.id,
      })
      if (error) throw error
      const lista = (data ?? []) as { nome: string; whatsapp: string }[]
      return lista[0] ?? null
    },
  })

  const liberar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('liberar_contato', {
        p_prestador_id: prestadorId,
        p_pedido_id: trabalho.id,
      })
      if (error) throw error
    },
    onSuccess: async () => {
      await refetch()
      qc.invalidateQueries({ queryKey: ['meu_prestador'] })
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : ''
      setErro(
        msg.includes('creditos_insuficientes')
          ? 'Seus contatos acabaram. Compre mais para falar com o cliente.'
          : 'Não deu pra liberar o contato agora.',
      )
    },
  })

  const concluir = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('pedidos')
        .update({ status: 'concluido' })
        .eq('id', trabalho.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meus_trabalhos'] }),
    onError: () => setErro('Não deu pra marcar como feito agora.'),
  })

  const servico = trabalho.subcategorias?.nome ?? 'serviço'

  return (
    <Cartao className="!border-2 !border-igarape">
      <div className="flex items-start justify-between gap-2">
        <Selo cor="igarape">
          <Star className="h-3.5 w-3.5" /> Você foi escolhido
        </Selo>
        <span className="text-sm text-tinta-suave">{tempoRelativo(trabalho.criado_em)}</span>
      </div>

      <h3 className="mt-2 text-lg leading-tight">{servico}</h3>
      {trabalho.descricao && <p className="mt-1 text-tinta-suave">{trabalho.descricao}</p>}
      {trabalho.bairros?.nome && (
        <p className="mt-1 text-sm text-tinta-suave">{trabalho.bairros.nome}</p>
      )}

      {erro && <p className="mt-2 text-alerta">{erro}</p>}

      {contato ? (
        <Botao
          variante="acao"
          bloco
          className="mt-3"
          icone={<MessageCircle />}
          onClick={() =>
            abrirWhatsApp(
              contato.whatsapp,
              mensagemParaCliente(usuario?.nome ?? 'o profissional', servico),
            )
          }
        >
          Falar com {contato.nome.split(' ')[0]}
        </Botao>
      ) : (
        <>
          <Botao
            variante="acao"
            bloco
            className="mt-3"
            disabled={liberar.isPending}
            onClick={() => {
              setErro(null)
              liberar.mutate()
            }}
          >
            {liberar.isPending ? 'Liberando…' : 'Ver contato do cliente'}
          </Botao>
          <p className="mt-2 text-center text-sm text-tinta-suave">
            Isso usa 1 contato seu.
          </p>
        </>
      )}

      {/* marcar como feito */}
      {trabalho.status !== 'concluido' && contato && (
        <Botao
          variante="contorno"
          bloco
          className="mt-2"
          disabled={concluir.isPending}
          onClick={() => {
            setErro(null)
            concluir.mutate()
          }}
        >
          {concluir.isPending ? 'Salvando…' : 'Já terminei esse serviço'}
        </Botao>
      )}

      {/* concluído: avaliar o cliente */}
      {trabalho.status === 'concluido' && (
        <Avaliar
          pedidoId={trabalho.id}
          destinatarioId={trabalho.cliente_id}
          nomeDestinatario={contato?.nome ?? 'o cliente'}
          souCliente={false}
        />
      )}
    </Cartao>
  )
}
