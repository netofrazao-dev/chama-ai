import { useState } from 'react'
import { Phone, Mail, MessageCircle, ArrowRight } from 'lucide-react'
import { useAuth, perfilIncompleto, precisaWhatsApp, type MeioLogin } from '@/stores/authStore'
import { Botao } from '@/components/ui'

// Entrar sem senha, por celular OU e-mail.
// O e-mail existe porque nem todo mundo consegue receber SMS — e o
// Supabase manda e-mail sozinho, sem depender de provedor externo.

function paraE164(bruto: string): string {
  const digitos = bruto.replace(/\D/g, '')
  if (digitos.startsWith('55')) return '+' + digitos
  return '+55' + digitos
}

export function LoginOTP({ compacto = false }: { compacto?: boolean }) {
  const {
    enviarCodigo,
    confirmarCodigo,
    completarPerfil,
    cancelarVerificacao,
    meioEmVerificacao,
    destinoEmVerificacao,
    usuario,
  } = useAuth()

  const [meio, setMeio] = useState<MeioLogin>('telefone')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [codigo, setCodigo] = useState('')
  const [nome, setNome] = useState('')
  const [whats, setWhats] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const etapa: 'entrada' | 'codigo' | 'perfil' = perfilIncompleto(usuario)
    ? 'perfil'
    : meioEmVerificacao
      ? 'codigo'
      : 'entrada'

  async function pedirCodigo() {
    setErro(null)
    if (meio === 'telefone' && telefone.replace(/\D/g, '').length < 10)
      return setErro('Coloque seu número com o DDD.')
    if (meio === 'email' && !/^\S+@\S+\.\S+$/.test(email.trim()))
      return setErro('Escreva um e-mail válido.')

    setOcupado(true)
    try {
      await enviarCodigo(meio, meio === 'telefone' ? paraE164(telefone) : email.trim())
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      setErro(msg ? `Não deu pra enviar o código. Detalhe: ${msg}` : 'Não deu pra enviar o código agora.')
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

  async function salvarPerfil() {
    setErro(null)
    if (nome.trim().length < 2) return setErro('Escreva seu nome.')
    const faltaZap = precisaWhatsApp(usuario)
    if (faltaZap && whats.replace(/\D/g, '').length < 10)
      return setErro('Coloque seu WhatsApp com o DDD.')

    setOcupado(true)
    try {
      await completarPerfil(nome, faltaZap ? paraE164(whats) : undefined)
    } catch {
      setErro('Não deu pra salvar. Tente de novo.')
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

      {/* ---------- ENTRADA: celular ou e-mail ---------- */}
      {etapa === 'entrada' && (
        <div className="space-y-4">
          <div className="flex rounded-2xl bg-areia-escura p-1">
            {(
              [
                ['telefone', 'Pelo celular'],
                ['email', 'Pelo e-mail'],
              ] as [MeioLogin, string][]
            ).map(([chave, rotulo]) => (
              <button
                key={chave}
                onClick={() => {
                  setMeio(chave)
                  setErro(null)
                }}
                className={[
                  'flex-1 rounded-xl py-2.5 text-base font-bold transition',
                  meio === chave ? 'bg-white text-tinta shadow-card' : 'text-tinta-suave',
                ].join(' ')}
              >
                {rotulo}
              </button>
            ))}
          </div>

          {meio === 'telefone' ? (
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
          ) : (
            <label className="block">
              <span className="mb-1 block font-bold">Seu e-mail</span>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-tinta-suave/50" />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  inputMode="email"
                  autoCapitalize="none"
                  autoFocus
                  placeholder="voce@exemplo.com"
                  className="w-full rounded-2xl border-2 border-tinta/10 bg-white p-4 pl-12 focus:border-igarape"
                />
              </div>
            </label>
          )}

          {erro && <p className="text-alerta">{erro}</p>}

          <Botao variante="acao" bloco onClick={pedirCodigo} disabled={ocupado} icone={<ArrowRight />}>
            {ocupado ? 'Enviando…' : 'Receber meu código'}
          </Botao>
          <p className="text-center text-sm text-tinta-suave">
            {meio === 'telefone'
              ? 'A gente manda um código no seu celular.'
              : 'A gente manda um código no seu e-mail. Olhe também o spam.'}
          </p>
        </div>
      )}

      {/* ---------- CÓDIGO ---------- */}
      {etapa === 'codigo' && (
        <div className="space-y-4">
          <p className="text-center">
            Enviamos um código para <b>{destinoEmVerificacao}</b>. Digite ele aqui:
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
            Voltar
          </button>
        </div>
      )}

      {/* ---------- PERFIL (só na primeira vez) ---------- */}
      {etapa === 'perfil' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl">Bem-vindo!</h2>
            <p className="mt-1 text-tinta-suave">Só faltam uns dados pra você começar.</p>
          </div>

          <label className="block">
            <span className="mb-1 block font-bold">Como as pessoas devem te chamar?</span>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              autoFocus
              placeholder="Seu nome"
              className="w-full rounded-2xl border-2 border-tinta/10 bg-white p-4 focus:border-igarape"
            />
          </label>

          {precisaWhatsApp(usuario) && (
            <label className="block">
              <span className="mb-1 block font-bold">Seu WhatsApp</span>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-tinta-suave/50" />
                <input
                  value={whats}
                  onChange={(e) => setWhats(e.target.value)}
                  inputMode="tel"
                  placeholder="(91) 9 9999-9999"
                  className="w-full rounded-2xl border-2 border-tinta/10 bg-white p-4 pl-12 focus:border-igarape"
                />
              </div>
              <span className="mt-1 block text-sm text-tinta-suave">
                É por aqui que as pessoas vão falar com você. Seu número só aparece para quem
                fechar serviço com você.
              </span>
            </label>
          )}

          {erro && <p className="text-alerta">{erro}</p>}

          <Botao variante="acao" bloco onClick={salvarPerfil} disabled={ocupado}>
            {ocupado ? 'Salvando…' : 'Pronto, pode começar'}
          </Botao>
        </div>
      )}
    </div>
  )
}
