import { create } from 'zustand'

// Portão de login: a pessoa navega livre; quando tenta INTERAGIR
// (mandar orçamento, falar com alguém, pedir serviço), a gente abre o
// login com um motivo claro. Depois de entrar, ela volta pro que fazia.
interface UiState {
  loginAberto: boolean
  motivoLogin: string | null
  acaoPendente: (() => void) | null

  pedirLogin: (motivo?: string, acao?: () => void) => void
  fecharLogin: () => void
  consumirAcaoPendente: () => void
}

export const useUi = create<UiState>((set, get) => ({
  loginAberto: false,
  motivoLogin: null,
  acaoPendente: null,

  pedirLogin: (motivo, acao) =>
    set({ loginAberto: true, motivoLogin: motivo ?? null, acaoPendente: acao ?? null }),

  fecharLogin: () => set({ loginAberto: false, motivoLogin: null, acaoPendente: null }),

  // chamado após login com sucesso: executa o que a pessoa ia fazer
  consumirAcaoPendente: () => {
    const acao = get().acaoPendente
    set({ loginAberto: false, motivoLogin: null, acaoPendente: null })
    acao?.()
  },
}))
