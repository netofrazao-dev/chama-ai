import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Search, Briefcase, LogOut, Star, Wallet, Pencil, CheckCircle2,
  HelpCircle, ShieldCheck, Plus,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/stores/authStore'
import { Botao, Cartao, Selo } from '@/components/ui'
import { useMeuPrestador } from './usePrestador'
import { CadastroPrestador } from './CadastroPrestador'
import { MinhaLoja } from './MinhaLoja'
import { seloNivel } from '@/lib/formato'

// O perfil serve aos DOIS papéis. Quem chegou atrás de alguém para
// resolver um problema vê primeiro o caminho de contratar; oferecer
// serviço é um convite abaixo, não a primeira coisa da tela.

export function Perfil() {
  const { usuario, sair } = useAuth()
  const { data: prestador, isLoading } = useMeuPrestador()
  const [editando, setEditando] = useState(false)
  const navegar = useNavigate()

  const { data: souAdmin } = useQuery({
    queryKey: ['sou_admin', usuario?.id],
    enabled: Boolean(usuario?.id),
    queryFn: async () => {
      const { data } = await supabase.rpc('resumo_admin')
      return ((data ?? []) as unknown[]).length > 0
    },
  })

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
        <p className="text-tinta-suave">{usuario?.whatsapp || usuario?.telefone}</p>
      </header>

      {/* ---- Caminho de quem contrata: sempre primeiro ---- */}
      <Cartao>
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-tucupi text-white">
          <Search className="h-6 w-6" />
        </div>
        <h2 className="text-lg">Precisa de alguém?</h2>
        <p className="mt-1 text-tinta-suave">
          Conte o que você precisa e receba o preço de vários profissionais aqui de Breves.
        </p>
        <div className="mt-3 flex gap-2">
          <Botao variante="acao" bloco icone={<Plus />} onClick={() => navegar('/pedir')}>
            Pedir um serviço
          </Botao>
          <Botao variante="contorno" onClick={() => navegar('/pedidos')}>
            Meus pedidos
          </Botao>
        </div>
      </Cartao>

      {/* ---- Caminho de quem trabalha ---- */}
      {isLoading ? (
        <div className="h-32 animate-pulse rounded-2xl bg-areia-escura" />
      ) : prestador ? (
        <>
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

            <div className="mt-3 flex gap-2">
              <Botao
                variante="principal"
                bloco
                icone={<Wallet className="h-5 w-5" />}
                onClick={() => navegar('/creditos')}
              >
                Comprar contatos
              </Botao>
              <Botao
                variante="contorno"
                icone={<Pencil className="h-5 w-5" />}
                onClick={() => setEditando(true)}
              >
                Editar
              </Botao>
            </div>
          </Cartao>

          {prestador.tem_loja && <MinhaLoja />}
        </>
      ) : (
        <Cartao>
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-igarape text-white">
            <Briefcase className="h-6 w-6" />
          </div>
          <h2 className="text-lg">Você também faz algum serviço?</h2>
          <p className="mt-1 text-tinta-suave">
            Cadastre o que você sabe fazer e apareça para quem procura aqui em Breves. É de graça,
            e você começa com 10 contatos sem pagar nada.
          </p>
          <Botao variante="principal" bloco className="mt-3" onClick={() => setEditando(true)}>
            Quero oferecer meu serviço
          </Botao>
        </Cartao>
      )}

      {/* ---- Rodapé ---- */}
      <div className="space-y-2 pt-2">
        {souAdmin && (
          <Botao
            variante="contorno"
            bloco
            icone={<ShieldCheck className="h-5 w-5" />}
            onClick={() => navegar('/admin')}
          >
            Administração
          </Botao>
        )}
        <Botao
          variante="suave"
          bloco
          icone={<HelpCircle className="h-5 w-5" />}
          onClick={() => navegar('/como-funciona')}
        >
          Como funciona
        </Botao>
        <Botao variante="suave" bloco icone={<LogOut className="h-5 w-5" />} onClick={() => sair()}>
          Sair
        </Botao>
      </div>
    </div>
  )
}
