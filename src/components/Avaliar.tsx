import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Star, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/stores/authStore'
import { Botao } from '@/components/ui'

// Avaliar em 2 toques: estrelas + uma tag opcional. Comentário é extra.
// Nada obrigatório além da nota — quanto menos fricção, mais gente avalia.

const TAGS_PRESTADOR = ['Pontual', 'Caprichoso', 'Preço justo', 'Educado']
const TAGS_CLIENTE = ['Explicou bem', 'Pagou certo', 'Educado', 'Recomendo']

export function Avaliar({
  pedidoId,
  destinatarioId,
  nomeDestinatario,
  souCliente,
}: {
  pedidoId: string
  destinatarioId: string
  nomeDestinatario: string
  souCliente: boolean
}) {
  const usuario = useAuth((s) => s.usuario)
  const qc = useQueryClient()
  const [nota, setNota] = useState(0)
  const [tags, setTags] = useState<string[]>([])
  const [comentario, setComentario] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  // já avaliei este serviço?
  const { data: jaAvaliei, isLoading } = useQuery({
    queryKey: ['ja_avaliei', pedidoId, usuario?.id],
    enabled: Boolean(usuario?.id),
    queryFn: async () => {
      const { data } = await supabase
        .from('avaliacoes')
        .select('id, nota')
        .eq('pedido_id', pedidoId)
        .eq('autor_id', usuario!.id)
        .maybeSingle()
      return data as { id: string; nota: number } | null
    },
  })

  const enviar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('avaliacoes').insert({
        pedido_id: pedidoId,
        autor_id: usuario!.id,
        destinatario_id: destinatarioId,
        nota,
        comentario: comentario.trim() || null,
        tags,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ja_avaliei', pedidoId] })
      qc.invalidateQueries({ queryKey: ['feed_prestadores'] })
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : ''
      setErro(
        msg.includes('duplicate')
          ? 'Você já avaliou esse serviço.'
          : 'Não deu pra enviar sua avaliação agora.',
      )
    },
  })

  if (isLoading) return null

  if (jaAvaliei) {
    return (
      <div className="mt-3 rounded-xl bg-igarape/10 p-3">
        <p className="flex items-center gap-1 font-bold text-igarape-escuro">
          <Check className="h-5 w-5" /> Você já avaliou
        </p>
        <div className="mt-1 flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`h-5 w-5 ${i < jaAvaliei.nota ? 'fill-sol text-sol' : 'text-tinta/20'}`}
            />
          ))}
        </div>
      </div>
    )
  }

  const listaTags = souCliente ? TAGS_PRESTADOR : TAGS_CLIENTE

  return (
    <div className="mt-3 rounded-xl bg-areia-escura/50 p-3">
      <p className="font-bold">Como foi com {nomeDestinatario.split(' ')[0]}?</p>

      {/* estrelas grandes, fáceis de acertar com o dedo */}
      <div className="mt-2 flex justify-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`${i + 1} estrela${i > 0 ? 's' : ''}`}
            onClick={() => setNota(i + 1)}
            className="p-1"
          >
            <Star
              className={`h-10 w-10 transition ${
                i < nota ? 'fill-sol text-sol' : 'text-tinta/20'
              }`}
            />
          </button>
        ))}
      </div>

      {nota > 0 && (
        <>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {listaTags.map((t) => {
              const ativo = tags.includes(t)
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() =>
                    setTags((prev) => (ativo ? prev.filter((x) => x !== t) : [...prev, t]))
                  }
                  className={[
                    'min-h-[44px] rounded-full px-4 text-sm font-bold transition',
                    ativo ? 'bg-igarape text-white' : 'bg-white text-tinta shadow-card',
                  ].join(' ')}
                >
                  {t}
                </button>
              )
            })}
          </div>

          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            rows={2}
            placeholder="Quer contar mais? (opcional)"
            className="mt-2 w-full resize-none rounded-2xl border-2 border-tinta/10 bg-white p-3 focus:border-igarape"
          />

          {erro && <p className="mt-1 text-alerta">{erro}</p>}

          <Botao
            variante="acao"
            bloco
            className="mt-2"
            disabled={enviar.isPending}
            onClick={() => {
              setErro(null)
              enviar.mutate()
            }}
          >
            {enviar.isPending ? 'Enviando…' : 'Enviar avaliação'}
          </Botao>
        </>
      )}
    </div>
  )
}
