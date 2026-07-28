import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Clock, Check, Send } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Botao, Cartao, Selo } from '@/components/ui'
import { CampoVoz } from '@/components/ui/CampoVoz'
import { useMeuPrestador } from './usePrestador'
import { tempoRelativo, reais } from '@/lib/formato'
import type { FeedPedido } from '@/features/vitrine/cards'

// O prestador abre um pedido da vitrine e manda seu preço.
// Mandar orçamento é DE GRAÇA — só se paga quando o cliente escolhe.
// Isso é dito na tela, porque é a dúvida número um de quem começa.

export function DetalhePedido() {
  const { id } = useParams<{ id: string }>()
  const navegar = useNavigate()
  const qc = useQueryClient()
  const { data: prestador } = useMeuPrestador()

  const [valor, setValor] = useState('')
  const [prazo, setPrazo] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  const { data: pedido, isLoading } = useQuery({
    queryKey: ['pedido_publico', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feed_pedidos')
        .select('*')
        .eq('id', id!)
        .maybeSingle()
      if (error) throw error
      return (data as FeedPedido | null) ?? null
    },
  })

  // Já mandei orçamento neste pedido?
  const { data: meuOrcamento } = useQuery({
    queryKey: ['meu_orcamento', id, prestador?.id],
    enabled: Boolean(id && prestador?.id),
    queryFn: async () => {
      const { data } = await supabase
        .from('orcamentos')
        .select('id, valor, prazo, mensagem')
        .eq('pedido_id', id!)
        .eq('prestador_id', prestador!.id)
        .maybeSingle()
      return data as { id: string; valor: number; prazo: string; mensagem: string } | null
    },
  })

  const enviar = useMutation({
    mutationFn: async () => {
      if (!prestador) throw new Error('Cadastre-se como profissional primeiro.')
      const numero = Number(valor.replace(/\./g, '').replace(',', '.'))
      const { error } = await supabase.from('orcamentos').insert({
        pedido_id: id,
        prestador_id: prestador.id,
        valor: Number.isFinite(numero) && numero > 0 ? numero : null,
        prazo: prazo.trim() || null,
        mensagem: mensagem.trim() || null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meu_orcamento'] })
      qc.invalidateQueries({ queryKey: ['meus_orcamentos'] })
    },
    onError: (e) => setErro(e instanceof Error ? e.message : 'Não deu pra enviar agora.'),
  })

  if (isLoading) {
    return (
      <div className="flex min-h-[50dvh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-igarape/20 border-t-igarape" />
      </div>
    )
  }

  if (!pedido) {
    return (
      <div className="py-10 text-center">
        <p className="text-tinta-suave">Esse pedido não está mais disponível.</p>
        <Botao variante="contorno" className="mt-4" onClick={() => navegar('/')}>
          Voltar
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

      <Cartao>
        <div className="flex items-start justify-between gap-2">
          <Selo cor={pedido.modo === 'rapido' ? 'tucupi' : 'igarape'}>
            {pedido.modo === 'rapido' ? 'Pra agora' : 'Quer orçamento'}
          </Selo>
          <span className="text-sm text-tinta-suave">{tempoRelativo(pedido.criado_em)}</span>
        </div>

        <h1 className="mt-2 text-xl leading-tight">{pedido.subcategoria}</h1>
        {pedido.descricao && <p className="mt-2 text-tinta-suave">{pedido.descricao}</p>}

        {(pedido.foto_urls?.length ?? 0) > 0 && (
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {pedido.foto_urls.map((url) => (
              <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                <img
                  src={url}
                  alt="Foto do serviço"
                  className="h-32 w-32 shrink-0 rounded-2xl object-cover"
                  loading="lazy"
                />
              </a>
            ))}
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-tinta-suave">
          {pedido.bairro && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4" /> {pedido.bairro}
            </span>
          )}
          {pedido.prazo_desejado && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-4 w-4" /> {pedido.prazo_desejado}
            </span>
          )}
          <span>· {pedido.cliente_nome}</span>
        </div>
      </Cartao>

      {/* Já enviou */}
      {meuOrcamento ? (
        <Cartao className="!border-2 !border-igarape">
          <div className="flex items-center gap-2">
            <Check className="h-6 w-6 text-igarape" />
            <h2 className="text-lg">Você já mandou seu preço</h2>
          </div>
          <p className="mt-2 text-tinta-suave">
            {meuOrcamento.valor ? reais(meuOrcamento.valor) : 'A combinar'}
            {meuOrcamento.prazo ? ` · ${meuOrcamento.prazo}` : ''}
          </p>
          {meuOrcamento.mensagem && (
            <p className="mt-1 text-tinta-suave">{meuOrcamento.mensagem}</p>
          )}
          <p className="mt-3 rounded-xl bg-igarape/10 p-3 text-sm font-bold text-igarape-escuro">
            Agora é esperar. Se {pedido.cliente_nome} escolher você, a gente te avisa e libera o
            contato dele.
          </p>
        </Cartao>
      ) : !prestador ? (
        <Cartao>
          <p className="text-tinta-suave">
            Para mandar seu preço, primeiro cadastre o que você faz.
          </p>
          <Botao variante="acao" bloco className="mt-3" onClick={() => navegar('/perfil')}>
            Quero oferecer meu serviço
          </Botao>
        </Cartao>
      ) : (
        <Cartao>
          <h2 className="text-lg">Mandar meu preço</h2>
          <p className="mt-1 text-sm text-tinta-suave">
            Mandar é de graça. Você só gasta um contato se o cliente escolher você.
          </p>

          <div className="mt-3 space-y-3">
            <label className="block">
              <span className="mb-1 block font-bold">Quanto você cobra?</span>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-bold text-tinta-suave">
                  R$
                </span>
                <input
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  inputMode="decimal"
                  placeholder="0,00"
                  className="w-full rounded-2xl border-2 border-tinta/10 bg-white p-4 pl-12 focus:border-igarape"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1 block font-bold">Em quanto tempo faz?</span>
              <input
                value={prazo}
                onChange={(e) => setPrazo(e.target.value)}
                placeholder="Ex: uns 3 dias"
                className="w-full rounded-2xl border-2 border-tinta/10 bg-white p-4 focus:border-igarape"
              />
            </label>

            <div>
              <span className="mb-1 block font-bold">Quer falar alguma coisa?</span>
              <CampoVoz
                valor={mensagem}
                aoMudar={setMensagem}
                placeholder="Ex: já fiz vários trabalhos parecidos aqui no bairro."
              />
            </div>
          </div>

          {erro && <p className="mt-2 text-alerta">{erro}</p>}

          <Botao
            variante="acao"
            bloco
            className="mt-3"
            icone={<Send />}
            disabled={enviar.isPending}
            onClick={() => {
              setErro(null)
              if (!valor.trim() && !mensagem.trim())
                return setErro('Coloque pelo menos o preço ou uma mensagem.')
              enviar.mutate()
            }}
          >
            {enviar.isPending ? 'Enviando…' : 'Mandar meu preço'}
          </Botao>
        </Cartao>
      )}
    </div>
  )
}
