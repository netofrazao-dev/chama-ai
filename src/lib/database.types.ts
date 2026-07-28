// Tipos do banco — subconjunto escrito à mão para o Milestone 0.
// Assim que você linkar o projeto Supabase, gere os tipos completos com:
//   npm run types:gen
// (precisa da Supabase CLI e do projeto rodando localmente ou linkado).
// Enquanto isso, estes tipos dão autocomplete nas telas base.

export type TipoUsuario = 'cliente' | 'prestador' | 'ambos'
export type ModoCobertura = 'bairros' | 'raio'
export type ModoPedido = 'rapido' | 'orcamento' | 'loja'
export type StatusPedido =
  | 'aberto'
  | 'com_orcamentos'
  | 'em_negociacao'
  | 'aceito'
  | 'em_andamento'
  | 'concluido'
  | 'cancelado'
export type NivelPrestador = 'iniciante' | 'verificado' | 'comprovado'
export type UnidadePreco =
  | 'por_servico'
  | 'por_hora'
  | 'por_diaria'
  | 'por_km'
  | 'a_combinar'

export interface Usuario {
  id: string
  tipo: TipoUsuario
  nome: string
  foto_url: string | null
  telefone: string
  whatsapp: string | null
  criado_em: string
  verificado_em: string | null
  banido: boolean
}

export interface Bairro {
  id: string
  cidade: string
  uf: string
  nome: string
  lat_centro: number | null
  lng_centro: number | null
  ativo: boolean
}

export interface Categoria {
  id: string
  nome: string
  slug: string
  icone: string | null
  ordem: number
  ativa: boolean
}

export interface Subcategoria {
  id: string
  categoria_id: string
  nome: string
  slug: string
  preco_lead: number
  ordem: number
  ativa: boolean
}

export interface Prestador {
  id: string
  usuario_id: string
  bio: string | null
  foto_capa_url: string | null
  nivel: NivelPrestador
  modo_cobertura: ModoCobertura
  raio_km: number | null
  base_lat: number | null
  base_lng: number | null
  aceita_pedido_rapido: boolean
  aceita_orcamento: boolean
  tem_loja: boolean
  esta_online: boolean
  credito_disponivel: number
  leads_gratis_restantes: number
  nota_media: number
  total_avaliacoes: number
  total_concluidos: number
}

export interface Pedido {
  id: string
  cliente_id: string
  modo: ModoPedido
  subcategoria_id: string
  descricao: string | null
  audio_url: string | null
  transcricao: string | null
  foto_urls: string[]
  endereco_id: string | null
  bairro_id: string | null
  lat: number | null
  lng: number | null
  orcamento_esperado: number | null
  prazo_desejado: string | null
  status: StatusPedido
  prestador_aceito_id: string | null
  criado_em: string
  atualizado_em: string
}

// Placeholder até a geração automática (`npm run types:gen`).
// Propositalmente permissivo: enquanto os tipos reais não existem, não
// queremos que o cliente trave inserts/updates com o tipo `never`.
// Assim que rodar types:gen, este arquivo é substituído pelos tipos
// reais e o autocomplete/checagem passam a valer de verdade.
/* eslint-disable @typescript-eslint/no-explicit-any */
export interface Database {
  public: {
    Tables: Record<string, { Row: any; Insert: any; Update: any; Relationships: [] }>
    Views: Record<string, { Row: any; Relationships: [] }>
    Functions: {
      liberar_contato: {
        Args: { p_prestador_id: string; p_pedido_id: string }
        Returns: number
      }
      devolver_lead: {
        Args: { p_lead_id: string; p_motivo: string }
        Returns: undefined
      }
      prestador_cobre_pedido: {
        Args: { p_prestador_id: string; p_pedido_id: string }
        Returns: boolean
      }
      whatsapp_do_pedido: {
        Args: { p_pedido_id: string }
        Returns: { nome: string; whatsapp: string }[]
      }
      criar_compra_creditos: {
        Args: { p_pacote_id: string }
        Returns: string
      }
      confirmar_compra_creditos: {
        Args: { p_compra_id: string }
        Returns: undefined
      }
      definir_nivel_prestador: {
        Args: { p_prestador_id: string; p_nivel: string }
        Returns: undefined
      }
      definir_banimento: {
        Args: { p_usuario_id: string; p_banido: boolean; p_motivo?: string | null }
        Returns: undefined
      }
      aceitar_pedido_rapido: {
        Args: { p_pedido_id: string }
        Returns: boolean
      }
      resumo_admin: {
        Args: Record<string, never>
        Returns: Record<string, number>[]
      }
    }
    Enums: Record<string, string>
    CompositeTypes: Record<string, never>
  }
}
