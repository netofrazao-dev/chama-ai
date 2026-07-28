import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Usuario } from '@/lib/database.types'

// ------------------------------------------------------------
// Autenticação por telefone (OTP).
//
// No MVP o login é por código enviado ao telefone. A Supabase entrega
// esse código por SMS (Twilio/MessageBird/Vonage) de forma nativa.
// Para entregar por WHATSAPP — que é o ideal pro público do Marajó —
// usa-se Twilio Verify com canal WhatsApp por trás de uma Edge Function.
// O fluxo abaixo (signInWithOtp + verifyOtp) é o mesmo nos dois casos;
// só muda o provedor configurado no painel da Supabase. Ver README.
// ------------------------------------------------------------

interface AuthState {
  carregando: boolean
  usuario: Usuario | null
  telefoneEmVerificacao: string | null

  iniciar: () => Promise<void>
  enviarCodigo: (telefoneE164: string, nome?: string) => Promise<void>
  confirmarCodigo: (codigo: string) => Promise<void>
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

export const useAuth = create<AuthState>((set, get) => ({
  carregando: true,
  usuario: null,
  telefoneEmVerificacao: null,

  // chamado uma vez no boot do app
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

  enviarCodigo: async (telefoneE164, nome) => {
    const { error } = await supabase.auth.signInWithOtp({
      phone: telefoneE164,
      options: nome ? { data: { nome, telefone: telefoneE164 } } : undefined,
    })
    if (error) throw error
    set({ telefoneEmVerificacao: telefoneE164 })
  },

  confirmarCodigo: async (codigo) => {
    const telefone = get().telefoneEmVerificacao
    if (!telefone) throw new Error('Nenhum telefone em verificação.')
    const { error } = await supabase.auth.verifyOtp({
      phone: telefone,
      token: codigo,
      type: 'sms',
    })
    if (error) throw error
    set({ telefoneEmVerificacao: null })
  },

  sair: async () => {
    await supabase.auth.signOut()
    set({ usuario: null })
  },
}))
