# Chama Aí

Marketplace híbrido de serviços locais para Breves/PA (e, depois, o Marajó inteiro).
Conecta moradores a prestadores de confiança em três modos — **pedido rápido**, **orçamento** e **loja** — cobrando do prestador só quando ele recebe um lead.

> **Milestone 0 — Fundação.** Este pacote entrega o banco completo (schema + segurança + funções + dados de Breves) e o esqueleto do app (React + Vite + Tailwind + Supabase + PWA) com design system e telas base. Os fluxos completos vêm no Milestone 1.

## Stack

React + Vite + TypeScript · Tailwind · Zustand · React Query · React Router · Supabase (Postgres, Auth, Storage, Realtime, Edge Functions) · PWA · Leaflet/OpenStreetMap.

---

## 1. Subir o banco no Supabase

1. Crie um projeto novo em [supabase.com](https://supabase.com).
2. No painel, vá em **SQL Editor** e rode os arquivos **nesta ordem**:
   1. `supabase/migrations/0000_extensions.sql`
   2. `supabase/migrations/0001_schema.sql`
   3. `supabase/migrations/0002_functions.sql`
   4. `supabase/migrations/0003_rls.sql`
   5. `supabase/migrations/0004_feed_publico.sql` — vitrine pública + blindagem de privacidade
   6. `supabase/seed.sql` — bairros e categorias de Breves
   7. `supabase/seed_demo.sql` — **dados de demonstração** (prestadores e pedidos fictícios) para a vitrine não abrir vazia. Pode apagar quando os reais chegarem (o próprio arquivo já limpa e recria; a seção de limpeza no topo mostra os ids).
3. (Alternativa com a Supabase CLI, se preferir:)
   ```bash
   supabase link --project-ref SEU_REF
   supabase db push        # aplica as migrations
   psql "$DATABASE_URL" -f supabase/seed.sql
   ```

Todas as migrations foram testadas ponta a ponta contra o PostgreSQL 16 — sobem sem erro e o match híbrido (bairro/raio) e a cobrança de lead foram validados.

### Virar admin

Depois de logar uma vez no app (o que cria sua linha em `usuarios`), rode:

```sql
insert into public.admins (usuario_id)
select id from public.usuarios where telefone = '+55SEU_NUMERO';
```

---

## 2. Configurar o login por código (OTP)

O login é por telefone. A entrega do código tem dois caminhos:

- **Agora (mais simples):** SMS nativo da Supabase. Em **Authentication → Providers → Phone**, ative e configure um provedor (Twilio, MessageBird ou Vonage). O código chega por SMS.
- **Ideal para o Marajó (Milestone 1):** código por **WhatsApp**, via **Twilio Verify** com canal WhatsApp, por trás de uma Edge Function. O fluxo de tela (`enviarCodigo` / `confirmarCodigo`) é o mesmo — muda só o provedor.

### Testar sem gastar (números de teste)

Se você não quer configurar Twilio agora, use os **números de teste** do Supabase: em **Authentication → Sign In / Providers → Phone**, ative o provider e abra **Test OTP** (ou "Test phone numbers"). Cadastre, por exemplo, `+5591999999999` com o código fixo `123456`. No app, entre com esse número e digite `123456` — loga sem enviar SMS de verdade. Ideal para desenvolvimento.

> **Erro `400` em `/auth/v1/otp`** ao tentar receber o código = provedor de telefone ainda não configurado (ou número não está na lista de teste). É o passo acima que resolve.

Lembre: **você não precisa logar para navegar.** A vitrine abre pública. O login só aparece quando você tenta interagir (falar com alguém, pedir serviço).

---

## 3. Rodar o app

```bash
cp .env.example .env.local     # preencha URL e ANON KEY do seu projeto
npm install
npm run dev
```

Build de produção: `npm run build` (gera `dist/` já com service worker do PWA).

### Gerar os tipos do banco (recomendado)

`src/lib/database.types.ts` traz um placeholder permissivo. Para gerar os tipos reais do **seu projeto hospedado** (não use `--local`, que espera um Supabase rodando na sua máquina):

```bash
# 1) instale a CLI, se ainda não tem
npm install -g supabase

# 2) faça login (abre o navegador)
supabase login

# 3) gere os tipos usando o REF do seu projeto
#    (o REF está na URL do painel: https://supabase.com/dashboard/project/SEU_REF)
supabase gen types typescript --project-id SEU_REF > src/lib/database.types.ts
```

No Windows (PowerShell), o comando acima funciona igual. Os scripts `types:gen` do package.json usam a variável `SUPABASE_PROJECT_ID`, mas rodar o comando direto com o REF é mais simples.

> Isso é opcional. O app funciona sem gerar os tipos — eles servem para dar autocomplete e checagem no editor.

---

## 4. Estrutura

```
supabase/
  migrations/        0000..0003 — extensões, schema, funções, RLS
  seed.sql           bairros de Breves + 5 categorias + subcategorias
src/
  lib/               supabase client + tipos
  stores/            authStore (Zustand) — login por telefone
  components/ui/     Botao, Cartao, Selo, CampoVoz (descrição por voz)
  components/layout/ AppShell (navegação inferior)
  features/
    auth/            LoginOTP (login em 2 etapas)
    home/            HomeCliente (os 3 modos + categorias)
tailwind.config.js   design system (cores, tipografia, tokens)
```

## Design system

Cores aterradas no Marajó: **verde-igarapé** `#1B7A5A` (confiança), **laranja-tucupi** `#F2760C` (ação, o "chama"), **amarelo-sol** `#FFC24B` (destaque), **areia** `#FDFBF7` (fundo), **tinta** `#16281F` (texto).
Tipografia: **Bricolage Grotesque** (títulos) + **Nunito** (corpo, base 18px). Alvo de toque mínimo de 56px em toda ação. Foco visível e `prefers-reduced-motion` respeitados.

## Decisões que valem lembrar

- **Cobertura híbrida** (bairros _ou_ raio) resolvida na função `prestador_cobre_pedido`. Sem PostGIS: distância por Haversine em SQL puro.
- **Cobrança de lead** centralizada em `liberar_contato` (atômica, idempotente, usa lead grátis antes de crédito). Nenhuma tela escreve em `leads_cobrados` direto.
- **RLS em todas as tabelas.** Cliente vê o que é dele; prestador vê pedidos que pode atender; admin vê tudo.
- **PWA desde o dia 1**, pensando no Android modesto e no uso offline básico.
