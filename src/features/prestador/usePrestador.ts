import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/stores/authStore'
import type { Prestador } from '@/lib/database.types'

// Carrega a ficha de prestador do usuário logado (se ele já for prestador).
// A RLS só devolve a própria linha, então não precisa filtrar por segurança —
// mas filtramos por usuario_id mesmo assim, por clareza.
export function useMeuPrestador() {
  const usuario = useAuth((s) => s.usuario)

  return useQuery({
    queryKey: ['meu_prestador', usuario?.id],
    enabled: Boolean(usuario?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prestadores')
        .select('*')
        .eq('usuario_id', usuario!.id)
        .maybeSingle()
      if (error) throw error
      return (data as Prestador | null) ?? null
    },
  })
}

// Subcategorias que o prestador atende (ids), pra pré-marcar no formulário.
export function useMinhasSubcategorias(prestadorId: string | undefined) {
  return useQuery({
    queryKey: ['minhas_subcategorias', prestadorId],
    enabled: Boolean(prestadorId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prestador_subcategorias')
        .select('subcategoria_id')
        .eq('prestador_id', prestadorId!)
      if (error) throw error
      return (data ?? []).map((r) => (r as { subcategoria_id: string }).subcategoria_id)
    },
  })
}

// Bairros atendidos (ids).
export function useMeusBairros(prestadorId: string | undefined) {
  return useQuery({
    queryKey: ['meus_bairros', prestadorId],
    enabled: Boolean(prestadorId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prestador_bairros')
        .select('bairro_id')
        .eq('prestador_id', prestadorId!)
      if (error) throw error
      return (data ?? []).map((r) => (r as { bairro_id: string }).bairro_id)
    },
  })
}
