import { useEffect } from 'react'
import { X } from 'lucide-react'
import { useUi } from '@/stores/uiStore'
import { useAuth } from '@/stores/authStore'
import { LoginOTP } from '@/features/auth/LoginOTP'

// Overlay de login. Aparece só quando a pessoa tenta interagir sem estar
// logada. Assim que o login conclui, executa a ação que estava pendente
// (ex.: continuar para o orçamento) e fecha.
export function LoginGate() {
  const { loginAberto, motivoLogin, fecharLogin, consumirAcaoPendente } = useUi()
  const usuario = useAuth((s) => s.usuario)

  useEffect(() => {
    if (loginAberto && usuario) consumirAcaoPendente()
  }, [loginAberto, usuario, consumirAcaoPendente])

  if (!loginAberto) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-tinta/40 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md rounded-t-2xl bg-areia p-4 shadow-2xl sm:rounded-2xl">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-bold text-tinta-suave">{motivoLogin ?? 'Entrar'}</span>
          <button
            onClick={fecharLogin}
            aria-label="Fechar"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-card"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <LoginOTP compacto />
      </div>
    </div>
  )
}
