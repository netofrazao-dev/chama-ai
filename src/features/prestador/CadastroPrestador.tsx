import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, Check, MapPin, Store, FileText, Zap } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/stores/authStore'
import { Botao, Cartao } from '@/components/ui'
import { CampoVoz } from '@/components/ui/CampoVoz'
import { SeletorLocal, CENTRO_BREVES } from './SeletorLocal'
import { useMeuPrestador, useMinhasSubcategorias, useMeusBairros } from './usePrestador'
import type { Bairro, Categoria, Subcategoria, ModoCobertura } from '@/lib/database.types'

// ------------------------------------------------------------
// Cadastro de prestador em 4 passos. Uma pergunta por tela, botão
// grande, e sempre dá pra voltar. Serve tanto pra criar quanto pra
// editar (se já existe ficha, os campos vêm preenchidos).
// ------------------------------------------------------------

type Passo = 0 | 1 | 2 | 3

const TITULOS = [
  'Fale de você',
  'O que você faz?',
  'Onde você atende?',
  'Como quer trabalhar?',
]

export function CadastroPrestador({ aoConcluir }: { aoConcluir?: () => void }) {
  const usuario = useAuth((s) => s.usuario)
  const qc = useQueryClient()
  const { data: meuPrestador, isLoading: carregandoFicha } = useMeuPrestador()
  const { data: minhasSubs } = useMinhasSubcategorias(meuPrestador?.id)
  const { data: meusBairros } = useMeusBairros(meuPrestador?.id)

  const [passo, setPasso] = useState<Passo>(0)
  const [erro, setErro] = useState<string | null>(null)

  // ---- estado do formulário ----
  const [bio, setBio] = useState('')
  const [subs, setSubs] = useState<string[]>([])
  const [modoCobertura, setModoCobertura] = useState<ModoCobertura>('bairros')
  const [bairrosSel, setBairrosSel] = useState<string[]>([])
  const [raioKm, setRaioKm] = useState(5)
  const [base, setBase] = useState<{ lat: number; lng: number } | null>(null)
  const [temLoja, setTemLoja] = useState(true)
  const [aceitaOrcamento, setAceitaOrcamento] = useState(true)
  const [aceitaRapido, setAceitaRapido] = useState(false)

  // preenche com o que já existe (modo edição)
  useEffect(() => {
    if (!meuPrestador) return
    setBio(meuPrestador.bio ?? '')
    setModoCobertura(meuPrestador.modo_cobertura)
    setRaioKm(Number(meuPrestador.raio_km ?? 5))
    if (meuPrestador.base_lat != null && meuPrestador.base_lng != null) {
      setBase({ lat: meuPrestador.base_lat, lng: meuPrestador.base_lng })
    }
    setTemLoja(meuPrestador.tem_loja)
    setAceitaOrcamento(meuPrestador.aceita_orcamento)
    setAceitaRapido(meuPrestador.aceita_pedido_rapido)
  }, [meuPrestador])

  useEffect(() => {
    if (minhasSubs?.length) setSubs(minhasSubs)
  }, [minhasSubs])

  useEffect(() => {
    if (meusBairros?.length) setBairrosSel(meusBairros)
  }, [meusBairros])

  // ---- dados de apoio ----
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
      const { data } = await supabase
        .from('subcategorias')
        .select('*')
        .eq('ativa', true)
        .order('ordem')
      return (data ?? []) as Subcategoria[]
    },
  })

  const { data: bairros } = useQuery({
    queryKey: ['bairros'],
    queryFn: async () => {
      const { data } = await supabase
        .from('bairros')
        .select('*')
        .eq('ativo', true)
        .order('nome')
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

  // ---- salvar ----
  const salvar = useMutation({
    mutationFn: async () => {
      if (!usuario) throw new Error('Você precisa entrar primeiro.')

      const ficha = {
        usuario_id: usuario.id,
        bio: bio.trim() || null,
        modo_cobertura: modoCobertura,
        raio_km: modoCobertura === 'raio' ? raioKm : null,
        base_lat: base?.lat ?? null,
        base_lng: base?.lng ?? null,
        tem_loja: temLoja,
        aceita_orcamento: aceitaOrcamento,
        aceita_pedido_rapido: aceitaRapido,
      }

      // 1) cria ou atualiza a ficha
      let prestadorId = meuPrestador?.id
      if (prestadorId) {
        const { error } = await supabase.from('prestadores').update(ficha).eq('id', prestadorId)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('prestadores')
          .insert(ficha)
          .select('id')
          .single()
        if (error) throw error
        prestadorId = (data as { id: string }).id
      }

      // 2) serviços: troca a lista inteira (simples e previsível)
      await supabase.from('prestador_subcategorias').delete().eq('prestador_id', prestadorId)
      if (subs.length) {
        const { error } = await supabase
          .from('prestador_subcategorias')
          .insert(subs.map((s) => ({ prestador_id: prestadorId, subcategoria_id: s })))
        if (error) throw error
      }

      // 3) bairros atendidos (só fazem sentido no modo 'bairros')
      await supabase.from('prestador_bairros').delete().eq('prestador_id', prestadorId)
      if (modoCobertura === 'bairros' && bairrosSel.length) {
        const { error } = await supabase
          .from('prestador_bairros')
          .insert(bairrosSel.map((b) => ({ prestador_id: prestadorId, bairro_id: b })))
        if (error) throw error
      }

      // 4) marca o usuário como prestador
      await supabase
        .from('usuarios')
        .update({ tipo: usuario.tipo === 'cliente' ? 'ambos' : usuario.tipo })
        .eq('id', usuario.id)

      return prestadorId
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meu_prestador'] })
      qc.invalidateQueries({ queryKey: ['feed_prestadores'] })
      aoConcluir?.()
    },
    onError: (e) => setErro(e instanceof Error ? e.message : 'Não deu pra salvar agora.'),
  })

  // ---- validação por passo ----
  function podeAvancar(): string | null {
    if (passo === 1 && subs.length === 0) return 'Escolha pelo menos um serviço que você faz.'
    if (passo === 2) {
      if (modoCobertura === 'bairros' && bairrosSel.length === 0)
        return 'Escolha pelo menos um bairro que você atende.'
      if (modoCobertura === 'raio' && !base)
        return 'Toque no mapa pra marcar de onde você sai.'
    }
    if (passo === 3 && !temLoja && !aceitaOrcamento && !aceitaRapido)
      return 'Escolha pelo menos um jeito de trabalhar.'
    return null
  }

  function avancar() {
    const problema = podeAvancar()
    if (problema) return setErro(problema)
    setErro(null)
    if (passo < 3) setPasso((passo + 1) as Passo)
    else salvar.mutate()
  }

  if (carregandoFicha) {
    return (
      <div className="flex min-h-[50dvh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-igarape/20 border-t-igarape" />
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-6">
      {/* progresso */}
      <div className="flex gap-1.5 pt-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i <= passo ? 'bg-igarape' : 'bg-areia-escura'}`}
          />
        ))}
      </div>

      <header>
        <p className="text-sm font-bold text-tinta-suave">Passo {passo + 1} de 4</p>
        <h1 className="text-xl">{TITULOS[passo]}</h1>
      </header>

      {/* ---------- PASSO 0: bio ---------- */}
      {passo === 0 && (
        <div className="space-y-3">
          <p className="text-tinta-suave">
            Conte pro cliente o que você faz e há quanto tempo. Pode falar em vez de digitar.
          </p>
          <CampoVoz
            valor={bio}
            aoMudar={setBio}
            placeholder="Ex: Faço faxina com capricho há 10 anos aqui em Breves."
          />
        </div>
      )}

      {/* ---------- PASSO 1: serviços ---------- */}
      {passo === 1 && (
        <div className="space-y-4">
          <p className="text-tinta-suave">Marque tudo que você sabe fazer.</p>
          {categorias?.map((c) => {
            const lista = porCategoria.get(c.id) ?? []
            if (!lista.length) return null
            return (
              <div key={c.id}>
                <h2 className="mb-2 text-lg">{c.nome}</h2>
                <div className="flex flex-wrap gap-2">
                  {lista.map((s) => {
                    const ativo = subs.includes(s.id)
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() =>
                          setSubs((prev) =>
                            ativo ? prev.filter((x) => x !== s.id) : [...prev, s.id],
                          )
                        }
                        className={[
                          'min-h-[48px] rounded-2xl px-4 py-2 text-base font-bold transition',
                          ativo
                            ? 'bg-igarape text-white'
                            : 'bg-white text-tinta shadow-card',
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

      {/* ---------- PASSO 2: cobertura ---------- */}
      {passo === 2 && (
        <div className="space-y-4">
          <div className="flex rounded-2xl bg-areia-escura p-1">
            {(
              [
                ['bairros', 'Por bairro'],
                ['raio', 'Por distância'],
              ] as [ModoCobertura, string][]
            ).map(([chave, rotulo]) => (
              <button
                key={chave}
                onClick={() => setModoCobertura(chave)}
                className={[
                  'flex-1 rounded-xl py-2.5 text-base font-bold transition',
                  modoCobertura === chave ? 'bg-white text-tinta shadow-card' : 'text-tinta-suave',
                ].join(' ')}
              >
                {rotulo}
              </button>
            ))}
          </div>

          {modoCobertura === 'bairros' ? (
            <>
              <p className="text-tinta-suave">Marque os bairros onde você aceita trabalhar.</p>
              <div className="flex flex-wrap gap-2">
                {bairros?.map((b) => {
                  const ativo = bairrosSel.includes(b.id)
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() =>
                        setBairrosSel((prev) =>
                          ativo ? prev.filter((x) => x !== b.id) : [...prev, b.id],
                        )
                      }
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
            </>
          ) : (
            <>
              <p className="text-tinta-suave">
                Toque no mapa pra marcar de onde você sai, e escolha até que distância aceita ir.
              </p>
              <SeletorLocal
                lat={base?.lat ?? null}
                lng={base?.lng ?? null}
                raioKm={raioKm}
                aoEscolher={(lat, lng) => setBase({ lat, lng })}
              />
              <div className="rounded-2xl bg-white p-4 shadow-card">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-bold">Até que distância?</span>
                  <span className="text-lg font-bold text-igarape">{raioKm} km</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={30}
                  step={1}
                  value={raioKm}
                  onChange={(e) => setRaioKm(Number(e.target.value))}
                  className="w-full accent-igarape"
                />
              </div>
              {!base && (
                <p className="flex items-center gap-2 text-tinta-suave">
                  <MapPin className="h-5 w-5" /> Toque no mapa pra marcar seu ponto.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* ---------- PASSO 3: modos ---------- */}
      {passo === 3 && (
        <div className="space-y-3">
          <p className="text-tinta-suave">Pode escolher mais de um. Dá pra mudar depois.</p>

          <OpcaoModo
            ativo={temLoja}
            aoAlternar={() => setTemLoja((v) => !v)}
            icone={<Store className="h-6 w-6" />}
            titulo="Ter minha loja"
            ajuda="Você põe seus serviços com preço e o cliente contrata direto."
          />
          <OpcaoModo
            ativo={aceitaOrcamento}
            aoAlternar={() => setAceitaOrcamento((v) => !v)}
            icone={<FileText className="h-6 w-6" />}
            titulo="Mandar orçamento"
            ajuda="Você vê quem está precisando e manda seu preço."
          />
          <OpcaoModo
            ativo={aceitaRapido}
            aoAlternar={() => setAceitaRapido((v) => !v)}
            icone={<Zap className="h-6 w-6" />}
            titulo="Atender na hora"
            ajuda="Quando estiver disponível, recebe chamado de quem precisa agora."
          />
        </div>
      )}

      {erro && <p className="text-alerta">{erro}</p>}

      {/* navegação */}
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
          disabled={salvar.isPending}
          icone={passo === 3 ? <Check /> : <ArrowRight />}
        >
          {salvar.isPending ? 'Salvando…' : passo === 3 ? 'Salvar meu cadastro' : 'Continuar'}
        </Botao>
      </div>
    </div>
  )
}

function OpcaoModo({
  ativo,
  aoAlternar,
  icone,
  titulo,
  ajuda,
}: {
  ativo: boolean
  aoAlternar: () => void
  icone: React.ReactNode
  titulo: string
  ajuda: string
}) {
  return (
    <Cartao onClick={aoAlternar} className={ativo ? '!border-2 !border-igarape' : ''}>
      <div className="flex items-start gap-3">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
            ativo ? 'bg-igarape text-white' : 'bg-areia-escura text-tinta-suave'
          }`}
        >
          {icone}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg leading-tight">{titulo}</h3>
            {ativo && <Check className="h-5 w-5 text-igarape" />}
          </div>
          <p className="text-sm text-tinta-suave">{ajuda}</p>
        </div>
      </div>
    </Cartao>
  )
}

export { CENTRO_BREVES }
