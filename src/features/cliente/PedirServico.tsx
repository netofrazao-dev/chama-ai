import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, Check, Zap, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/stores/authStore'
import { Botao, Cartao } from '@/components/ui'
import { CampoVoz } from '@/components/ui/CampoVoz'
import { FotosPedido } from '@/components/FotosPedido'
import type { Bairro, Categoria, Subcategoria, ModoPedido } from '@/lib/database.types'

// ------------------------------------------------------------
// "Preciso de um serviço" — o caminho de quem CONTRATA.
// 4 passos, um por tela: o que precisa, contar o caso, onde/quando,
// e com que urgência. Sem formulário longo, sem palavra difícil.
// ------------------------------------------------------------

type Passo = 0 | 1 | 2 | 3

const PRAZOS = ['Hoje', 'Amanhã', 'Essa semana', 'Esse mês', 'Sem pressa']

export function PedirServico({
  subcategoriaInicial,
  aoConcluir,
  aoCancelar,
}: {
  subcategoriaInicial?: string
  aoConcluir?: () => void
  aoCancelar?: () => void
}) {
  const usuario = useAuth((s) => s.usuario)
  const qc = useQueryClient()

  const [passo, setPasso] = useState<Passo>(subcategoriaInicial ? 1 : 0)
  const [erro, setErro] = useState<string | null>(null)
  const [pronto, setPronto] = useState(false)

  const [subcategoriaId, setSubcategoriaId] = useState<string | null>(
    subcategoriaInicial ?? null,
  )
  const [descricao, setDescricao] = useState('')
  const [fotos, setFotos] = useState<string[]>([])
  const [bairroId, setBairroId] = useState<string | null>(null)
  const [prazo, setPrazo] = useState<string>('Essa semana')
  const [modo, setModo] = useState<ModoPedido>('orcamento')

  const { data: categorias } = useQuery({
    queryKey: ['categorias'],
    queryFn: async () => {
      const { data } = await supabase.from('categorias').select('*').eq('ativa', true).order('ordem')
      return (data ?? []) as Categoria[]
    },
  })

  const { data: subcategorias } = useQuery({
    queryKey: ['subcategorias'],
    queryFn: async () => {
      const { data } = await supabase.from('subcategorias').select('*').eq('ativa', true).order('ordem')
      return (data ?? []) as Subcategoria[]
    },
  })

  const { data: bairros } = useQuery({
    queryKey: ['bairros'],
    queryFn: async () => {
      const { data } = await supabase.from('bairros').select('*').eq('ativo', true).order('nome')
      return (data ?? []) as Bairro[]
    },
  })

  const porCategoria = useMemo(() => {
    const mapa = new Map<string, Subcategoria[]>()
    for (const s of subcategorias ?? []) {
      const lista = mapa.get(s.categoria_id) ?? []
      lista.push(s)
      mapa.set(s.categoria_id, lista)
    }
    return mapa
  }, [subcategorias])

  const nomeServico =
    subcategorias?.find((s) => s.id === subcategoriaId)?.nome ?? 'serviço'

  const criar = useMutation({
    mutationFn: async () => {
      if (!usuario) throw new Error('Você precisa entrar primeiro.')
      const { error } = await supabase.from('pedidos').insert({
        cliente_id: usuario.id,
        modo,
        subcategoria_id: subcategoriaId,
        descricao: descricao.trim() || null,
        foto_urls: fotos,
        bairro_id: bairroId,
        prazo_desejado: prazo,
        status: 'aberto',
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feed_pedidos'] })
      qc.invalidateQueries({ queryKey: ['meus_pedidos'] })
      setPronto(true)
    },
    onError: (e) => setErro(e instanceof Error ? e.message : 'Não deu pra enviar agora.'),
  })

  function validar(): string | null {
    if (passo === 0 && !subcategoriaId) return 'Escolha o que você precisa.'
    if (passo === 1 && descricao.trim().length < 5)
      return 'Conte um pouquinho do que você precisa.'
    if (passo === 2 && !bairroId) return 'Escolha o seu bairro.'
    return null
  }

  function avancar() {
    const problema = validar()
    if (problema) return setErro(problema)
    setErro(null)
    if (passo < 3) setPasso((passo + 1) as Passo)
    else criar.mutate()
  }

  // ---------- tela de sucesso ----------
  if (pronto) {
    return (
      <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-igarape text-white">
          <Check className="h-10 w-10" />
        </div>
        <h2 className="text-xl">Pedido enviado!</h2>
        <p className="max-w-xs text-tinta-suave">
          {modo === 'rapido'
            ? 'Estamos avisando quem está por perto. Fique de olho no seu celular.'
            : 'Os profissionais de Breves já podem ver seu pedido e mandar o preço.'}
        </p>
        <Botao variante="principal" onClick={() => aoConcluir?.()}>
          Ver meus pedidos
        </Botao>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-6">
      <div className="flex gap-1.5 pt-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i <= passo ? 'bg-tucupi' : 'bg-areia-escura'}`}
          />
        ))}
      </div>

      <header className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-tinta-suave">Passo {passo + 1} de 4</p>
          <h1 className="text-xl">
            {['O que você precisa?', 'Conte o que é', 'Onde e quando?', 'É pra agora?'][passo]}
          </h1>
        </div>
        {aoCancelar && (
          <button onClick={aoCancelar} className="py-1 text-tinta-suave underline">
            Sair
          </button>
        )}
      </header>

      {/* ---------- 0: escolher serviço ---------- */}
      {passo === 0 && (
        <div className="space-y-4">
          {categorias?.map((c) => {
            const lista = porCategoria.get(c.id) ?? []
            if (!lista.length) return null
            return (
              <div key={c.id}>
                <h2 className="mb-2 text-lg">{c.nome}</h2>
                <div className="flex flex-wrap gap-2">
                  {lista.map((s) => {
                    const ativo = subcategoriaId === s.id
                    return (
                      <button
                        key={s.id}
                        onClick={() => setSubcategoriaId(s.id)}
                        className={[
                          'min-h-[48px] rounded-2xl px-4 py-2 text-base font-bold transition',
                          ativo ? 'bg-tucupi text-white' : 'bg-white text-tinta shadow-card',
                        ].join(' ')}
                      >
                        {ativo && <Check className="mr-1 inline h-4 w-4" />}
                        {s.nome}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ---------- 1: descrição ---------- */}
      {passo === 1 && (
        <div className="space-y-3">
          <p className="text-tinta-suave">
            Explique o que você precisa de <b>{nomeServico.toLowerCase()}</b>. Pode falar em vez de
            digitar.
          </p>
          <CampoVoz
            valor={descricao}
            aoMudar={setDescricao}
            placeholder="Ex: meu quintal tá tomado de mato, preciso capinar tudo."
          />

          <div className="pt-1">
            <span className="mb-2 block font-bold">Quer mostrar uma foto?</span>
            <FotosPedido urls={fotos} aoMudar={setFotos} />
          </div>
        </div>
      )}

      {/* ---------- 2: onde e quando ---------- */}
      {passo === 2 && (
        <div className="space-y-5">
          <div>
            <h2 className="mb-2 text-lg">Qual seu bairro?</h2>
            <div className="flex flex-wrap gap-2">
              {bairros?.map((b) => {
                const ativo = bairroId === b.id
                return (
                  <button
                    key={b.id}
                    onClick={() => setBairroId(b.id)}
                    className={[
                      'min-h-[48px] rounded-2xl px-4 py-2 text-base font-bold transition',
                      ativo ? 'bg-igarape text-white' : 'bg-white text-tinta shadow-card',
                    ].join(' ')}
                  >
                    {ativo && <Check className="mr-1 inline h-4 w-4" />}
                    {b.nome}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-lg">Pra quando?</h2>
            <div className="flex flex-wrap gap-2">
              {PRAZOS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPrazo(p)}
                  className={[
                    'min-h-[48px] rounded-2xl px-4 py-2 text-base font-bold transition',
                    prazo === p ? 'bg-igarape text-white' : 'bg-white text-tinta shadow-card',
                  ].join(' ')}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ---------- 3: urgência ---------- */}
      {passo === 3 && (
        <div className="space-y-3">
          <Cartao
            onClick={() => setModo('orcamento')}
            className={modo === 'orcamento' ? '!border-2 !border-igarape' : ''}
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                  modo === 'orcamento' ? 'bg-igarape text-white' : 'bg-areia-escura text-tinta-suave'
                }`}
              >
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg leading-tight">Quero comparar preços</h3>
                <p className="text-sm text-tinta-suave">
                  Vários profissionais mandam o preço e você escolhe o melhor.
                </p>
              </div>
            </div>
          </Cartao>

          <Cartao
            onClick={() => setModo('rapido')}
            className={modo === 'rapido' ? '!border-2 !border-tucupi' : ''}
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                  modo === 'rapido' ? 'bg-tucupi text-white' : 'bg-areia-escura text-tinta-suave'
                }`}
              >
                <Zap className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg leading-tight">Preciso pra já</h3>
                <p className="text-sm text-tinta-suave">
                  Avisamos quem está disponível agora e por perto.
                </p>
              </div>
            </div>
          </Cartao>

          <div className="rounded-2xl bg-white p-4 shadow-card">
            <p className="font-bold">Resumo</p>
            <p className="mt-1 text-tinta-suave">
              {nomeServico} · {bairros?.find((b) => b.id === bairroId)?.nome} · {prazo}
            </p>
          </div>
        </div>
      )}

      {erro && <p className="text-alerta">{erro}</p>}

      <div className="flex gap-2 pt-2">
        {passo > 0 && (
          <Botao
            variante="contorno"
            icone={<ArrowLeft />}
            onClick={() => {
              setErro(null)
              setPasso((passo - 1) as Passo)
            }}
          >
            Voltar
          </Botao>
        )}
        <Botao
          variante="acao"
          bloco
          onClick={avancar}
          disabled={criar.isPending}
          icone={passo === 3 ? <Check /> : <ArrowRight />}
        >
          {criar.isPending ? 'Enviando…' : passo === 3 ? 'Enviar meu pedido' : 'Continuar'}
        </Botao>
      </div>
    </div>
  )
}
