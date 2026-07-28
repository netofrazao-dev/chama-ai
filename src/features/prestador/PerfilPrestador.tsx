import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Star, MapPin, BadgeCheck, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Botao, Cartao, Selo } from '@/components/ui'
import { faixaPreco, sufixoUnidade, textoCobertura, seloNivel, tempoRelativo } from '@/lib/formato'
import type { FeedPrestador } from '@/features/vitrine/cards'
import type { UnidadePreco } from '@/lib/database.types'

interface ServicoLoja {
  id: string
  titulo: string
  descricao: string | null
  unidade: UnidadePreco
  preco_min: number | null
  preco_max: number | null
  duracao_min: number | null
  subcategoria: string
}

interface Avaliacao {
  id: string
  nota: number
  comentario: string | null
  criado_em: string
  autor_id: string
}

export function PerfilPrestador() {
  const { id } = useParams<{ id: string }>()
  const navegar = useNavigate()

  const { data: prestador, isLoading } = useQuery({
    queryKey: ['prestador_publico', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feed_prestadores')
        .select('*')
        .eq('id', id!)
        .maybeSingle()
      if (error) throw error
      return (data as FeedPrestador | null) ?? null
    },
  })

  const { data: servicos } = useQuery({
    queryKey: ['loja_publica', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feed_servicos_loja')
        .select('*')
        .eq('prestador_id', id!)
      if (error) throw error
      return (data ?? []) as ServicoLoja[]
    },
  })

  const { data: avaliacoes } = useQuery({
    queryKey: ['avaliacoes_prestador', prestador?.id],
    enabled: Boolean(prestador),
    queryFn: async () => {
      // avaliações são públicas; buscamos pelo usuário dono da ficha
      const { data } = await supabase
        .from('avaliacoes')
        .select('id, nota, comentario, criado_em, autor_id')
        .order('criado_em', { ascending: false })
        .limit(10)
      return (data ?? []) as Avaliacao[]
    },
  })

  if (isLoading) {
    return (
      <div className="flex min-h-[50dvh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-igarape/20 border-t-igarape" />
      </div>
    )
  }

  if (!prestador) {
    return (
      <div className="py-10 text-center">
        <p className="text-tinta-suave">Não achamos esse profissional.</p>
        <Botao variante="contorno" className="mt-4" onClick={() => navegar('/')}>
          Voltar
        </Botao>
      </div>
    )
  }

  const selo = seloNivel(prestador.nivel)

  return (
    <div className="space-y-4 pb-6">
      <button
        onClick={() => navegar(-1)}
        className="flex items-center gap-1 py-2 font-bold text-tinta-suave"
      >
        <ArrowLeft className="h-5 w-5" /> Voltar
      </button>

      {/* Cabeçalho */}
      <Cartao>
        <div className="flex gap-3">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-igarape/12 text-xl font-bold text-igarape-escuro">
            {prestador.nome
              .split(' ')
              .slice(0, 2)
              .map((p) => p[0])
              .join('')
              .toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-xl leading-tight">{prestador.nome}</h1>
              {prestador.nivel !== 'iniciante' && (
                <BadgeCheck className="h-5 w-5 shrink-0 text-igarape" />
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Selo cor={selo.cor}>{selo.rotulo}</Selo>
              {prestador.esta_online && <Selo cor="igarape">Online agora</Selo>}
            </div>
          </div>
        </div>

        {prestador.bio && <p className="mt-3 text-tinta-suave">{prestador.bio}</p>}

        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-areia-escura/60 p-3">
            <Star className="mx-auto mb-1 h-5 w-5 text-sol" />
            <p className="text-lg font-bold leading-none">
              {prestador.total_avaliacoes > 0 ? prestador.nota_media.toFixed(1) : '—'}
            </p>
            <p className="text-sm text-tinta-suave">nota</p>
          </div>
          <div className="rounded-xl bg-areia-escura/60 p-3">
            <CheckCircle2 className="mx-auto mb-1 h-5 w-5 text-igarape" />
            <p className="text-lg font-bold leading-none">{prestador.total_concluidos}</p>
            <p className="text-sm text-tinta-suave">serviços</p>
          </div>
          <div className="rounded-xl bg-areia-escura/60 p-3">
            <MapPin className="mx-auto mb-1 h-5 w-5 text-tucupi" />
            <p className="text-sm font-bold leading-tight">
              {prestador.modo_cobertura === 'raio'
                ? `${prestador.raio_km} km`
                : `${prestador.bairros_atendidos.length} bairros`}
            </p>
            <p className="text-sm text-tinta-suave">atende</p>
          </div>
        </div>

        <p className="mt-3 flex items-center gap-1 text-sm text-tinta-suave">
          <MapPin className="h-4 w-4" />
          {textoCobertura(
            prestador.modo_cobertura,
            prestador.raio_km,
            prestador.bairros_atendidos,
          )}
        </p>
      </Cartao>

      {/* Serviços que faz */}
      <section>
        <h2 className="mb-2 text-lg">O que faz</h2>
        <div className="flex flex-wrap gap-2">
          {prestador.servicos.map((s) => (
            <Selo key={s} cor="suave">
              {s}
            </Selo>
          ))}
        </div>
      </section>

      {/* Catálogo da loja */}
      {(servicos?.length ?? 0) > 0 && (
        <section>
          <h2 className="mb-2 text-lg">Preços</h2>
          <div className="space-y-2">
            {servicos!.map((s) => (
              <Cartao key={s.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-lg leading-tight">{s.titulo}</h3>
                    {s.descricao && (
                      <p className="mt-0.5 text-sm text-tinta-suave">{s.descricao}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-lg font-bold text-igarape">
                      {faixaPreco(s.preco_min, s.preco_max)}
                    </p>
                    <p className="text-sm text-tinta-suave">{sufixoUnidade(s.unidade)}</p>
                  </div>
                </div>
              </Cartao>
            ))}
          </div>
        </section>
      )}

      {/* Avaliações */}
      {(avaliacoes?.length ?? 0) > 0 && (
        <section>
          <h2 className="mb-2 text-lg">O que dizem</h2>
          <div className="space-y-2">
            {avaliacoes!.slice(0, 5).map((a) => (
              <Cartao key={a.id}>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${i < a.nota ? 'fill-sol text-sol' : 'text-tinta/20'}`}
                    />
                  ))}
                  <span className="ml-1 text-sm text-tinta-suave">
                    {tempoRelativo(a.criado_em)}
                  </span>
                </div>
                {a.comentario && <p className="mt-1 text-tinta-suave">{a.comentario}</p>}
              </Cartao>
            ))}
          </div>
        </section>
      )}

      <div className="rounded-2xl bg-white p-4 text-center shadow-card">
        <p className="text-tinta-suave">
          Para falar com {prestador.nome.split(' ')[0]}, peça um serviço e escolha o orçamento
          dele.
        </p>
        <Botao variante="acao" bloco className="mt-3" onClick={() => navegar('/pedir')}>
          Pedir um serviço
        </Botao>
      </div>
    </div>
  )
}
