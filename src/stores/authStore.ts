import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Usuario } from '@/lib/database.types'

// ------------------------------------------------------------
// Autenticação sem senha, por CELULAR ou E-MAIL.
//
// Por que os dois: o SMS depende de um provedor externo (Twilio), que
// em conta de teste só entrega para números verificados. O e-mail o
// próprio Supabase envia, sem depender de ninguém. Ter as duas portas
// significa que ninguém fica de fora.
//
// Detalhe que importa: o Chama Aí conecta as pessoas pelo WhatsApp.
// Quem entra pelo celular já tem o número; quem entra por e-mail
// PRECISA informar o WhatsApp, senão ninguém consegue falar com ela.
// Por isso o cadastro pede o número nesse caso.
// ------------------------------------------------------------

export const NOME_PENDENTE = 'Novo usuário'
export type MeioLogin = 'telefone' | 'email'

interface AuthState {
  carregando: boolean
  usuario: Usuario | null
  meioEmVerificacao: MeioLogin | null
  destinoEmVerificacao: string | null

  iniciar: () => Promise<void>
  enviarCodigo: (meio: MeioLogin, destino: string) => Promise<void>
  confirmarCodigo: (codigo: string) => Promise<void>
  completarPerfil: (nome: string, whatsapp?: string) => Promise<void>
  cancelarVerificacao: () => void
  sair: () => Promise<void>
}

async function carregarPerfil(userId: string): Promise<Usuario | null> {
  const { data } = await supabase.from('usuarios').select('*').eq('id', userId).maybeSingle()
  return (data as Usuario | null) ?? null
}

// Falta nome de verdade?
export function precisaNome(u: Usuario | null): boolean {
  if (!u) return false
  const nome = (u.nome ?? '').trim()
  return nome === '' || nome === NOME_PENDENTE
}

// Falta o WhatsApp? (acontece com quem entrou por e-mail)
export function precisaWhatsApp(u: Usuario | null): boolean {
  if (!u) return false
  const zap = (u.whatsapp ?? '').trim()
  const tel = (u.telefone ?? '').trim()
  return zap === '' && tel === ''
}

export function perfilIncompleto(u: Usuario | null): boolean {
  return precisaNome(u) || precisaWhatsApp(u)
}

export const useAuth = create<AuthState>((set, get) => ({
  carregando: true,
  usuario: null,
  meioEmVerificacao: null,
  destinoEmVerificacao: null,

  iniciar: async () => {
    const { data } = await supabase.auth.getSession()
    const userId = data.session?.user.id
    set({ usuario: userId ? await carregarPerfil(userId) : null, carregando: false })

    supabase.auth.onAuthStateChange(async (_event, session) => {
      const id = session?.user.id
      set({ usuario: id ? await carregarPerfil(id) : null })
    })
  },

  enviarCodigo: async (meio, destino) => {
    const { error } =
      meio === 'telefone'
        ? await supabase.auth.signInWithOtp({
            phone: destino,
            options: { data: { telefone: destino } },
          })
        : await supabase.auth.signInWithOtp({
            email: destino,
            options: { shouldCreateUser: true },
          })
    if (error) throw error
    set({ meioEmVerificacao: meio, destinoEmVerificacao: destino })
  },

  confirmarCodigo: async (codigo) => {
    const meio = get().meioEmVerificacao
    const destino = get().destinoEmVerificacao
    if (!meio || !destino) throw new Error('Nada em verificação.')

    const { data, error } =
      meio === 'telefone'
        ? await supabase.auth.verifyOtp({ phone: destino, token: codigo, type: 'sms' })
        : await supabase.auth.verifyOtp({ email: destino, token: codigo, type: 'email' })
    if (error) throw error

    const id = data.session?.user.id
    set({
      meioEmVerificacao: null,
      destinoEmVerificacao: null,
      usuario: id ? await carregarPerfil(id) : null,
    })
  },

  // Primeira entrada: nome e, se veio por e-mail, o WhatsApp.
  completarPerfil: async (nome, whatsapp) => {
    const u = get().usuario
    if (!u) throw new Error('Ninguém logado.')

    const patch: Record<string, string> = { nome: nome.trim() }
    if (whatsapp && whatsapp.trim()) {
      patch.whatsapp = whatsapp.trim()
      // sem telefone de login (entrou por e-mail): o WhatsApp vira o contato
      if (!(u.telefone ?? '').trim()) patch.telefone = whatsapp.trim()
    }

    const { error } = await supabase.from('usuarios').update(patch).eq('id', u.id)
    if (error) throw error
    set({ usuario: { ...u, ...patch } as Usuario })
  },

  cancelarVerificacao: () => set({ meioEmVerificacao: null, destinoEmVerificacao: null }),

  sair: async () => {
    await supabase.auth.signOut()
    set({ usuario: null })
  },
}))
