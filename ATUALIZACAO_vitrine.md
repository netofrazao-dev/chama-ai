# Atualização — Vitrine pública (browse-first)

Esta iteração muda o app para **abrir mostrando conteúdo**, sem exigir login para navegar. O login só aparece quando a pessoa tenta interagir.

## O que mudou

- **Vitrine pública é a tela inicial.** Duas abas — "Quem faz" (prestadores) e "Precisa" (pedidos) — com filtro por categoria. Navega sem login.
- **Portão de login sob demanda.** Tocar em "falar com", "oferecer serviço" ou "preciso de um serviço" abre o login num modal, com um motivo claro; depois de entrar, continua de onde parou.
- **Views públicas seguras** (`feed_pedidos`, `feed_prestadores`, `feed_servicos_loja`, `perfis_publicos`): expõem só o que pode ser público.
- **Blindagem de privacidade** (migration 0004): as tabelas-base `usuarios` e `prestadores` deixaram de ter leitura pública. Telefone, endereço e saldo não vazam nem com o grant padrão que o Supabase dá aos papéis `anon`/`authenticated` — o RLS barra.
- **Revelação de contato pós-negócio** (`whatsapp_do_pedido`): o WhatsApp só é revelado a quem é parte de um negócio fechado e pago.
- **Seed de demonstração** (`seed_demo.sql`): 4 prestadores e 5 pedidos em bairros de Breves, para a vitrine não abrir vazia.
- Avisos amarelos do React Router silenciados (future flags v7).

## Tudo testado contra PostgreSQL 16

- anon lê a vitrine (5 pedidos, 4 prestadores, 3 serviços) ✓
- anon recebe **0 linhas** ao tentar ler telefone/coordenadas nas tabelas-base, mesmo com o grant padrão ✓
- cliente que fechou o negócio vê o WhatsApp da prestadora; um estranho recebe 0 linhas ✓
- build de produção do front passa limpo, PWA gerado ✓

## Importante saber

- Para o app abrir com vida, rode o `seed_demo.sql`. Sem ele, a vitrine mostra os estados vazios ("seja o primeiro").
- Os dados de demonstração são fictícios e marcados com ids fixos (`0d0000...`), fáceis de apagar depois.
- As ações de interação (perfil do prestador, enviar orçamento, pedir serviço, PIX) ainda são placeholders — chegam no Milestone 1.
