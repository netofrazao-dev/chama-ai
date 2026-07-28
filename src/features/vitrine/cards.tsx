import { Star, MapPin, Clock, BadgeCheck, Zap } from 'lucide-react'
import { Cartao, Selo } from '@/components/ui'
import { textoCobertura, tempoRelativo, seloNivel } from '@/lib/formato'

// ---------- tipos das views ----------
export interface FeedPrestador {
  id: string
  nome: string
  foto_url: string | null
  bio: string | null
  nivel: string
  nota_media: number
  total_avaliacoes: number
  total_concluidos: number
  esta_online: boolean
  tem_loja: boolean
  aceita_orcamento: boolean
  aceita_pedido_rapido: boolean
  modo_cobertura: 'bairros' | 'raio'
  raio_km: number | null
  servicos: string[]
  categorias_slugs: string[]
  bairros_atendidos: string[]
}

export interface FeedPedido {
  id: string
  modo: 'rapido' | 'orcamento' | 'loja'
  status: string
  criado_em: string
  prazo_desejado: string | null
  descricao: string | null
  tem_foto: boolean
  subcategoria: string
  categoria: string
  categoria_slug: string
  bairro: string | null
  cliente_nome: string
  cliente_foto: string | null
}

function Iniciais({ nome }: { nome: string }) {
  const ini = nome
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-igarape/12 text-lg font-bold text-igarape-escuro">
      {ini}
    </div>
  )
}

export function CardPrestador({
  p,
  aoTocar,
}: {
  p: FeedPrestador
  aoTocar: (p: FeedPrestador) => void
}) {
  const selo = seloNivel(p.nivel)
  return (
    <Cartao onClick={() => aoTocar(p)} className="!p-4">
      <div className="flex gap-3">
        {p.foto_url ? (
          <img src={p.foto_url} alt="" className="h-14 w-14 shrink-0 rounded-2xl object-cover" />
        ) : (
          <Iniciais nome={p.nome} />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-lg leading-tight">{p.nome}</h3>
            {p.nivel !== 'iniciante' && <BadgeCheck className="h-5 w-5 shrink-0 text-igarape" />}
          </div>

          <div className="mt-0.5 flex items-center gap-2 text-sm text-tinta-suave">
            {p.total_avaliacoes > 0 ? (
              <span className="inline-flex items-center gap-1 font-bold text-tinta">
                <Star className="h-4 w-4 fill-sol text-sol" />
                {p.nota_media.toFixed(1)}
                <span className="font-normal text-tinta-suave">({p.total_avaliacoes})</span>
              </span>
            ) : (
              <span>Sem avaliações ainda</span>
            )}
            {p.esta_online && (
              <span className="inline-flex items-center gap-1 font-bold text-igarape">
                <span className="h-2 w-2 rounded-full bg-igarape" /> Online
              </span>
            )}
          </div>

          <p className="mt-1 line-clamp-1 text-sm text-tinta-suave">{p.servicos.join(' · ')}</p>

          <div className="mt-1.5 flex items-center gap-1 text-sm text-tinta-suave">
            <MapPin className="h-4 w-4" />
            {textoCobertura(p.modo_cobertura, p.raio_km, p.bairros_atendidos)}
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            <Selo cor={selo.cor}>{selo.rotulo}</Selo>
            {p.tem_loja && <Selo cor="suave">Tem loja</Selo>}
            {p.aceita_pedido_rapido && (
              <Selo cor="tucupi">
                <Zap className="h-3.5 w-3.5" /> Rápido
              </Selo>
            )}
          </div>
        </div>
      </div>
    </Cartao>
  )
}

const CORDEMODO: Record<string, string> = {
  rapido: 'bg-tucupi/12 text-tucupi-escuro',
  orcamento: 'bg-igarape/12 text-igarape-escuro',
  loja: 'bg-sol/25 text-tinta',
}
const ROTULOMODO: Record<string, string> = {
  rapido: 'Pra agora',
  orcamento: 'Quer orçamento',
  loja: 'Quer agendar',
}

export function CardPedido({
  p,
  aoTocar,
}: {
  p: FeedPedido
  aoTocar: (p: FeedPedido) => void
}) {
  return (
    <Cartao onClick={() => aoTocar(p)} className="!p-4">
      <div className="flex items-start justify-between gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-sm font-bold ${CORDEMODO[p.modo]}`}>
          {ROTULOMODO[p.modo]}
        </span>
        <span className="text-sm text-tinta-suave">{tempoRelativo(p.criado_em)}</span>
      </div>

      <h3 className="mt-2 text-lg leading-tight">{p.subcategoria}</h3>
      {p.descricao && <p className="mt-1 line-clamp-2 text-tinta-suave">{p.descricao}</p>}

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-tinta-suave">
        {p.bairro && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-4 w-4" /> {p.bairro}
          </span>
        )}
        {p.prazo_desejado && (
          <span className="inline-flex items-center gap-1">
            <Clock className="h-4 w-4" /> {p.prazo_desejado}
          </span>
        )}
        <span>· {p.cliente_nome}</span>
      </div>
    </Cartao>
  )
}
