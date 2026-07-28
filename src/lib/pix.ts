// ------------------------------------------------------------
// Gerador de "PIX Copia e Cola" (BR Code, padrão EMV do Banco Central).
//
// Por que gerar aqui em vez de usar gateway: para o volume de Breves,
// um QR estático com valor já resolve. Sem taxa de gateway, sem CNPJ,
// sem contrato. O prestador paga, você confere no seu banco e confirma
// no painel.
//
// Formato: campos "ID + tamanho(2 dígitos) + valor", concatenados,
// terminando no CRC16-CCITT do payload inteiro.
// ------------------------------------------------------------

function campo(id: string, valor: string): string {
  const tamanho = valor.length.toString().padStart(2, '0')
  return `${id}${tamanho}${valor}`
}

// CRC16-CCITT (polinômio 0x1021, valor inicial 0xFFFF) — exigido pelo padrão.
function crc16(payload: string): string {
  let crc = 0xffff
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

// O padrão aceita apenas caracteres simples em nome e cidade.
function limpar(texto: string, max: number): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, '')
    .trim()
    .toUpperCase()
    .slice(0, max)
}

export interface DadosPix {
  chave: string
  nome: string
  cidade: string
  valor?: number
  identificador?: string
}

export function gerarPixCopiaECola({
  chave,
  nome,
  cidade,
  valor,
  identificador = '***',
}: DadosPix): string {
  const merchantAccount =
    campo('00', 'br.gov.bcb.pix') + campo('01', chave.trim())

  let payload =
    campo('00', '01') +                            // versão do formato
    campo('26', merchantAccount) +                 // dados do PIX
    campo('52', '0000') +                          // categoria do comerciante
    campo('53', '986') +                           // moeda: real
    (valor ? campo('54', valor.toFixed(2)) : '') + // valor (opcional)
    campo('58', 'BR') +                            // país
    campo('59', limpar(nome, 25)) +                // recebedor
    campo('60', limpar(cidade, 15)) +              // cidade
    campo('62', campo('05', limpar(identificador, 25) || '***'))

  payload += '6304'                                 // abertura do campo CRC
  return payload + crc16(payload)
}

// URL de imagem do QR Code a partir do payload.
// Usamos um gerador público para não adicionar dependência ao projeto;
// o payload já vai pronto e é o mesmo do copia-e-cola.
export function urlQrCode(payload: string, tamanho = 260): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${tamanho}x${tamanho}&data=${encodeURIComponent(payload)}`
}
