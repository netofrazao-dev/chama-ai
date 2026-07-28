import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Gift, Wallet, RotateCcw, Users, Shield, HelpCircle } from 'lucide-react'
import { Cartao, Botao } from '@/components/ui'

// Transparência sobre dinheiro. Se a pessoa não entende quando vai
// pagar, ela não confia — e com razão. Esta página responde em
// linguagem simples, antes de alguém precisar perguntar.

export function ComoFunciona() {
  const navegar = useNavigate()
  const suporte = import.meta.env.VITE_SUPORTE_WHATSAPP as string | undefined

  return (
    <div className="space-y-4 pb-6">
      <button
        onClick={() => navegar(-1)}
        className="flex items-center gap-1 py-2 font-bold text-tinta-suave"
      >
        <ArrowLeft className="h-5 w-5" /> Voltar
      </button>

      <header>
        <h1 className="text-xl">Como funciona o Chama Aí</h1>
        <p className="mt-1 text-tinta-suave">Sem letra miúda. Aqui está tudo.</p>
      </header>

      {/* Cliente */}
      <Cartao>
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-igarape text-white">
          <Users className="h-6 w-6" />
        </div>
        <h2 className="text-lg">Para quem precisa de um serviço</h2>
        <p className="mt-1 text-2xl font-bold text-igarape">É de graça. Sempre.</p>
        <p className="mt-1 text-tinta-suave">
          Você não paga nada para pedir, comparar preços, escolher ou falar com o profissional. O
          preço do serviço você combina direto com ele.
        </p>
      </Cartao>

      {/* Prestador */}
      <Cartao>
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-tucupi text-white">
          <Wallet className="h-6 w-6" />
        </div>
        <h2 className="text-lg">Para quem faz o serviço</h2>
        <p className="mt-1 text-tinta-suave">
          Cadastrar é grátis. Aparecer para os clientes é grátis. Mandar seu preço nos pedidos é
          grátis.
        </p>
        <p className="mt-2 font-bold">
          Você só usa um contato quando o cliente escolhe você.
        </p>
        <p className="mt-1 text-tinta-suave">
          Quando alguém aceita seu orçamento, você toca em “Ver contato do cliente” e recebe o
          WhatsApp dele. Esse é o único momento em que se gasta um contato — e a escolha é sua, o
          app nunca desconta sozinho.
        </p>
      </Cartao>

      {/* Grátis */}
      <Cartao>
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-sol text-tinta">
          <Gift className="h-6 w-6" />
        </div>
        <h2 className="text-lg">Seus 10 primeiros são grátis</h2>
        <p className="mt-1 text-tinta-suave">
          Todo profissional começa com 10 contatos de graça. É para você experimentar e ver se
          traz trabalho antes de gastar qualquer coisa.
        </p>
        <p className="mt-2 font-bold">E quando acabarem?</p>
        <p className="mt-1 text-tinta-suave">
          Você compra mais contatos por PIX, a partir de cerca de R$ 3 cada, dependendo do tipo de
          serviço — um mototáxi custa menos que uma reforma. Nada é cobrado automaticamente e não
          existe mensalidade: você só compra quando quiser, e os contatos não vencem.
        </p>
        <p className="mt-2 rounded-xl bg-areia-escura/60 p-3 text-sm text-tinta-suave">
          A compra por PIX ainda está sendo preparada. Enquanto isso, se seus contatos acabarem,
          fale com a gente que a gente resolve.
        </p>
      </Cartao>

      {/* Devolução */}
      <Cartao>
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-igarape/12 text-igarape-escuro">
          <RotateCcw className="h-6 w-6" />
        </div>
        <h2 className="text-lg">Cliente sumiu? Você não perde</h2>
        <p className="mt-1 text-tinta-suave">
          Se você liberar o contato e a pessoa não responder, ou se o pedido for falso, a gente
          devolve seu contato. É só avisar.
        </p>
      </Cartao>

      {/* Segurança */}
      <Cartao>
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-tinta/8 text-tinta">
          <Shield className="h-6 w-6" />
        </div>
        <h2 className="text-lg">Sobre segurança</h2>
        <p className="mt-1 text-tinta-suave">
          Seu telefone não fica exposto para qualquer um. Ele só é mostrado para a pessoa com quem
          você fechou o serviço.
        </p>
        <p className="mt-2 text-tinta-suave">
          O Chama Aí aproxima as pessoas, mas quem faz o serviço é o profissional. O combinado de
          preço, prazo e garantia é entre vocês dois. Avalie depois — é o que ajuda o próximo
          vizinho a escolher bem.
        </p>
      </Cartao>

      {suporte && (
        <Botao
          variante="contorno"
          bloco
          icone={<HelpCircle />}
          onClick={() =>
            window.open(
              `https://wa.me/${suporte}?text=${encodeURIComponent('Olá! Tenho uma dúvida sobre o Chama Aí.')}`,
              '_blank',
              'noopener,noreferrer',
            )
          }
        >
          Falar com a gente
        </Botao>
      )}
    </div>
  )
}
