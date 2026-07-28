# Milestone 0 — Fundação ✅

## O que está pronto e testado

**Banco de dados (validado contra PostgreSQL 16):**
- Schema completo: identidade, localização, catálogo, prestador, os 3 modos de pedido, economia (créditos/leads), confiança (avaliação/denúncia/mensagens), admin.
- Cobertura híbrida funcionando: `prestador_cobre_pedido` casa por **bairro** ou por **raio em km** conforme o modo do prestador. Distância por Haversine, sem dependência de PostGIS.
- Cobrança de lead: `liberar_contato` é atômica, idempotente e usa lead grátis antes de crédito. `devolver_lead` estorna. Reputação recalculada por gatilho.
- RLS em todas as 20 tabelas.
- Seed de Breves: 12 bairros, 5 categorias, 22 subcategorias com preço de lead por tipo.
- Perfil criado automaticamente no cadastro (gatilho em `auth.users`).

**App (build de produção passando, PWA gerado):**
- Design system Chama Aí (cores do Marajó, tipografia legível, tokens).
- Login por telefone em 2 etapas (`LoginOTP`).
- Home do cliente com os 3 modos e as categorias vindas do banco.
- Campo de descrição **por voz** (Web Speech API) com fallback para digitação.
- Navegação inferior, guarda de sessão, React Query configurado.
- PWA instalável com cache offline básico da API.

## O que vem no Milestone 1 (sugestão)

Foco: **fechar os fluxos Loja e Orçamento de ponta a ponta**, porque são os que funcionam sem prestador ficar online o tempo todo — ideais para começar a cadastrar gente em Breves.

1. Cadastro de prestador (ficha, subcategorias, cobertura por bairros/raio no mapa Leaflet).
2. Modo **Loja**: prestador cria catálogo de serviços; cliente navega, agenda e contrata.
3. Modo **Orçamento**: cliente posta pedido (com voz + foto); feed do prestador; envio de orçamento; cliente compara e escolhe.
4. **Liberação de contato + WhatsApp**: ao escolher, chama `liberar_contato` e abre o WhatsApp do prestador com mensagem pronta.
5. Créditos via **PIX** (reaproveitando o que você já fez na Diversus/Comercial Frazão).
6. Avaliação bidirecional pós-serviço.
7. Níveis de prestador + fila de aprovação no admin.

Depois (Milestone 2): modo **Rápido** com despacho em ondas via Supabase Realtime, "estou online", notificação por WhatsApp; transcrição de áudio de reserva por Edge Function + Whisper.

## Como validar este milestone agora

1. Suba as migrations + seed (ver README).
2. Configure o provedor de telefone (ou crie um usuário de teste no painel).
3. `npm install && npm run dev`, entre com seu número, veja a home puxar as categorias do banco.
4. Rode a query do README para virar admin.
