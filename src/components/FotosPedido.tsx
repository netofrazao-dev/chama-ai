import { useRef, useState } from 'react'
import { Camera, X, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/stores/authStore'

// Foto do serviço. Muda muito a qualidade do orçamento: quem vê o
// quintal tomado de mato dá um preço certo em vez de chutar.
//
// Caminho no Storage: pedidos/<uid>/<arquivo> — a política do bucket
// amarra a permissão de escrita à primeira pasta do caminho.

const MAX_FOTOS = 3
const MAX_BYTES = 5 * 1024 * 1024

export function FotosPedido({
  urls,
  aoMudar,
}: {
  urls: string[]
  aoMudar: (urls: string[]) => void
}) {
  const usuario = useAuth((s) => s.usuario)
  const inputRef = useRef<HTMLInputElement>(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function enviar(arquivos: FileList | null) {
    if (!arquivos?.length || !usuario) return
    setErro(null)

    const espaco = MAX_FOTOS - urls.length
    const lista = Array.from(arquivos).slice(0, espaco)
    if (lista.length === 0) return

    setEnviando(true)
    const novas: string[] = []

    for (const arquivo of lista) {
      if (arquivo.size > MAX_BYTES) {
        setErro('Cada foto precisa ter menos de 5 MB.')
        continue
      }
      const extensao = arquivo.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const caminho = `${usuario.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extensao}`

      const { error } = await supabase.storage.from('pedidos').upload(caminho, arquivo, {
        cacheControl: '3600',
        upsert: false,
      })

      if (error) {
        setErro('Não deu pra enviar a foto. Tente de novo.')
        continue
      }

      const { data } = supabase.storage.from('pedidos').getPublicUrl(caminho)
      novas.push(data.publicUrl)
    }

    setEnviando(false)
    if (novas.length) aoMudar([...urls, ...novas])
  }

  function remover(url: string) {
    aoMudar(urls.filter((u) => u !== url))
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {urls.map((url) => (
          <div key={url} className="relative">
            <img
              src={url}
              alt="Foto do serviço"
              className="h-24 w-24 rounded-2xl object-cover"
              loading="lazy"
            />
            <button
              type="button"
              onClick={() => remover(url)}
              aria-label="Tirar essa foto"
              className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-alerta text-white shadow-card"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}

        {urls.length < MAX_FOTOS && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={enviando}
            className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-tinta/20 bg-white text-tinta-suave"
          >
            {enviando ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <>
                <Camera className="h-6 w-6" />
                <span className="text-sm font-bold">Foto</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => {
          enviar(e.target.files)
          e.target.value = ''
        }}
      />

      {erro && <p className="text-alerta">{erro}</p>}
      <p className="text-sm text-tinta-suave">
        Mostrar o serviço ajuda muito quem vai te dar o preço. Até {MAX_FOTOS} fotos.
      </p>
    </div>
  )
}
