import type { UnidadePreco } from './database.types'

export function reais(v: number | null | undefined): string {
  if (v == null) return ''
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// "R$ 45" ou "R$ 45 a R$ 60"
export function faixaPreco(min: number | null, max: number | null): string {
  if (min == null && max == null) return 'A combinar'
  if (min != null && max != null && min !== max) return `${reais(min)} a ${reais(max)}`
  return reais(min ?? max)
}

const UNIDADES: Record<UnidadePreco, string> = {
  por_servico: '',
  por_hora: '/hora',
  por_diaria: '/diária',
  por_km: '/km',
  a_combinar: '',
}
export function sufixoUnidade(u: UnidadePreco): string {
  return UNIDADES[u] ?? ''
}

// Como o prestador cobre a região, em linguagem do usuário.
export function textoCobertura(
  modo: 'bairros' | 'raio',
  raioKm: number | null,
  bairros: string[],
): string {
  if (modo === 'raio' && raioKm) return `Atende num raio de ${raioKm} km`
  if (bairros.length === 0) return 'Atende Breves'
  if (bairros.length <= 2) return `Atende ${bairros.join(' e ')}`
  return `Atende ${bairros.slice(0, 2).join(', ')} +${bairros.length - 2}`
}

// "há 5 min", "há 2 h", "ontem"
export function tempoRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h} h`
  const d = Math.floor(h / 24)
  return d === 1 ? 'ontem' : `há ${d} dias`
}

const RONULO: Record<string, { rotulo: string; cor: 'sol' | 'igarape' }> = {
  iniciante: { rotulo: 'Novato', cor: 'sol' },
  verificado: { rotulo: 'Verificado', cor: 'igarape' },
  comprovado: { rotulo: 'Comprovado', cor: 'igarape' },
}
export function seloNivel(nivel: string) {
  return RONULO[nivel] ?? RONULO.iniciante
}
