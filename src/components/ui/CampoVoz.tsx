import { useEffect, useRef, useState } from 'react'
import { Mic, Square, Type } from 'lucide-react'

// ------------------------------------------------------------
// CampoVoz — o diferencial do MVP para quem tem dificuldade de digitar.
//
// A pessoa fala; o texto aparece. Usa a Web Speech API (grátis, roda no
// Chrome Android). Onde não houver suporte, cai para digitação normal —
// nunca deixa a pessoa sem saída.
//
// Nota de arquitetura: a transcrição da Web Speech é ótima para preencher
// na hora, mas some se o navegador não suportar. No Milestone 1 gravamos
// TAMBÉM o áudio bruto e subimos para o Storage, e uma Edge Function com
// Whisper faz a transcrição de reserva no servidor. Aqui entregamos a
// captura de texto por voz + digitação, que já cobre a maioria dos casos.
// ------------------------------------------------------------

type SpeechRecognitionCtor = new () => any

function pegarRecognition(): SpeechRecognitionCtor | null {
  const w = window as any
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

interface Props {
  valor: string
  aoMudar: (texto: string) => void
  placeholder?: string
}

export function CampoVoz({ valor, aoMudar, placeholder }: Props) {
  const [ouvindo, setOuvindo] = useState(false)
  const [temVoz, setTemVoz] = useState(false)
  const recRef = useRef<any>(null)

  useEffect(() => {
    const Ctor = pegarRecognition()
    setTemVoz(Boolean(Ctor))
    if (!Ctor) return

    const rec = new Ctor()
    rec.lang = 'pt-BR'
    rec.continuous = true
    rec.interimResults = true

    let base = ''
    rec.onstart = () => {
      base = valor ? valor.trim() + ' ' : ''
    }
    rec.onresult = (e: any) => {
      let texto = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        texto += e.results[i][0].transcript
      }
      aoMudar((base + texto).trim())
    }
    rec.onend = () => setOuvindo(false)
    rec.onerror = () => setOuvindo(false)

    recRef.current = rec
    return () => rec.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function alternar() {
    const rec = recRef.current
    if (!rec) return
    if (ouvindo) {
      rec.stop()
      setOuvindo(false)
    } else {
      try {
        rec.start()
        setOuvindo(true)
      } catch {
        /* já iniciado */
      }
    }
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <textarea
          value={valor}
          onChange={(e) => aoMudar(e.target.value)}
          placeholder={placeholder ?? 'Conte o que você precisa…'}
          rows={3}
          className="w-full resize-none rounded-2xl border-2 border-tinta/10 bg-white p-4 pr-14 text-base
                     placeholder:text-tinta-suave/60 focus:border-igarape"
        />
        <Type className="pointer-events-none absolute right-4 top-4 h-5 w-5 text-tinta-suave/40" />
      </div>

      {temVoz ? (
        <button
          type="button"
          onClick={alternar}
          className={[
            'flex min-h-toque w-full items-center justify-center gap-3 rounded-2xl px-5 text-lg font-bold transition',
            ouvindo
              ? 'bg-alerta text-white animate-pulse'
              : 'bg-igarape/10 text-igarape-escuro hover:bg-igarape/15',
          ].join(' ')}
        >
          {ouvindo ? (
            <>
              <Square className="h-5 w-5" fill="currentColor" /> Parar de falar
            </>
          ) : (
            <>
              <Mic className="h-5 w-5" /> Falar em vez de digitar
            </>
          )}
        </button>
      ) : (
        <p className="px-1 text-sm text-tinta-suave">
          Seu telefone não deixa falar aqui. Pode digitar acima.
        </p>
      )}
    </div>
  )
}
