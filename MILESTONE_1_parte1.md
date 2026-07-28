# Milestone 1 — parte 1: cadastro de prestador

Esta entrega adianta a peça mais importante do Milestone 1 enquanto o login por telefone ainda está sendo configurado.

> **Não há SQL novo nesta entrega.** O banco continua o mesmo das migrations `0000`–`0004`. Nada para rodar no Supabase desta vez.

## O que entrou

**Cadastro de prestador em 4 passos** (`features/prestador/CadastroPrestador.tsx`)
1. **Fale de você** — bio, com o campo de voz (dá pra falar em vez de digitar).
2. **O que você faz** — marca as subcategorias, agrupadas por categoria, em botões grandes.
3. **Onde você atende** — escolhe entre **por bairro** (marca os bairros) ou **por distância** (toca no mapa pra marcar de onde sai e arrasta o raio em km). É a cobertura híbrida que você pediu, agora com interface.
4. **Como quer trabalhar** — liga/desliga os três modos: ter loja, mandar orçamento, atender na hora.

Serve para **criar e editar**: se a ficha já existe, os campos vêm preenchidos.

**Mapa** (`features/prestador/SeletorLocal.tsx`) — Leaflet + OpenStreetMap, sem chave de API e sem custo. Usa círculos desenhados em vez de ícones de marcador, evitando o bug clássico de ícone quebrado do Leaflet em bundlers.

**Aba Buscar de verdade** (`features/prestador/Busca.tsx`) — antes ela repetia a vitrine. Agora é busca por nome do profissional, serviço ou bairro, com resultado instantâneo (filtra no aparelho, funciona bem com internet ruim).

**Tela de perfil** (`features/prestador/Perfil.tsx`) — para quem ainda não é prestador, mostra o convite "Quero oferecer meu serviço". Para quem já é, mostra nota, serviços concluídos, contatos disponíveis (incluindo o aviso dos contatos grátis) e o botão de editar o cadastro.

**Correção no login** — a mensagem de erro agora mostra o motivo real devolvido pelo Supabase, em vez do texto genérico. Se algo falhar, você vê exatamente o que foi.

## Testado

Simulando um usuário autenticado real sob RLS, contra PostgreSQL 16:

- cria a ficha de prestador ✓
- vincula 2 subcategorias e 2 bairros ✓
- atualiza o próprio usuário para tipo `ambos` ✓
- **tentativa de criar ficha em nome de outra pessoa: bloqueada pelo RLS** ✓
- o prestador recém-cadastrado aparece na vitrine pública ✓
- build de produção passa limpo, PWA gerado ✓

## Ainda falta no Milestone 1

- Montar a loja (cadastrar serviços com preço) — a ficha já marca `tem_loja`, falta o CRUD do catálogo.
- Pedir serviço (cliente posta pedido) e o feed de orçamentos do prestador.
- Liberação de contato ligada ao WhatsApp (a função `liberar_contato` e a `whatsapp_do_pedido` já existem no banco e estão testadas — falta a tela).
- Compra de créditos por PIX.

## Para testar quando o login funcionar

1. Entre com seu número.
2. Vá na aba **Perfil** → "Quero oferecer meu serviço".
3. Passe pelos 4 passos (experimente os dois modos de cobertura).
4. Salve e volte para a aba **Início** — você deve se ver na vitrine, na aba "Quem faz".
5. Vá em **Buscar** e procure pelo seu nome ou pelo serviço que cadastrou.
