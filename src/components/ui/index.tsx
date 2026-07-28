import { type ButtonHTMLAttributes, type ReactNode } from 'react'

// ------------------------------------------------------------
// Componentes base. Poucos, grandes, com alvo de toque generoso.
// Regra do produto: toda ação principal tem no mínimo 56px de altura,
// texto legível e rótulo que diz o que acontece ("Chamar agora"),
// nunca um verbo de sistema ("Enviar").
// ------------------------------------------------------------

type Variante = 'acao' | 'principal' | 'suave' | 'contorno'

interface BotaoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante
  icone?: ReactNode
  bloco?: boolean
}

const estilos: Record<Variante, string> = {
  // laranja-tucupi: a cor do "chama". Usada só na ação principal da tela.
  acao: 'bg-tucupi text-white shadow-acao hover:bg-tucupi-escuro active:scale-[0.99]',
  // verde-igarapé: confirmações e navegação forte
  principal: 'bg-igarape text-white hover:bg-igarape-escuro active:scale-[0.99]',
  suave: 'bg-areia-escura text-tinta hover:bg-areia-escura/70',
  contorno: 'bg-transparent text-tinta border-2 border-tinta/15 hover:border-tinta/30',
}

export function Botao({
  variante = 'principal',
  icone,
  bloco,
  className = '',
  children,
  ...props
}: BotaoProps) {
  return (
    <button
      className={[
        'inline-flex min-h-toque items-center justify-center gap-2 rounded-xl px-5',
        'font-sans text-lg font-bold transition',
        'disabled:cursor-not-allowed disabled:opacity-50',
        estilos[variante],
        bloco ? 'w-full' : '',
        className,
      ].join(' ')}
      {...props}
    >
      {icone}
      {children}
    </button>
  )
}

interface CartaoProps {
  children: ReactNode
  className?: string
  onClick?: () => void
}

export function Cartao({ children, className = '', onClick }: CartaoProps) {
  const clicavel = Boolean(onClick)
  return (
    <div
      role={clicavel ? 'button' : undefined}
      tabIndex={clicavel ? 0 : undefined}
      onClick={onClick}
      onKeyDown={clicavel ? (e) => e.key === 'Enter' && onClick?.() : undefined}
      className={[
        'rounded-2xl bg-white p-4 shadow-card',
        clicavel ? 'cursor-pointer transition hover:shadow-lg active:scale-[0.99]' : '',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  )
}

export function Selo({
  children,
  cor = 'igarape',
}: {
  children: ReactNode
  cor?: 'igarape' | 'sol' | 'tucupi' | 'suave'
}) {
  const cores = {
    igarape: 'bg-igarape/12 text-igarape-escuro',
    sol: 'bg-sol/25 text-tinta',
    tucupi: 'bg-tucupi/12 text-tucupi-escuro',
    suave: 'bg-tinta/8 text-tinta-suave',
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-bold ${cores[cor]}`}
    >
      {children}
    </span>
  )
}
