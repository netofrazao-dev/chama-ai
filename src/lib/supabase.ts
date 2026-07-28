import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// Falta configuração? Não deixamos o app morrer com tela branca.
// O App mostra uma tela explicando o que fazer (ver `configFaltando`).
export const configFaltando = !url || !anonKey

if (configFaltando) {
  console.error(
    'Faltam VITE_SUPABASE_URL e/ou VITE_SUPABASE_ANON_KEY.\n' +
      'Local: copie .env.example para .env.local e preencha.\n' +
      'Vercel: Settings > Environment Variables, e depois REFAÇA o deploy ' +
      '(variáveis VITE_ são embutidas no momento do build).',
  )
}

// Usamos valores de espaço reservado quando falta config, só para o
// createClient não lançar e derrubar o app antes de renderizar a tela
// de ajuda. Nenhuma chamada real vai funcionar nesse estado — de
// propósito, porque não há para onde chamar.
export const supabase = createClient<Database>(
  url ?? 'https://configuracao-ausente.supabase.co',
  anonKey ?? 'chave-ausente',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  },
)
