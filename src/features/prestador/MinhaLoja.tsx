import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Store } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Botao, Cartao } from '@/components/ui'
import { useMeuPrestador } from './usePrestador'
import { faixaPreco, sufixoUnidade } from '@/lib/formato'
import type { Subcategoria, UnidadePreco } from '@/lib/database.types'

interface ServicoMeu {
  id: string
  titulo: string
  descricao: string | null
  unidade: UnidadePreco
  preco_min: number | null
  preco_max: number | null
  subcategoria_id: string
}

const UNIDADES: { valor: UnidadePreco; rotulo: string }[] = [
  { valor: 'por_servico', rotulo: 'pelo serviço' },
  { valor: 'por_hora', rotulo: 'por hora' },
  { valor: 'por_diaria', rotulo: 'por diária' },
  { valor: 'a_combinar', rotulo: 'a combinar' },
]

// A loja do prestador: serviços com preço que o cliente vê e contrata.
export function MinhaLoja() {
  const { data: prestador } = useMeuPrestador()
  const qc = useQueryClient()
  const [novo, setNovo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [preco, setPreco] = useState('')
  const [unidade, setUnidade] = useState<UnidadePreco>('por_servico')
  const [subcategoriaId, setSubcategoriaId] = useState('')

  // só as subcategorias que ele marcou no cadastro
  const { data: minhasSubs } = useQuery({
    queryKey: ['subs_da_loja', prestador?.id],
    enabled: Boolean(prestador?.id),
    queryFn: async () => {
      const { data } = await supabase
        .from('prestador_subcategorias')
        .select('subcategoria_id, subcategorias(id, nome)')
        .eq('prestador_id', prestador!.id)
      return (data ?? []).map(
        (r) => (r as unknown as { subcategorias: Subcategoria }).subcategorias,
      )
    },
  })

  const { data: servicos } = useQuery({
    queryKey: ['meus_servicos', prestador?.id],
    enabled: Boolean(prestador?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('servicos_loja')
        .select('id, titulo, descricao, unidade, preco_min, preco_max, subcategoria_id')
        .eq('prestador_id', prestador!.id)
        .eq('ativo', true)
      if (error) throw error
      return (data ?? []) as ServicoMeu[]
    },
  })

  const criar = useMutation({
    mutationFn: async () => {
      const valor = Number(preco.replace(/\./g, '').replace(',', '.'))
      const temPreco = Number.isFinite(valor) && valor > 0
      const { error } = await supabase.from('servicos_loja').insert({
        prestador_id: prestador!.id,
        subcategoria_id: subcategoriaId || minhasSubs?.[0]?.id,
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        unidade,
        preco_min: temPreco ? valor : null,
        preco_max: temPreco ? valor : null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      setTitulo('')
      setDescricao('')
      setPreco('')
      setNovo(false)
      qc.invalidateQueries({ queryKey: ['meus_servicos'] })
    },
    onError: (e) => setErro(e instanceof Error ? e.message : 'Não deu pra salvar.'),
  })

  const remover = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('servicos_loja').update({ ativo: false }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meus_servicos'] }),
  })

  if (!prestador) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Store className="h-6 w-6 text-igarape" />
        <h2 className="text-lg">Minha loja</h2>
      </div>
      <p className="text-sm text-tinta-suave">
        Coloque aqui os serviços com preço que você já sabe quanto cobra. O cliente vê e contrata
        direto.
      </p>

      {servicos?.map((s) => (
        <Cartao key={s.id}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-lg leading-tight">{s.titulo}</h3>
              {s.descricao && <p className="text-sm text-tinta-suave">{s.descricao}</p>}
              <p className="mt-1 font-bold text-igarape">
                {faixaPreco(s.preco_min, s.preco_max)} {sufixoUnidade(s.unidade)}
              </p>
            </div>
            <button
              onClick={() => remover.mutate(s.id)}
              aria-label="Remover serviço"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-areia-escura"
            >
              <Trash2 className="h-5 w-5 text-alerta" />
            </button>
          </div>
        </Cartao>
      ))}

      {novo ? (
        <Cartao>
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block font-bold">O que é?</span>
              <input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: Faxina de casa até 2 quartos"
                className="w-full rounded-2xl border-2 border-tinta/10 bg-white p-4 focus:border-igarape"
              />
            </label>

            {(minhasSubs?.length ?? 0) > 1 && (
              <label className="block">
                <span className="mb-1 block font-bold">De qual serviço?</span>
                <select
                  value={subcategoriaId || minhasSubs![0].id}
                  onChange={(e) => setSubcategoriaId(e.target.value)}
                  className="w-full rounded-2xl border-2 border-tinta/10 bg-white p-4 focus:border-igarape"
                >
                  {minhasSubs!.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="block">
              <span className="mb-1 block font-bold">Quanto custa?</span>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-bold text-tinta-suave">
                  R$
                </span>
                <input
                  value={preco}
                  onChange={(e) => setPreco(e.target.value)}
                  inputMode="decimal"
                  placeholder="0,00"
                  className="w-full rounded-2xl border-2 border-tinta/10 bg-white p-4 pl-12 focus:border-igarape"
                />
              </div>
            </label>

            <div className="flex flex-wrap gap-2">
              {UNIDADES.map((u) => (
                <button
                  key={u.valor}
                  onClick={() => setUnidade(u.valor)}
                  className={[
                    'min-h-[48px] rounded-2xl px-4 py-2 font-bold transition',
                    unidade === u.valor
                      ? 'bg-igarape text-white'
                      : 'bg-areia-escura/60 text-tinta',
                  ].join(' ')}
                >
                  {u.rotulo}
                </button>
              ))}
            </div>

            <label className="block">
              <span className="mb-1 block font-bold">Quer explicar melhor?</span>
              <textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={2}
                placeholder="Ex: inclui chão, banheiro e cozinha."
                className="w-full resize-none rounded-2xl border-2 border-tinta/10 bg-white p-4 focus:border-igarape"
              />
            </label>

            {erro && <p className="text-alerta">{erro}</p>}

            <div className="flex gap-2">
              <Botao variante="contorno" onClick={() => setNovo(false)}>
                Cancelar
              </Botao>
              <Botao
                variante="acao"
                bloco
                disabled={criar.isPending}
                onClick={() => {
                  setErro(null)
                  if (titulo.trim().length < 3) return setErro('Escreva o que é o serviço.')
                  criar.mutate()
                }}
              >
                {criar.isPending ? 'Salvando…' : 'Salvar serviço'}
              </Botao>
            </div>
          </div>
        </Cartao>
      ) : (
        <Botao variante="contorno" bloco icone={<Plus />} onClick={() => setNovo(true)}>
          Adicionar serviço com preço
        </Botao>
      )}
    </div>
  )
}
