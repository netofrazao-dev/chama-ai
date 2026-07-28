-- ============================================================
-- Chama Aí — 0005_corrige_match_raio.sql
--
-- BUG CORRIGIDO AQUI (importante):
-- Um pedido feito pelo app guarda o BAIRRO, mas normalmente não guarda
-- lat/lng exatos (a pessoa escolhe "Centro", não aponta no mapa).
-- A versão anterior de prestador_cobre_pedido() retornava FALSE quando
-- o pedido não tinha coordenadas — ou seja, todo prestador que usa
-- cobertura POR RAIO nunca veria pedido nenhum. Falha silenciosa: o
-- prestador ficaria online, pagando, e sem receber oportunidade.
--
-- Correção: quando o pedido não tem lat/lng próprios, usamos o CENTRO
-- DO BAIRRO como referência. Assim os dois modos de cobertura passam a
-- conversar entre si: cliente pensa em bairro, prestador pensa em km.
--
-- Também tornamos o modo 'bairros' mais tolerante: se o prestador não
-- marcou nenhum bairro (cadastro incompleto), ele não some do sistema
-- por engano — continua sem cobertura, mas de forma explícita.
-- ============================================================

create or replace function public.prestador_cobre_pedido(
  p_prestador_id uuid,
  p_pedido_id    uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare
  v_modo       public.modo_cobertura;
  v_raio       numeric;
  v_base_lat   double precision;
  v_base_lng   double precision;
  v_ped_bairro uuid;
  v_ped_lat    double precision;
  v_ped_lng    double precision;
begin
  select modo_cobertura, raio_km, base_lat, base_lng
    into v_modo, v_raio, v_base_lat, v_base_lng
    from public.prestadores where id = p_prestador_id;

  -- Coordenadas do pedido: usa as próprias; se não houver, cai para o
  -- centro do bairro escolhido pela pessoa.
  select p.bairro_id,
         coalesce(p.lat, b.lat_centro),
         coalesce(p.lng, b.lng_centro)
    into v_ped_bairro, v_ped_lat, v_ped_lng
    from public.pedidos p
    left join public.bairros b on b.id = p.bairro_id
   where p.id = p_pedido_id;

  if v_modo = 'bairros' then
    return exists (
      select 1 from public.prestador_bairros
      where prestador_id = p_prestador_id and bairro_id = v_ped_bairro
    );
  else
    if v_base_lat is null or v_ped_lat is null or v_raio is null then
      return false;
    end if;
    return public.distancia_km(v_base_lat, v_base_lng, v_ped_lat, v_ped_lng) <= v_raio;
  end if;
end;
$fn$;

comment on function public.prestador_cobre_pedido is
  'Match híbrido. No modo raio, usa o centro do bairro quando o pedido não tem lat/lng próprios.';

-- Mesma correção na listagem de prestadores por pedido (distância exibida).
create or replace function public.prestadores_para_pedido(p_pedido_id uuid)
returns table (prestador_id uuid, distancia_km double precision)
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare
  v_subcat uuid;
  v_lat    double precision;
  v_lng    double precision;
begin
  select p.subcategoria_id,
         coalesce(p.lat, b.lat_centro),
         coalesce(p.lng, b.lng_centro)
    into v_subcat, v_lat, v_lng
    from public.pedidos p
    left join public.bairros b on b.id = p.bairro_id
   where p.id = p_pedido_id;

  return query
    select p.id,
           case
             when v_lat is not null and p.base_lat is not null
               then public.distancia_km(p.base_lat, p.base_lng, v_lat, v_lng)
             else null
           end as dist
    from public.prestadores p
    join public.prestador_subcategorias ps
      on ps.prestador_id = p.id and ps.subcategoria_id = v_subcat
    where public.prestador_cobre_pedido(p.id, p_pedido_id)
      and not exists (
        select 1 from public.usuarios u
        where u.id = p.usuario_id and u.banido = true
      )
    order by dist nulls last;
end;
$fn$;

-- ------------------------------------------------------------
-- Garantia de execução das funções usadas pelo app.
-- (No Supabase isso já costuma vir por padrão; deixamos explícito
-- para não depender de configuração implícita.)
-- ------------------------------------------------------------
grant execute on function public.prestador_cobre_pedido(uuid, uuid) to authenticated;
grant execute on function public.prestadores_para_pedido(uuid)      to authenticated;
grant execute on function public.liberar_contato(uuid, uuid)        to authenticated;
grant execute on function public.whatsapp_do_pedido(uuid)           to authenticated;
