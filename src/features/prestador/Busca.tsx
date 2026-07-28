import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { CardPrestador, type FeedPrestador } from '@/features/vitrine/cards'

// Busca por nome do profissional ou pelo serviço que ele faz.
// Em Breves a base é pequena (dezenas/centenas), então carregamos a
// lista uma vez e filtramos no aparelho — resposta instantânea e
// funciona mesmo com internet ruim. Quando a base crescer, troca-se
// por busca no servidor (índice pg_trgm já está criado na migration).
function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function Busca() {
  const [termo, setTermo] = useState('')
  const navegar = useNavigate()

  const { data: prestadores, isLoading } = useQuery({
    queryKey: ['feed_prestadores', 'todos'],
    queryFn: async () => {
      const { data, error } = await supabase.from('feed_prestadores').select('*').limit(300)
      if (error) throw error
      return (data ?? []) as FeedPrestador[]
    },
  })

  const resultados = useMemo(() => {
    const q = normalizar(termo.trim())
    if (!q) return []
    return (prestadores ?? []).filter((p) => {
      const alvo = normalizar([p.nome, ...(p.servicos ?? []), ...(p.bairros_atendidos ?? [])].join(' '))
      return alvo.includes(q)
    })
  }, [termo, prestadores])

  function tocar(p: FeedPrestador) {
    navegar(`/prestador/${p.id}`)
  }

  return (
    <div className="space-y-4 pb-4">
      <header className="pt-2">
        <h1 className="text-xl">Buscar</h1>
        <p className="text-tinta-suave">Procure pelo nome ou pelo serviço.</p>
      </header>

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-tinta-suave/50" />
        <input
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          placeholder="Ex: pedreiro, faxina, Maria…"
          className="w-full rounded-2xl border-2 border-tinta/10 bg-white p-4 pl-12 pr-12 text-base focus:border-igarape"
        />
        {termo && (
          <button
            onClick={() => setTermo('')}
            aria-label="Limpar busca"
            className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-areia-escura"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isLoading && <div className="h-28 animate-pulse rounded-2xl bg-areia-escura" />}

      {!termo && !isLoading && (
        <div className="rounded-2xl bg-white p-8 text-center shadow-card">
          <p className="text-tinta-suave">Escreva acima o que você procura.</p>
        </div>
      )}

      {termo && resultados.length === 0 && !isLoading && (
        <div className="rounded-2xl bg-white p-8 text-center shadow-card">
          <p className="text-tinta-suave">
            Não achamos ninguém para “{termo}”. Tente outra palavra.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {resultados.map((p) => (
          <CardPrestador key={p.id} p={p} aoTocar={tocar} />
        ))}
      </div>
    </div>
  )
}
