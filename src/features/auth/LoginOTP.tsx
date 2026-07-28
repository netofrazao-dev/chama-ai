import { useState } from 'react'
import { Phone, MessageCircle, ArrowRight } from 'lucide-react'
import { useAuth, precisaEscolherNome } from '@/stores/authStore'
import { Botao } from '@/components/ui'

// Login em até 3 telas, uma coisa por vez:
//   1) número  2) código  3) nome (SÓ na primeira vez)
// Quem já tem conta entra com número + código e pronto — não precisa
// lembrar como escreveu o nome no cadastro.

function paraE164(bruto: string): string {
  const digitos = bruto.replace(/\D/g, '')
  if (digitos.startsWith('55')) return '+' + digitos
  return '+55' + digitos
}

export function LoginOTP({ compacto = false }: { compacto?: boolean }) {
  const {
    enviarCodigo,
    confirmarCodigo,
    salvarNome,
    cancelarVerificacao,
    telefoneEmVerificacao,
    usuario,
  } = useAuth()

  const [telefone, setTelefone] = useState('')
  const [codigo, setCodigo] = useState('')
  const [nome, setNome] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  // qual tela mostrar
  const etapa: 'telefone' | 'codigo' | 'nome' = precisaEscolherNome(usuario)
    ? 'nome'
    : telefoneEmVerificacao
      ? 'codigo'
      : 'telefone'

  async function pedirCodigo() {
    setErro(null)
    if (telefone.replace(/\D/g, '').length < 10)
      return setErro('Coloque seu número com o DDD.')
    setOcupado(true)
    try {
      await enviarCodigo(paraE164(telefone))
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      setErro(
        msg
          ? `Não deu pra enviar o código. Detalhe: ${msg}`
          : 'Não deu pra enviar o código agora. Confira o número e tente de novo.',
      )
    } finally {
      setOcupado(false)
    }
  }

  async function entrar() {
    setErro(null)
    if (codigo.replace(/\D/g, '').length < 4) return setErro('Digite o código que chegou.')
    setOcupado(true)
    try {
      await confirmarCodigo(codigo.trim())
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      setErro(msg ? `Código não confere. Detalhe: ${msg}` : 'Código errado. Confira e tente de novo.')
    } finally {
      setOcupado(false)
    }
  }

  async function confirmarNome() {
    setErro(null)
    if (nome.trim().length < 2) return setErro('Escreva seu nome.')
    setOcupado(true)
    try {
      await salvarNome(nome)
    } catch {
      setErro('Não deu pra salvar seu nome. Tente de novo.')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className={compacto ? 'py-2' : 'tela flex min-h-dvh flex-col justify-center py-10'}>
      {!compacto && (
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-tucupi text-white shadow-acao">
            <MessageCircle className="h-8 w-8" />
          </div>
          <h1 className="text-2xl">Chama Aí</h1>
          <p className="mt-1 text-tinta-suave">Ache quem faz o serviço, pertinho de você.</p>
        </div>
      )}

      {/* ---------- 1) NÚMERO ---------- */}
      {etapa === 'telefone' && (
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block font-bold">Seu número de celular</span>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-tinta-suave/50" />
              <input
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                inputMode="tel"
                autoFocus
                placeholder="(91) 9 9999-9999"
                className="w-full rounded-2xl border-2 border-tinta/10 bg-white p-4 pl-12 focus:border-igarape"
              />
            </div>
          </label>

          {erro && <p className="text-alerta">{erro}</p>}

          <Botao variante="acao" bloco onClick={pedirCodigo} disabled={ocupado} icone={<ArrowRight />}>
            {ocupado ? 'Enviando…' : 'Receber meu código'}
          </Botao>
          <p className="text-center text-sm text-tinta-suave">
            A gente manda um código no seu celular. Se já tem conta, é só entrar.
          </p>
        </div>
      )}

      {/* ---------- 2) CÓDIGO ---------- */}
      {etapa === 'codigo' && (
        <div className="space-y-4">
          <p className="text-center">
            Enviamos um código para <b>{telefoneEmVerificacao}</b>. Digite ele aqui:
          </p>
          <input
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            inputMode="numeric"
            autoFocus
            placeholder="0 0 0 0 0 0"
            className="w-full rounded-2xl border-2 border-tinta/10 bg-white p-4 text-center text-2xl font-bold tracking-widest focus:border-igarape"
          />
          {erro && <p className="text-alerta">{erro}</p>}
          <Botao variante="acao" bloco onClick={entrar} disabled={ocupado}>
            {ocupado ? 'Conferindo…' : 'Entrar'}
          </Botao>
          <button
            onClick={cancelarVerificacao}
            className="w-full py-2 text-center text-tinta-suave underline"
          >
            Trocar o número
          </button>
        </div>
      )}

      {/* ---------- 3) NOME (só na primeira vez) ---------- */}
      {etapa === 'nome' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl">Bem-vindo!</h2>
            <p className="mt-1 text-tinta-suave">
              Só falta uma coisa: como as pessoas devem te chamar?
            </p>
          </div>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            autoFocus
            placeholder="Seu nome"
            className="w-full rounded-2xl border-2 border-tinta/10 bg-white p-4 focus:border-igarape"
          />
          {erro && <p className="text-alerta">{erro}</p>}
          <Botao variante="acao" bloco onClick={confirmarNome} disabled={ocupado}>
            {ocupado ? 'Salvando…' : 'Pronto, pode começar'}
          </Botao>
        </div>
      )}
    </div>
  )
}
