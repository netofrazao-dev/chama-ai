import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Usuario } from '@/lib/database.types'

// ------------------------------------------------------------
// Autenticação por telefone (OTP).
//
// Fluxo pensado pra quem não é íntimo de tecnologia:
//   1) a pessoa digita SÓ o número (nada de nome, e-mail ou senha)
//   2) recebe um código e digita
//   3) o nome só é pedido se ela nunca entrou antes
//
// Isso é importante: quem já tem conta não pode ser obrigado a lembrar
// como escreveu o nome no cadastro. O número é a identidade.
//
// A Supabase entrega o código por SMS (Twilio/MessageBird/Vonage).
// Para entregar por WHATSAPP — ideal pro público do Marajó — usa-se
// Twilio Verify com canal WhatsApp por trás de uma Edge Function. O
// fluxo abaixo não muda; só muda o provedor configurado no painel.
// ------------------------------------------------------------

// Nome que o gatilho do banco usa quando ninguém informou nada.
// Serve de sinal de "esse perfil ainda não tem nome de verdade".
export const NOME_PENDENTE = 'Novo usuário'

interface AuthState {
  carregando: boolean
  usuario: Usuario | null
  telefoneEmVerificacao: string | null

  iniciar: () => Promise<void>
  enviarCodigo: (telefoneE164: string) => Promise<void>
  confirmarCodigo: (codigo: string) => Promise<void>
  salvarNome: (nome: string) => Promise<void>
  cancelarVerificacao: () => void
  sair: () => Promise<void>
}

async function carregarPerfil(userId: string): Promise<Usuario | null> {
  const { data } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  return (data as Usuario | null) ?? null
}

// A pessoa é nova se ainda não tem nome de verdade no perfil.
export function precisaEscolherNome(u: Usuario | null): boolean {
  if (!u) return false
  const nome = (u.nome ?? '').trim()
  return nome === '' || nome === NOME_PENDENTE
}

export const useAuth = create<AuthState>((set, get) => ({
  carregando: true,
  usuario: null,
  telefoneEmVerificacao: null,

  iniciar: async () => {
    const { data } = await supabase.auth.getSession()
    const userId = data.session?.user.id
    set({
      usuario: userId ? await carregarPerfil(userId) : null,
      carregando: false,
    })

    supabase.auth.onAuthStateChange(async (_event, session) => {
      const id = session?.user.id
      set({ usuario: id ? await carregarPerfil(id) : null })
    })
  },

  // Só o número. Nome não entra aqui de propósito.
  enviarCodigo: async (telefoneE164) => {
    const { error } = await supabase.auth.signInWithOtp({
      phone: telefoneE164,
      options: { data: { telefone: telefoneE164 } },
    })
    if (error) throw error
    set({ telefoneEmVerificacao: telefoneE164 })
  },

  confirmarCodigo: async (codigo) => {
    const telefone = get().telefoneEmVerificacao
    if (!telefone) throw new Error('Nenhum telefone em verificação.')
    const { data, error } = await supabase.auth.verifyOtp({
      phone: telefone,
      token: codigo,
      type: 'sms',
    })
    if (error) throw error
    const id = data.session?.user.id
    set({
      telefoneEmVerificacao: null,
      usuario: id ? await carregarPerfil(id) : null,
    })
  },

  // Chamado só na primeira entrada, quando o perfil ainda não tem nome.
  salvarNome: async (nome) => {
    const u = get().usuario
    if (!u) throw new Error('Ninguém logado.')
    const { error } = await supabase
      .from('usuarios')
      .update({ nome: nome.trim() })
      .eq('id', u.id)
    if (error) throw error
    set({ usuario: { ...u, nome: nome.trim() } })
  },

  cancelarVerificacao: () => set({ telefoneEmVerificacao: null }),

  sair: async () => {
    await supabase.auth.signOut()
    set({ usuario: null })
  },
}))
