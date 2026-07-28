import { useState } from 'react'
import { Briefcase, LogOut, Star, Wallet, Pencil, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/stores/authStore'
import { Botao, Cartao, Selo } from '@/components/ui'
import { useMeuPrestador } from './usePrestador'
import { CadastroPrestador } from './CadastroPrestador'
import { MinhaLoja } from './MinhaLoja'
import { seloNivel } from '@/lib/formato'

export function Perfil() {
  const { usuario, sair } = useAuth()
  const { data: prestador, isLoading } = useMeuPrestador()
  const [editando, setEditando] = useState(false)

  if (editando) {
    return (
      <div>
        <button
          onClick={() => setEditando(false)}
          className="mb-2 py-2 font-bold text-tinta-suave underline"
        >
          Cancelar
        </button>
        <CadastroPrestador aoConcluir={() => setEditando(false)} />
      </div>
    )
  }

  const selo = prestador ? seloNivel(prestador.nivel) : null

  return (
    <div className="space-y-4 pb-4">
      <header className="pt-2">
        <h1 className="text-xl">{usuario?.nome}</h1>
        <p className="text-tinta-suave">{usuario?.telefone}</p>
      </header>

      {isLoading ? (
        <div className="h-32 animate-pulse rounded-2xl bg-areia-escura" />
      ) : prestador ? (
        <>
          {/* Painel resumido do prestador */}
          <Cartao>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg">Meu trabalho</h2>
              {selo && <Selo cor={selo.cor}>{selo.rotulo}</Selo>}
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-areia-escura/60 p-3">
                <Star className="mx-auto mb-1 h-5 w-5 text-sol" />
                <p className="text-lg font-bold leading-none">
                  {prestador.total_avaliacoes > 0 ? prestador.nota_media.toFixed(1) : '—'}
                </p>
                <p className="text-sm text-tinta-suave">nota</p>
              </div>
              <div className="rounded-xl bg-areia-escura/60 p-3">
                <CheckCircle2 className="mx-auto mb-1 h-5 w-5 text-igarape" />
                <p className="text-lg font-bold leading-none">{prestador.total_concluidos}</p>
                <p className="text-sm text-tinta-suave">serviços</p>
              </div>
              <div className="rounded-xl bg-areia-escura/60 p-3">
                <Wallet className="mx-auto mb-1 h-5 w-5 text-tucupi" />
                <p className="text-lg font-bold leading-none">
                  {prestador.credito_disponivel + prestador.leads_gratis_restantes}
                </p>
                <p className="text-sm text-tinta-suave">contatos</p>
              </div>
            </div>

            {prestador.leads_gratis_restantes > 0 && (
              <p className="mt-3 rounded-xl bg-igarape/10 p-3 text-sm font-bold text-igarape-escuro">
                Você tem {prestador.leads_gratis_restantes} contatos grátis para começar.
              </p>
            )}

            <Botao
              variante="contorno"
              bloco
              className="mt-3"
              icone={<Pencil className="h-5 w-5" />}
              onClick={() => setEditando(true)}
            >
              Mudar meu cadastro
            </Botao>
          </Cartao>

          {prestador.tem_loja && <MinhaLoja />}
        </>
      ) : (
        /* Convite pra virar prestador */
        <Cartao>
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-tucupi text-white">
            <Briefcase className="h-6 w-6" />
          </div>
          <h2 className="text-lg">Você faz algum serviço?</h2>
          <p className="mt-1 text-tinta-suave">
            Cadastre o que você sabe fazer e apareça para quem está procurando aqui em Breves. É de
            graça, e você ganha os primeiros contatos sem pagar nada.
          </p>
          <Botao variante="acao" bloco className="mt-3" onClick={() => setEditando(true)}>
            Quero oferecer meu serviço
          </Botao>
        </Cartao>
      )}

      <Botao variante="suave" bloco icone={<LogOut className="h-5 w-5" />} onClick={() => sair()}>
        Sair
      </Botao>
    </div>
  )
}
