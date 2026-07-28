import { useState } from 'react'
import { MeusPedidos } from './MeusPedidos'
import { MeusTrabalhos } from '@/features/prestador/MeusTrabalhos'
import { useMeuPrestador } from '@/features/prestador/usePrestador'

// Quem só contrata vê apenas seus pedidos.
// Quem também trabalha ganha duas sub-abas — sem criar um quinto item
// na navegação de baixo, que ficaria apertado no celular.
export function PedidosETrabalhos() {
  const { data: prestador } = useMeuPrestador()
  const [aba, setAba] = useState<'pedi' | 'trabalhei'>('pedi')

  if (!prestador) return <MeusPedidos />

  return (
    <div className="space-y-3">
      <div className="mt-2 flex rounded-2xl bg-areia-escura p-1">
        {(
          [
            ['pedi', 'O que pedi'],
            ['trabalhei', 'Meus trabalhos'],
          ] as ['pedi' | 'trabalhei', string][]
        ).map(([chave, rotulo]) => (
          <button
            key={chave}
            onClick={() => setAba(chave)}
            className={[
              'flex-1 rounded-xl py-2.5 text-base font-bold transition',
              aba === chave ? 'bg-white text-tinta shadow-card' : 'text-tinta-suave',
            ].join(' ')}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {aba === 'pedi' ? <MeusPedidos /> : <MeusTrabalhos />}
    </div>
  )
}
