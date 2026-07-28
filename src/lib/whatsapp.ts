// Monta o link do WhatsApp com mensagem já escrita.
// Regra do produto: a pessoa nunca deve precisar pensar no que dizer —
// a mensagem sai pronta, mencionando o Chama Aí e o serviço.

function soDigitos(telefone: string): string {
  return telefone.replace(/\D/g, '')
}

export function linkWhatsApp(telefone: string, mensagem: string): string {
  return `https://wa.me/${soDigitos(telefone)}?text=${encodeURIComponent(mensagem)}`
}

// Cliente → prestador
export function mensagemParaPrestador(nomeCliente: string, servico: string): string {
  return (
    `Olá! Sou ${nomeCliente}, achei você no Chama Aí. ` +
    `Aceitei seu orçamento de ${servico.toLowerCase()} e queria combinar os detalhes.`
  )
}

// Prestador → cliente
export function mensagemParaCliente(nomePrestador: string, servico: string): string {
  return (
    `Olá! Aqui é ${nomePrestador}, do Chama Aí. ` +
    `Você aceitou meu orçamento de ${servico.toLowerCase()}. Podemos combinar?`
  )
}

export function abrirWhatsApp(telefone: string, mensagem: string) {
  window.open(linkWhatsApp(telefone, mensagem), '_blank', 'noopener,noreferrer')
}
