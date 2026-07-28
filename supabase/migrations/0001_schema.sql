-- ============================================================
-- Chama Aí — Milestone 0 (Fundação)
-- 0001_schema.sql
-- Schema completo. Comentários em cada tabela explicam o porquê.
-- Convenção: nomes em português, snake_case, ids uuid.
-- ============================================================

-- ------------------------------------------------------------
-- TIPOS (enums)
-- ------------------------------------------------------------
create type public.tipo_usuario        as enum ('cliente', 'prestador', 'ambos');
create type public.modo_cobertura      as enum ('bairros', 'raio');       -- como o prestador define a área
create type public.modo_pedido         as enum ('rapido', 'orcamento', 'loja');
create type public.status_pedido       as enum (
  'aberto', 'com_orcamentos', 'em_negociacao', 'aceito',
  'em_andamento', 'concluido', 'cancelado'
);
create type public.status_notificacao  as enum ('notificado', 'aceito', 'recusado', 'ignorado');
create type public.nivel_prestador     as enum ('iniciante', 'verificado', 'comprovado');
create type public.status_verificacao  as enum ('pendente', 'aprovada', 'recusada');
create type public.tipo_verificacao    as enum ('cpf', 'foto_documento', 'selfie', 'comprovante_residencia');
create type public.status_credito      as enum ('pendente', 'pago', 'expirado', 'cancelado');
create type public.status_denuncia     as enum ('aberta', 'investigando', 'resolvida', 'arquivada');
create type public.unidade_preco       as enum ('por_servico', 'por_hora', 'por_diaria', 'por_km', 'a_combinar');

-- ============================================================
-- IDENTIDADE E LOCALIZAÇÃO
-- ============================================================

-- Perfil da pessoa. Espelha auth.users (1:1). O id É o auth.uid().
-- Assim toda policy RLS fica trivial: auth.uid() = usuarios.id.
create table public.usuarios (
  id            uuid primary key references auth.users(id) on delete cascade,
  tipo          public.tipo_usuario not null default 'cliente',
  nome          text not null,
  foto_url      text,
  telefone      text not null,           -- E.164, ex: +5591999999999
  whatsapp      text,                    -- se diferente do telefone de login
  criado_em     timestamptz not null default now(),
  verificado_em timestamptz,             -- telefone confirmado
  banido        boolean not null default false,
  banido_motivo text
);
comment on table public.usuarios is 'Perfil público/base de toda pessoa. id = auth.uid().';

-- Bairros são a unidade mental de localização em Breves ("o cara é lá do Aeroporto").
-- Guardamos centro do bairro pra calcular distância quando o prestador usa raio.
create table public.bairros (
  id          uuid primary key default gen_random_uuid(),
  cidade      text not null default 'Breves',
  uf          text not null default 'PA',
  nome        text not null,
  lat_centro  double precision,
  lng_centro  double precision,
  ativo       boolean not null default true,
  unique (cidade, uf, nome)
);
comment on table public.bairros is 'Bairros cadastrados. Base do seletor de localização e do match por bairro.';

-- Endereços salvos do usuário (casa/trabalho). Ponto lat/lng é o que alimenta o raio.
create table public.enderecos_usuario (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null references public.usuarios(id) on delete cascade,
  apelido     text not null default 'Casa',    -- "Casa", "Trabalho", "Da minha mãe"
  bairro_id   uuid references public.bairros(id),
  referencia  text,                             -- "perto da igreja do Centro"
  lat         double precision,
  lng         double precision,
  principal   boolean not null default false,
  criado_em   timestamptz not null default now()
);
create index idx_enderecos_usuario on public.enderecos_usuario(usuario_id);
comment on table public.enderecos_usuario is 'Endereços do usuário. Um marcado como principal.';

-- Verificações de identidade do prestador (aprovação manual sua no admin).
create table public.verificacoes (
  id           uuid primary key default gen_random_uuid(),
  usuario_id   uuid not null references public.usuarios(id) on delete cascade,
  tipo         public.tipo_verificacao not null,
  arquivo_url  text,
  status       public.status_verificacao not null default 'pendente',
  aprovado_por uuid references public.usuarios(id),
  aprovado_em  timestamptz,
  criado_em    timestamptz not null default now()
);
create index idx_verificacoes_usuario on public.verificacoes(usuario_id);
create index idx_verificacoes_status  on public.verificacoes(status);

-- ============================================================
-- CATÁLOGO E PRESTADOR
-- ============================================================

create table public.categorias (
  id     uuid primary key default gen_random_uuid(),
  nome   text not null unique,
  slug   text not null unique,
  icone  text,                    -- nome do ícone (lucide) ou url
  ordem  int  not null default 0,
  ativa  boolean not null default true
);
comment on table public.categorias is 'Categorias de serviço (nível 1). MVP: 5 categorias.';

create table public.subcategorias (
  id           uuid primary key default gen_random_uuid(),
  categoria_id uuid not null references public.categorias(id) on delete cascade,
  nome         text not null,
  slug         text not null unique,
  preco_lead   int  not null default 5,   -- custo em créditos pra desbloquear um lead desta subcategoria
  ordem        int  not null default 0,
  ativa        boolean not null default true,
  unique (categoria_id, nome)
);
comment on table public.subcategorias is 'Subcategorias (nível 2). O preco_lead vive aqui pois varia por tipo de serviço.';

-- Ficha do prestador. usuario_id 1:1 — nem todo usuário é prestador.
create table public.prestadores (
  id                    uuid primary key default gen_random_uuid(),
  usuario_id            uuid not null unique references public.usuarios(id) on delete cascade,
  bio                   text,
  foto_capa_url         text,
  nivel                 public.nivel_prestador not null default 'iniciante',
  -- cobertura híbrida:
  modo_cobertura        public.modo_cobertura not null default 'bairros',
  raio_km               numeric(5,1),             -- usado quando modo_cobertura = 'raio'
  base_lat              double precision,         -- ponto central do prestador (endereço de trabalho)
  base_lng              double precision,
  -- em quais modos ele opera:
  aceita_pedido_rapido  boolean not null default false,
  aceita_orcamento      boolean not null default true,
  tem_loja              boolean not null default false,
  -- disponibilidade em tempo real (modo rápido):
  esta_online           boolean not null default false,
  ultima_vez_online     timestamptz,
  -- economia:
  credito_disponivel    int not null default 10,  -- 10 leads grátis de boas-vindas
  leads_gratis_restantes int not null default 10,
  -- reputação (desnormalizado pra leitura rápida na listagem):
  nota_media            numeric(3,2) not null default 0,
  total_avaliacoes      int not null default 0,
  total_concluidos      int not null default 0,
  criado_em             timestamptz not null default now()
);
create index idx_prestadores_online on public.prestadores(esta_online) where esta_online = true;
create index idx_prestadores_nivel  on public.prestadores(nivel);
comment on table public.prestadores is 'Ficha do prestador. Cobertura por bairros OU raio (modo_cobertura decide).';

-- Quais subcategorias o prestador atende.
create table public.prestador_subcategorias (
  prestador_id     uuid not null references public.prestadores(id) on delete cascade,
  subcategoria_id  uuid not null references public.subcategorias(id) on delete cascade,
  anos_experiencia int default 0,
  primary key (prestador_id, subcategoria_id)
);
create index idx_prest_subcat_sub on public.prestador_subcategorias(subcategoria_id);

-- Bairros atendidos (usado quando modo_cobertura = 'bairros').
create table public.prestador_bairros (
  prestador_id uuid not null references public.prestadores(id) on delete cascade,
  bairro_id    uuid not null references public.bairros(id) on delete cascade,
  primary key (prestador_id, bairro_id)
);
create index idx_prest_bairros_bairro on public.prestador_bairros(bairro_id);

-- Catálogo do modo Loja: serviços com preço fixo/faixa.
create table public.servicos_loja (
  id                uuid primary key default gen_random_uuid(),
  prestador_id      uuid not null references public.prestadores(id) on delete cascade,
  subcategoria_id   uuid not null references public.subcategorias(id),
  titulo            text not null,
  descricao         text,
  foto_url          text,
  unidade           public.unidade_preco not null default 'por_servico',
  preco_min         numeric(10,2),           -- faixa; se preço exato, min = max
  preco_max         numeric(10,2),
  duracao_min       int,                     -- duração estimada em minutos
  ativo             boolean not null default true,
  criado_em         timestamptz not null default now()
);
create index idx_servicos_loja_prest on public.servicos_loja(prestador_id);
comment on table public.servicos_loja is 'Serviços do modo Loja (preço fixo/faixa que o cliente contrata direto).';

-- ============================================================
-- TRANSAÇÃO
-- ============================================================

-- Pedido é o núcleo. Serve aos 3 modos; campos específicos ficam nulos quando não se aplicam.
create table public.pedidos (
  id                 uuid primary key default gen_random_uuid(),
  cliente_id         uuid not null references public.usuarios(id) on delete cascade,
  modo               public.modo_pedido not null,
  subcategoria_id    uuid not null references public.subcategorias(id),
  descricao          text,
  audio_url          text,                    -- descrição por voz (MVP)
  transcricao        text,                    -- texto transcrito do áudio
  foto_urls          text[] default '{}',
  endereco_id        uuid references public.enderecos_usuario(id),
  bairro_id          uuid references public.bairros(id),   -- desnormalizado pro match
  lat                double precision,
  lng                double precision,
  orcamento_esperado numeric(10,2),
  prazo_desejado     text,                    -- "hoje", "amanhã", "essa semana" (linguagem do usuário)
  status             public.status_pedido not null default 'aberto',
  prestador_aceito_id uuid references public.prestadores(id),  -- preenchido quando fecha
  criado_em          timestamptz not null default now(),
  atualizado_em      timestamptz not null default now()
);
create index idx_pedidos_feed   on public.pedidos(subcategoria_id, status, criado_em desc);
create index idx_pedidos_cliente on public.pedidos(cliente_id, criado_em desc);
create index idx_pedidos_bairro  on public.pedidos(bairro_id);
comment on table public.pedidos is 'Pedido do cliente. Núcleo dos 3 modos. bairro_id/lat/lng desnormalizados pro match.';

-- Modo rápido: registro de quem foi notificado e em qual onda de despacho.
create table public.pedido_notificados (
  id            uuid primary key default gen_random_uuid(),
  pedido_id     uuid not null references public.pedidos(id) on delete cascade,
  prestador_id  uuid not null references public.prestadores(id) on delete cascade,
  onda          int not null default 1,       -- 1 = 3 mais próximos, 2 = +5, etc.
  status        public.status_notificacao not null default 'notificado',
  notificado_em timestamptz not null default now(),
  respondido_em timestamptz,
  unique (pedido_id, prestador_id)
);
create index idx_notificados_prest on public.pedido_notificados(prestador_id, status);

-- Modo orçamento: propostas dos prestadores.
create table public.orcamentos (
  id           uuid primary key default gen_random_uuid(),
  pedido_id    uuid not null references public.pedidos(id) on delete cascade,
  prestador_id uuid not null references public.prestadores(id) on delete cascade,
  valor        numeric(10,2),
  prazo        text,
  mensagem     text,
  escolhido    boolean not null default false,
  criado_em    timestamptz not null default now(),
  unique (pedido_id, prestador_id)             -- 1 orçamento por prestador por pedido
);
create index idx_orcamentos_pedido on public.orcamentos(pedido_id);
create index idx_orcamentos_prest  on public.orcamentos(prestador_id);

-- Modo loja: contratação direta de um serviço do catálogo.
create table public.contratacoes_loja (
  id              uuid primary key default gen_random_uuid(),
  pedido_id       uuid references public.pedidos(id) on delete set null,
  cliente_id      uuid not null references public.usuarios(id) on delete cascade,
  prestador_id    uuid not null references public.prestadores(id) on delete cascade,
  servico_loja_id uuid not null references public.servicos_loja(id),
  data_agendada   date,
  hora_agendada   time,
  endereco_id     uuid references public.enderecos_usuario(id),
  valor_combinado numeric(10,2),
  observacao      text,
  status          public.status_pedido not null default 'aceito',
  criado_em       timestamptz not null default now()
);
create index idx_contratacoes_prest on public.contratacoes_loja(prestador_id);
create index idx_contratacoes_cli   on public.contratacoes_loja(cliente_id);

-- ============================================================
-- ECONOMIA (créditos e leads)
-- ============================================================

-- Pacotes de crédito comprados via PIX.
create table public.compras_creditos (
  id           uuid primary key default gen_random_uuid(),
  prestador_id uuid not null references public.prestadores(id) on delete cascade,
  pacote       text not null,                 -- "10", "30", "100"
  creditos     int not null,
  valor_reais  numeric(10,2) not null,
  txid_pix     text,
  status       public.status_credito not null default 'pendente',
  criado_em    timestamptz not null default now(),
  pago_em      timestamptz
);
create index idx_compras_prest on public.compras_creditos(prestador_id, status);

-- Registro de cada lead cobrado (contato liberado). Base pra extrato e devolução.
create table public.leads_cobrados (
  id                uuid primary key default gen_random_uuid(),
  prestador_id      uuid not null references public.prestadores(id) on delete cascade,
  pedido_id         uuid references public.pedidos(id) on delete set null,
  contratacao_id    uuid references public.contratacoes_loja(id) on delete set null,
  cliente_id        uuid not null references public.usuarios(id),
  creditos_gastos   int not null default 0,   -- 0 quando usou lead grátis
  usou_lead_gratis  boolean not null default false,
  cobrado_em        timestamptz not null default now(),
  devolvido         boolean not null default false,
  devolvido_em      timestamptz,
  devolvido_motivo  text                      -- "cliente não respondeu em 48h", "pedido falso"
);
create index idx_leads_prest on public.leads_cobrados(prestador_id, cobrado_em desc);

-- ============================================================
-- CONFIANÇA
-- ============================================================

create table public.avaliacoes (
  id             uuid primary key default gen_random_uuid(),
  pedido_id      uuid references public.pedidos(id) on delete set null,
  contratacao_id uuid references public.contratacoes_loja(id) on delete set null,
  autor_id       uuid not null references public.usuarios(id) on delete cascade,
  destinatario_id uuid not null references public.usuarios(id) on delete cascade,
  nota           int not null check (nota between 1 and 5),
  comentario     text,
  tags           text[] default '{}',         -- 'pontual','educado','capricho','preco_justo'
  criado_em      timestamptz not null default now(),
  check (autor_id <> destinatario_id)
);
create index idx_avaliacoes_dest on public.avaliacoes(destinatario_id, criado_em desc);
comment on table public.avaliacoes is 'Avaliação bidirecional. Cliente avalia prestador e vice-versa.';

create table public.denuncias (
  id            uuid primary key default gen_random_uuid(),
  denunciante_id uuid not null references public.usuarios(id) on delete cascade,
  denunciado_id  uuid not null references public.usuarios(id) on delete cascade,
  pedido_id     uuid references public.pedidos(id) on delete set null,
  tipo          text not null,
  descricao     text,
  status        public.status_denuncia not null default 'aberta',
  criado_em     timestamptz not null default now(),
  resolvido_em  timestamptz
);
create index idx_denuncias_status on public.denuncias(status);

-- Chat interno enxuto (antes de liberar o WhatsApp). Uma mensagem por linha.
create table public.mensagens (
  id          uuid primary key default gen_random_uuid(),
  pedido_id   uuid not null references public.pedidos(id) on delete cascade,
  remetente_id uuid not null references public.usuarios(id) on delete cascade,
  texto       text not null,
  criado_em   timestamptz not null default now()
);
create index idx_mensagens_pedido on public.mensagens(pedido_id, criado_em);

-- ============================================================
-- ADMIN
-- ============================================================

-- Lista simples de administradores (você). Consultada nas policies.
create table public.admins (
  usuario_id uuid primary key references public.usuarios(id) on delete cascade
);
comment on table public.admins is 'Quem tem poder de admin. Consultada por eh_admin().';

-- ------------------------------------------------------------
-- Gatilho: manter pedidos.atualizado_em
-- ------------------------------------------------------------
create or replace function public.touch_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

create trigger trg_pedidos_touch
  before update on public.pedidos
  for each row execute function public.touch_atualizado_em();
