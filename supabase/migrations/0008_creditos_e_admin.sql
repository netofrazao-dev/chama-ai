-- ============================================================
-- Chama Aí — 0008_creditos_e_admin.sql
--
-- Três coisas:
--   1) Pacotes de crédito (preço editável sem precisar publicar o app)
--   2) Compra por PIX com confirmação manual do admin
--   3) Consultas e ações que o painel de administração precisa
--
-- Sobre a escolha do PIX manual: não usamos gateway de pagamento.
-- O prestador vê o QR / copia-e-cola, paga, e você confirma no painel.
-- Para o volume de Breves isso é mais simples, não tem taxa de gateway
-- e não exige CNPJ nem contrato. Quando o volume crescer, troca-se a
-- confirmação manual por webhook sem mexer no resto do sistema.
--
-- Idempotente.
-- ============================================================

-- ------------------------------------------------------------
-- 1) PACOTES DE CRÉDITO
-- ------------------------------------------------------------
create table if not exists public.pacotes_creditos (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  creditos    int  not null,
  valor_reais numeric(10,2) not null,
  destaque    boolean not null default false,
  ordem       int not null default 0,
  ativo       boolean not null default true
);

comment on table public.pacotes_creditos is
  'Pacotes à venda. Editável pelo admin — mudar preço não exige publicar o app.';

insert into public.pacotes_creditos (nome, creditos, valor_reais, destaque, ordem)
select * from (values
  ('10 contatos',   10,  30.00, false, 1),
  ('30 contatos',   30,  75.00, true,  2),
  ('100 contatos', 100, 200.00, false, 3)
) as v(nome, creditos, valor_reais, destaque, ordem)
where not exists (select 1 from public.pacotes_creditos);

alter table public.pacotes_creditos enable row level security;

drop policy if exists "pacotes_leitura_publica" on public.pacotes_creditos;
create policy "pacotes_leitura_publica" on public.pacotes_creditos
  for select using (ativo = true or public.eh_admin());

drop policy if exists "pacotes_admin_escreve" on public.pacotes_creditos;
create policy "pacotes_admin_escreve" on public.pacotes_creditos
  for all using (public.eh_admin()) with check (public.eh_admin());

grant select on public.pacotes_creditos to anon, authenticated;

-- ------------------------------------------------------------
-- 2) CONFIGURAÇÕES (chave PIX, nome do recebedor...)
--    Guardadas no banco para você poder mudar sem republicar o app.
-- ------------------------------------------------------------
create table if not exists public.configuracoes (
  chave text primary key,
  valor text
);

insert into public.configuracoes (chave, valor)
select * from (values
  ('pix_chave',     ''),
  ('pix_nome',      'CHAMA AI'),
  ('pix_cidade',    'BREVES'),
  ('suporte_whatsapp', '')
) as v(chave, valor)
on conflict (chave) do nothing;

alter table public.configuracoes enable row level security;

drop policy if exists "config_leitura_publica" on public.configuracoes;
create policy "config_leitura_publica" on public.configuracoes for select using (true);

drop policy if exists "config_admin_escreve" on public.configuracoes;
create policy "config_admin_escreve" on public.configuracoes
  for all using (public.eh_admin()) with check (public.eh_admin());

grant select on public.configuracoes to anon, authenticated;

-- ------------------------------------------------------------
-- 3) COMPRAR CRÉDITOS — cria o pedido de compra como PENDENTE.
--    Nada de crédito é somado aqui: só entra depois que o pagamento
--    for confirmado. Assim ninguém ganha crédito sem pagar.
-- ------------------------------------------------------------
create or replace function public.criar_compra_creditos(p_pacote_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_prest    uuid;
  v_creditos int;
  v_valor    numeric;
  v_nome     text;
  v_id       uuid;
begin
  select id into v_prest from public.prestadores where usuario_id = auth.uid();
  if v_prest is null then
    raise exception 'nao_e_prestador';
  end if;

  select creditos, valor_reais, nome into v_creditos, v_valor, v_nome
    from public.pacotes_creditos where id = p_pacote_id and ativo = true;
  if v_creditos is null then
    raise exception 'pacote_invalido';
  end if;

  insert into public.compras_creditos (prestador_id, pacote, creditos, valor_reais, status)
  values (v_prest, v_nome, v_creditos, v_valor, 'pendente')
  returning id into v_id;

  return v_id;
end;
$fn$;

-- ------------------------------------------------------------
-- 4) CONFIRMAR PAGAMENTO — só admin. Soma os créditos de verdade.
--    Idempotente: confirmar duas vezes não credita em dobro.
-- ------------------------------------------------------------
create or replace function public.confirmar_compra_creditos(p_compra_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_prest    uuid;
  v_creditos int;
  v_status   public.status_credito;
begin
  if not public.eh_admin() then
    raise exception 'sem_permissao';
  end if;

  select prestador_id, creditos, status
    into v_prest, v_creditos, v_status
    from public.compras_creditos
   where id = p_compra_id
     for update;

  if v_prest is null then
    raise exception 'compra_inexistente';
  end if;

  if v_status = 'pago' then
    return;                        -- já creditado, não faz de novo
  end if;

  update public.compras_creditos
     set status = 'pago', pago_em = now()
   where id = p_compra_id;

  update public.prestadores
     set credito_disponivel = credito_disponivel + v_creditos
   where id = v_prest;
end;
$fn$;

-- ------------------------------------------------------------
-- 5) ADMIN: aprovar / rebaixar prestador manualmente.
-- ------------------------------------------------------------
create or replace function public.definir_nivel_prestador(
  p_prestador_id uuid,
  p_nivel        public.nivel_prestador
)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if not public.eh_admin() then
    raise exception 'sem_permissao';
  end if;
  update public.prestadores set nivel = p_nivel where id = p_prestador_id;
end;
$fn$;

-- ------------------------------------------------------------
-- 6) ADMIN: banir / desbanir pessoa.
-- ------------------------------------------------------------
create or replace function public.definir_banimento(
  p_usuario_id uuid,
  p_banido     boolean,
  p_motivo     text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if not public.eh_admin() then
    raise exception 'sem_permissao';
  end if;
  update public.usuarios
     set banido = p_banido,
         banido_motivo = case when p_banido then p_motivo else null end
   where id = p_usuario_id;
end;
$fn$;

-- ------------------------------------------------------------
-- 7) ADMIN: visão geral em números (para a home do painel).
-- ------------------------------------------------------------
create or replace function public.resumo_admin()
returns table (
  total_usuarios      bigint,
  total_prestadores   bigint,
  pedidos_abertos     bigint,
  pedidos_concluidos  bigint,
  orcamentos_enviados bigint,
  leads_cobrados      bigint,
  denuncias_abertas   bigint,
  compras_pendentes   bigint
)
language sql
stable
security definer
set search_path = public
as $fn$
  select
    (select count(*) from public.usuarios where banido = false),
    (select count(*) from public.prestadores),
    (select count(*) from public.pedidos where status in ('aberto','com_orcamentos')),
    (select count(*) from public.pedidos where status = 'concluido'),
    (select count(*) from public.orcamentos),
    (select count(*) from public.leads_cobrados where devolvido = false),
    (select count(*) from public.denuncias where status = 'aberta'),
    (select count(*) from public.compras_creditos where status = 'pendente')
  where public.eh_admin();
$fn$;

-- ------------------------------------------------------------
-- 8) ADMIN: listas para as telas do painel.
--    Views com filtro de admin embutido — quem não é admin recebe
--    lista vazia, mesmo que consiga chamar.
-- ------------------------------------------------------------
create or replace view public.admin_prestadores as
  select
    pr.id, pr.usuario_id, u.nome, u.telefone, u.whatsapp, u.banido,
    pr.nivel, pr.nota_media, pr.total_avaliacoes, pr.total_concluidos,
    pr.credito_disponivel, pr.leads_gratis_restantes, pr.criado_em,
    (select count(*) from public.verificacoes v
      where v.usuario_id = pr.usuario_id and v.status = 'pendente') as verificacoes_pendentes
  from public.prestadores pr
  join public.usuarios u on u.id = pr.usuario_id
  where public.eh_admin()
  order by pr.criado_em desc;

create or replace view public.admin_compras as
  select
    c.id, c.prestador_id, u.nome as prestador_nome, u.whatsapp,
    c.pacote, c.creditos, c.valor_reais, c.status, c.criado_em, c.pago_em
  from public.compras_creditos c
  join public.prestadores pr on pr.id = c.prestador_id
  join public.usuarios u on u.id = pr.usuario_id
  where public.eh_admin()
  order by (c.status = 'pendente') desc, c.criado_em desc;

create or replace view public.admin_denuncias as
  select
    d.id, d.tipo, d.descricao, d.status, d.criado_em,
    da.nome as denunciante_nome,
    dd.id   as denunciado_id,
    dd.nome as denunciado_nome,
    dd.banido as denunciado_banido
  from public.denuncias d
  join public.usuarios da on da.id = d.denunciante_id
  join public.usuarios dd on dd.id = d.denunciado_id
  where public.eh_admin()
  order by (d.status = 'aberta') desc, d.criado_em desc;

create or replace view public.admin_leads as
  select
    l.id, l.cobrado_em, l.creditos_gastos, l.usou_lead_gratis,
    l.devolvido, l.devolvido_motivo,
    up.nome as prestador_nome,
    uc.nome as cliente_nome,
    s.nome  as servico
  from public.leads_cobrados l
  join public.prestadores pr on pr.id = l.prestador_id
  join public.usuarios up on up.id = pr.usuario_id
  join public.usuarios uc on uc.id = l.cliente_id
  left join public.pedidos p on p.id = l.pedido_id
  left join public.subcategorias s on s.id = p.subcategoria_id
  where public.eh_admin()
  order by l.cobrado_em desc;

grant select on public.admin_prestadores, public.admin_compras,
                public.admin_denuncias, public.admin_leads to authenticated;

grant execute on function public.criar_compra_creditos(uuid)                      to authenticated;
grant execute on function public.confirmar_compra_creditos(uuid)                  to authenticated;
grant execute on function public.definir_nivel_prestador(uuid, public.nivel_prestador) to authenticated;
grant execute on function public.definir_banimento(uuid, boolean, text)           to authenticated;
grant execute on function public.resumo_admin()                                   to authenticated;

-- ------------------------------------------------------------
-- 9) MODO RÁPIDO — aceitar um chamado.
--
-- Não dá para o prestador simplesmente atualizar o pedido: a política
-- de escrita exige que ele JÁ seja o escolhido, e antes de aceitar ele
-- não é. Daí esta função.
--
-- O ponto crítico é a corrida: dois prestadores tocando "aceitar" no
-- mesmo segundo. O UPDATE só casa enquanto `prestador_aceito_id` for
-- nulo, então o primeiro vence e o segundo recebe uma recusa clara em
-- vez de roubar o chamado.
-- ------------------------------------------------------------
create or replace function public.aceitar_pedido_rapido(p_pedido_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_prest    uuid;
  v_afetadas int;
begin
  select id into v_prest from public.prestadores where usuario_id = auth.uid();
  if v_prest is null then
    raise exception 'nao_e_prestador';
  end if;

  if not public.prestador_cobre_pedido(v_prest, p_pedido_id) then
    raise exception 'fora_da_sua_area';
  end if;

  update public.pedidos
     set prestador_aceito_id = v_prest,
         status = 'aceito'
   where id = p_pedido_id
     and prestador_aceito_id is null          -- primeiro que chegar leva
     and status in ('aberto', 'com_orcamentos');

  get diagnostics v_afetadas = row_count;
  return v_afetadas > 0;                      -- false = alguém pegou antes
end;
$fn$;

grant execute on function public.aceitar_pedido_rapido(uuid) to authenticated;

-- ------------------------------------------------------------
-- 10) TEMPO REAL — o prestador precisa ver o chamado chegar sem
--     ficar recarregando a tela. Publicamos a tabela de pedidos.
--     A RLS continua valendo: cada um só recebe evento do que já
--     teria permissão de ler.
-- ------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'pedidos'
  ) then
    alter publication supabase_realtime add table public.pedidos;
  end if;
exception
  when undefined_object then
    -- a publicação não existe (ex.: banco local sem Realtime). Ignorar.
    null;
end $$;
