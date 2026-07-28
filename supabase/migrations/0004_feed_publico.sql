-- ============================================================
-- Chama Aí — 0004_feed_publico.sql
-- Vitrine pública SEM login + endurecimento de privacidade.
--
-- Contexto de segurança: no Supabase, os papéis `anon` e
-- `authenticated` já recebem GRANT nas tabelas do schema public; o RLS
-- é o guarda de verdade. Como o RLS é por LINHA (não por coluna), uma
-- policy `using(true)` numa tabela com telefone/coordenadas vazaria
-- esses dados. Por isso:
--   - a leitura publica passa a ser feita SO por VIEWS que expoem
--     colunas seguras (sem telefone, endereco exato ou saldo);
--   - as tabelas-base sensiveis (usuarios, prestadores) so podem ser
--     lidas pelo proprio dono ou admin;
--   - o telefone so e revelado a quem e parte de um negocio fechado
--     e pago, via funcao SECURITY DEFINER.
-- ============================================================

-- 1) ENDURECER usuarios: sem leitura publica da tabela-base.
drop policy if exists "usuarios_leitura_publica" on public.usuarios;
create policy "usuarios_le_proprio" on public.usuarios for select
  using (id = auth.uid() or public.eh_admin());

-- View publica com o minimo: nome e foto.
create or replace view public.perfis_publicos
with (security_invoker = false) as
  select id, nome, foto_url, tipo
  from public.usuarios
  where banido = false;

-- 2) ENDURECER prestadores: base tem coordenadas e saldo.
drop policy if exists "prestadores_leitura_publica" on public.prestadores;
create policy "prestadores_le_dono" on public.prestadores for select
  using (usuario_id = auth.uid() or public.eh_admin());

-- 3) VIEW: feed de PEDIDOS abertos.
create or replace view public.feed_pedidos
with (security_invoker = false) as
  select
    p.id, p.modo, p.status, p.criado_em, p.prazo_desejado,
    coalesce(p.transcricao, p.descricao)        as descricao,
    (array_length(p.foto_urls, 1) is not null)  as tem_foto,
    s.id as subcategoria_id, s.nome as subcategoria,
    c.nome as categoria, c.slug as categoria_slug, c.icone as categoria_icone,
    b.id as bairro_id, b.nome as bairro, b.cidade as cidade,
    split_part(u.nome, ' ', 1) as cliente_nome, u.foto_url as cliente_foto
  from public.pedidos p
  join public.subcategorias s on s.id = p.subcategoria_id
  join public.categorias   c on c.id = s.categoria_id
  left join public.bairros b on b.id = p.bairro_id
  join public.usuarios     u on u.id = p.cliente_id
  where p.status in ('aberto','com_orcamentos') and u.banido = false
  order by p.criado_em desc;

-- 4) VIEW: feed de PRESTADORES.
create or replace view public.feed_prestadores
with (security_invoker = false) as
  select
    pr.id, u.nome as nome, u.foto_url as foto_url, pr.bio, pr.foto_capa_url,
    pr.nivel, pr.nota_media, pr.total_avaliacoes, pr.total_concluidos,
    pr.esta_online, pr.tem_loja, pr.aceita_orcamento, pr.aceita_pedido_rapido,
    pr.modo_cobertura, pr.raio_km,
    (select coalesce(array_agg(distinct s.nome order by s.nome), '{}')
       from public.prestador_subcategorias ps
       join public.subcategorias s on s.id = ps.subcategoria_id
      where ps.prestador_id = pr.id) as servicos,
    (select coalesce(array_agg(distinct c.slug), '{}')
       from public.prestador_subcategorias ps
       join public.subcategorias s on s.id = ps.subcategoria_id
       join public.categorias    c on c.id = s.categoria_id
      where ps.prestador_id = pr.id) as categorias_slugs,
    (select coalesce(array_agg(b.nome order by b.nome), '{}')
       from public.prestador_bairros pb
       join public.bairros b on b.id = pb.bairro_id
      where pb.prestador_id = pr.id) as bairros_atendidos
  from public.prestadores pr
  join public.usuarios u on u.id = pr.usuario_id
  where u.banido = false
  order by pr.esta_online desc, pr.nota_media desc, pr.total_concluidos desc;

-- 5) VIEW: catalogo publico da loja.
create or replace view public.feed_servicos_loja
with (security_invoker = false) as
  select
    sl.id, sl.prestador_id, sl.titulo, sl.descricao, sl.foto_url,
    sl.unidade, sl.preco_min, sl.preco_max, sl.duracao_min,
    s.nome as subcategoria, c.slug as categoria_slug
  from public.servicos_loja sl
  join public.subcategorias s on s.id = sl.subcategoria_id
  join public.categorias    c on c.id = s.categoria_id
  where sl.ativo = true;

-- 6) REVELACAO DE CONTATO: telefone so para parte de negocio pago.
create or replace function public.whatsapp_do_pedido(p_pedido_id uuid)
returns table (nome text, whatsapp text)
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare
  v_cliente   uuid;
  v_prest_ace uuid;
  v_prest_meu uuid;
begin
  select cliente_id, prestador_aceito_id into v_cliente, v_prest_ace
    from public.pedidos where id = p_pedido_id;
  select id into v_prest_meu from public.prestadores where usuario_id = auth.uid();

  if v_cliente = auth.uid() and v_prest_ace is not null then
    return query
      select u.nome, coalesce(u.whatsapp, u.telefone)
      from public.prestadores pr join public.usuarios u on u.id = pr.usuario_id
      where pr.id = v_prest_ace;
    return;
  end if;

  if v_prest_meu is not null and exists (
       select 1 from public.leads_cobrados
        where prestador_id = v_prest_meu and pedido_id = p_pedido_id and devolvido = false
     ) then
    return query
      select u.nome, coalesce(u.whatsapp, u.telefone)
      from public.usuarios u where u.id = v_cliente;
    return;
  end if;

  return;
end;
$fn$;

comment on function public.whatsapp_do_pedido is
  'Revela o WhatsApp da contraparte so a quem e parte de um negocio fechado/pago.';

-- 7) PERMISSOES.
grant usage on schema public to anon, authenticated;
grant select on public.feed_pedidos       to anon, authenticated;
grant select on public.feed_prestadores   to anon, authenticated;
grant select on public.feed_servicos_loja to anon, authenticated;
grant select on public.perfis_publicos    to anon, authenticated;
grant select on public.categorias   to anon, authenticated;
grant select on public.subcategorias to anon, authenticated;
grant select on public.bairros       to anon, authenticated;
revoke select on public.usuarios    from anon;
revoke select on public.prestadores from anon;
