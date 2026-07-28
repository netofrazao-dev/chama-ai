import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Copy, Check, Wallet, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Botao, Cartao, Selo } from '@/components/ui'
import { useMeuPrestador } from './usePrestador'
import { reais, tempoRelativo } from '@/lib/formato'
import { gerarPixCopiaECola, urlQrCode } from '@/lib/pix'

interface Pacote {
  id: string
  nome: string
  creditos: number
  valor_reais: number
  destaque: boolean
}

export function ComprarCreditos() {
  const navegar = useNavigate()
  const qc = useQueryClient()
  const { data: prestador } = useMeuPrestador()
  const [escolhido, setEscolhido] = useState<Pacote | null>(null)
  const [copiado, setCopiado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const { data: pacotes } = useQuery({
    queryKey: ['pacotes'],
    queryFn: async () => {
      const { data } = await supabase
        .from('pacotes_creditos')
        .select('*')
        .eq('ativo', true)
        .order('ordem')
      return (data ?? []) as Pacote[]
    },
  })

  const { data: config } = useQuery({
    queryKey: ['config_pix'],
    queryFn: async () => {
      const { data } = await supabase.from('configuracoes').select('chave, valor')
      const mapa: Record<string, string> = {}
      for (const c of (data ?? []) as { chave: string; valor: string }[]) mapa[c.chave] = c.valor
      return mapa
    },
  })

  const { data: minhasCompras } = useQuery({
    queryKey: ['minhas_compras', prestador?.id],
    enabled: Boolean(prestador?.id),
    queryFn: async () => {
      const { data } = await supabase
        .from('compras_creditos')
        .select('id, pacote, creditos, valor_reais, status, criado_em')
        .eq('prestador_id', prestador!.id)
        .order('criado_em', { ascending: false })
        .limit(5)
      return (data ?? []) as {
        id: string
        pacote: string
        creditos: number
        valor_reais: number
        status: string
        criado_em: string
      }[]
    },
  })

  const comprar = useMutation({
    mutationFn: async (pacote: Pacote) => {
      const { error } = await supabase.rpc('criar_compra_creditos', { p_pacote_id: pacote.id })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['minhas_compras'] }),
    onError: () => setErro('Não deu pra registrar sua compra. Tente de novo.'),
  })

  const chavePix = config?.pix_chave ?? ''
  const temPix = chavePix.trim().length > 0

  const payload =
    escolhido && temPix
      ? gerarPixCopiaECola({
          chave: chavePix,
          nome: config?.pix_nome || 'CHAMA AI',
          cidade: config?.pix_cidade || 'BREVES',
          valor: Number(escolhido.valor_reais),
          identificador: escolhido.creditos + 'CONT',
        })
      : ''

  async function copiar() {
    try {
      await navigator.clipboard.writeText(payload)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    } catch {
      setErro('Não deu pra copiar. Segure o dedo no código para copiar à mão.')
    }
  }

  return (
    <div className="space-y-4 pb-6">
      <button
        onClick={() => navegar(-1)}
        className="flex items-center gap-1 py-2 font-bold text-tinta-suave"
      >
        <ArrowLeft className="h-5 w-5" /> Voltar
      </button>

      <header>
        <h1 className="text-xl">Comprar contatos</h1>
        <p className="mt-1 text-tinta-suave">
          Você tem{' '}
          <b className="text-tinta">
            {(prestador?.credito_disponivel ?? 0) + (prestador?.leads_gratis_restantes ?? 0)}
          </b>{' '}
          contatos. Eles não vencem.
        </p>
      </header>

      {!escolhido ? (
        <div className="space-y-3">
          {pacotes?.map((p) => (
            <Cartao
              key={p.id}
              onClick={() => {
                setErro(null)
                setEscolhido(p)
                comprar.mutate(p)
              }}
              className={p.destaque ? '!border-2 !border-tucupi' : ''}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg leading-tight">{p.nome}</h2>
                    {p.destaque && <Selo cor="tucupi">Mais escolhido</Selo>}
                  </div>
                  <p className="text-sm text-tinta-suave">
                    {reais(Number(p.valor_reais) / p.creditos)} por contato
                  </p>
                </div>
                <p className="shrink-0 text-xl font-bold text-igarape">
                  {reais(Number(p.valor_reais))}
                </p>
              </div>
            </Cartao>
          ))}

          {(minhasCompras?.length ?? 0) > 0 && (
            <section className="pt-2">
              <h2 className="mb-2 text-lg">Suas compras</h2>
              <div className="space-y-2">
                {minhasCompras!.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-xl bg-white p-3 shadow-card"
                  >
                    <div>
                      <p className="font-bold">{c.pacote}</p>
                      <p className="text-sm text-tinta-suave">{tempoRelativo(c.criado_em)}</p>
                    </div>
                    <Selo cor={c.status === 'pago' ? 'igarape' : 'sol'}>
                      {c.status === 'pago' ? 'Liberado' : 'Conferindo'}
                    </Selo>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        <Cartao>
          <div className="text-center">
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-igarape text-white">
              <Wallet className="h-7 w-7" />
            </div>
            <h2 className="text-lg">{escolhido.nome}</h2>
            <p className="text-2xl font-bold text-igarape">
              {reais(Number(escolhido.valor_reais))}
            </p>
          </div>

          {temPix ? (
            <>
              <div className="mt-4 flex justify-center">
                <img
                  src={urlQrCode(payload)}
                  alt="QR Code do PIX"
                  className="h-56 w-56 rounded-2xl bg-white p-2"
                />
              </div>

              <p className="mt-3 text-center text-tinta-suave">
                Aponte a câmera do seu banco, ou copie o código:
              </p>

              <div className="mt-2 break-all rounded-xl bg-areia-escura/60 p-3 text-sm">
                {payload}
              </div>

              <Botao
                variante="acao"
                bloco
                className="mt-2"
                icone={copiado ? <Check /> : <Copy />}
                onClick={copiar}
              >
                {copiado ? 'Código copiado!' : 'Copiar código PIX'}
              </Botao>
            </>
          ) : (
            <p className="mt-4 rounded-xl bg-sol/25 p-4 text-center">
              A chave PIX ainda não foi configurada. Fale com a gente que a gente libera seus
              contatos na hora.
            </p>
          )}

          <div className="mt-4 rounded-xl bg-igarape/10 p-3">
            <p className="flex items-center gap-2 font-bold text-igarape-escuro">
              <Clock className="h-5 w-5" /> Depois de pagar
            </p>
            <p className="mt-1 text-sm text-tinta-suave">
              A gente confere e libera seus contatos. Costuma ser rápido, mas pode levar algumas
              horas. Você não precisa fazer mais nada.
            </p>
          </div>

          {erro && <p className="mt-2 text-alerta">{erro}</p>}

          <Botao variante="contorno" bloco className="mt-3" onClick={() => setEscolhido(null)}>
            Escolher outro pacote
          </Botao>
        </Cartao>
      )}
    </div>
  )
}
