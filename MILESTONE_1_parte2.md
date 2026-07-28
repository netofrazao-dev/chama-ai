# Milestone 1 — parte 2: o lado do cliente e correções de login

> **Sem SQL novo.** O banco continua o das migrations `0000`–`0004`. Nada para rodar no Supabase.

## O que você apontou, e como ficou

### 1. "Pede o nome toda vez que entro"

Estava errado mesmo. O nome só faz sentido para quem é **novo** — quem já tem conta não pode ser obrigado a lembrar como escreveu o nome no cadastro.

O login agora tem **até 3 telas**: número → código → nome. E a terceira **só aparece na primeira entrada**. Nas próximas, é número + código e pronto. A identidade da pessoa é o telefone, não o nome.

### 2. "Não tem como continuar como quem vai pagar pelos serviços"

Esse era um buraco grande: depois de entrar, só existia caminho para virar prestador. Agora existe o lado do cliente:

**Pedir um serviço** (`features/cliente/PedirServico.tsx`) — 4 passos:
1. O que você precisa (escolhe o serviço)
2. Conte o que é (com o campo de voz)
3. Onde e quando (bairro + prazo em linguagem simples: hoje, amanhã, essa semana…)
4. É pra agora? (comparar preços = orçamento, ou preciso pra já = rápido)

Termina numa tela de confirmação clara em vez de jogar a pessoa de volta sem aviso.

**Meus pedidos** (`features/cliente/MeusPedidos.tsx`) — lista o que a pessoa pediu, com o status em português de gente ("Esperando resposta", "Tem orçamento!", "Fechado") em vez de jargão de sistema.

O botão "Preciso de um serviço" da tela inicial agora funciona: se a pessoa não estiver logada, pede login e **leva ela ao fluxo automaticamente depois de entrar**, em vez de largar na home.

### 3. `npm run types:gen` falhando

O `--local` espera um Supabase rodando na sua máquina; o seu é hospedado. O README agora traz o comando certo (`--project-id SEU_REF`) com o passo a passo. É opcional — o app funciona sem isso.

## Testado contra PostgreSQL 16, sob RLS

- cliente cria pedido ✓
- cliente vê só os próprios pedidos ✓
- **criar pedido em nome de outra pessoa: bloqueado pelo RLS** ✓
- o pedido novo aparece na vitrine pública ✓
- a vitrine filtra por status corretamente (pedido que virou "aceito" sai do feed) ✓
- build de produção passa limpo ✓

## O que ainda falta no Milestone 1

- **Montar a loja** — o prestador marca "ter minha loja" no cadastro, mas ainda não cadastra os serviços com preço.
- **Feed de oportunidades do prestador** — ver os pedidos abertos e mandar orçamento.
- **Escolher orçamento + liberar contato no WhatsApp** — as funções `liberar_contato` e `whatsapp_do_pedido` já existem e estão testadas no banco; falta a tela.
- **Créditos por PIX** — provavelmente a única parte que vai pedir SQL novo.

## Roteiro de teste

1. Entre com `91999999999` / código `123456`. Na primeira vez ele pede seu nome; **saia e entre de novo** para confirmar que não pede mais.
2. Na tela inicial, toque em **Preciso de um serviço** e passe pelos 4 passos.
3. Vá em **Pedidos** e veja o que você acabou de pedir.
4. Vá em **Início** → aba "Precisa" e veja seu pedido lá junto com os fictícios.
5. Em **Perfil**, faça o cadastro de prestador e veja-se aparecer na aba "Quem faz".
