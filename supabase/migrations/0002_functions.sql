-- ============================================================
-- Chama Aí — Milestone 0 (Fundação)
-- 0002_functions.sql
-- Lógica de negócio no banco (fica perto dos dados, roda igual
-- pra web/app/edge function, e protege regras críticas de cobrança).
-- ============================================================

-- ------------------------------------------------------------
-- eh_admin(): a pessoa logada é admin?
-- ------------------------------------------------------------
create or replace function public.eh_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where usuario_id = auth.uid());
$$;

-- ------------------------------------------------------------
-- eh_prestador(prestador_id): a pessoa logada é dona desta ficha?
-- ------------------------------------------------------------
create or replace function public.eh_dono_prestador(p_prestador_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.prestadores
    where id = p_prestador_id and usuario_id = auth.uid()
  );
$$;

-- ------------------------------------------------------------
-- prestador_cobre_pedido(prestador_id, pedido_id): coração do match híbrido.
-- Retorna true se o pedido cai na área de atendimento do prestador,
-- respeitando o modo escolhido (bairros OU raio).
-- ------------------------------------------------------------
create or replace function public.prestador_cobre_pedido(
  p_prestador_id uuid,
  p_pedido_id    uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
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

  select bairro_id, lat, lng
    into v_ped_bairro, v_ped_lat, v_ped_lng
    from public.pedidos where id = p_pedido_id;

  if v_modo = 'bairros' then
    -- cobre se o bairro do pedido está entre os bairros atendidos
    return exists (
      select 1 from public.prestador_bairros
      where prestador_id = p_prestador_id and bairro_id = v_ped_bairro
    );
  else
    -- modo raio: precisa das coordenadas dos dois lados
    if v_base_lat is null or v_ped_lat is null or v_raio is null then
      return false;
    end if;
    return public.distancia_km(v_base_lat, v_base_lng, v_ped_lat, v_ped_lng) <= v_raio;
  end if;
end;
$$;

comment on function public.prestador_cobre_pedido is
  'Match híbrido: bairro na lista OU distância <= raio, conforme modo_cobertura do prestador.';

-- ------------------------------------------------------------
-- prestadores_para_pedido(pedido_id): quem pode receber este pedido.
-- Cruza subcategoria + cobertura. Usada pelo feed de orçamento e
-- pelo despacho do modo rápido (ordenando por distância).
-- ------------------------------------------------------------
create or replace function public.prestadores_para_pedido(p_pedido_id uuid)
returns table (prestador_id uuid, distancia_km double precision)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_subcat uuid;
  v_lat    double precision;
  v_lng    double precision;
begin
  select subcategoria_id, lat, lng into v_subcat, v_lat, v_lng
    from public.pedidos where id = p_pedido_id;

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
$$;

-- ------------------------------------------------------------
-- liberar_contato(prestador_id, pedido_id): debita 1 lead.
-- Regra central da monetização — roda de forma atômica e usa
-- lead grátis primeiro, senão crédito, senão erro.
-- Retorna o custo em créditos (0 se usou lead grátis).
-- ------------------------------------------------------------
create or replace function public.liberar_contato(
  p_prestador_id uuid,
  p_pedido_id    uuid
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_preco_lead     int;
  v_gratis         int;
  v_credito        int;
  v_cliente        uuid;
  v_ja_cobrado     boolean;
begin
  -- só o dono da ficha (ou admin) pode liberar contato dela
  if not (public.eh_dono_prestador(p_prestador_id) or public.eh_admin()) then
    raise exception 'sem_permissao';
  end if;

  -- já cobrou este par prestador+pedido? então não cobra de novo (idempotente)
  select exists (
    select 1 from public.leads_cobrados
    where prestador_id = p_prestador_id and pedido_id = p_pedido_id and devolvido = false
  ) into v_ja_cobrado;
  if v_ja_cobrado then
    return 0;
  end if;

  select s.preco_lead, ped.cliente_id
    into v_preco_lead, v_cliente
    from public.pedidos ped
    join public.subcategorias s on s.id = ped.subcategoria_id
    where ped.id = p_pedido_id;

  select leads_gratis_restantes, credito_disponivel
    into v_gratis, v_credito
    from public.prestadores
    where id = p_prestador_id
    for update;   -- trava a linha pra evitar corrida

  if v_gratis > 0 then
    update public.prestadores
      set leads_gratis_restantes = leads_gratis_restantes - 1
      where id = p_prestador_id;

    insert into public.leads_cobrados
      (prestador_id, pedido_id, cliente_id, creditos_gastos, usou_lead_gratis)
      values (p_prestador_id, p_pedido_id, v_cliente, 0, true);
    return 0;

  elsif v_credito >= v_preco_lead then
    update public.prestadores
      set credito_disponivel = credito_disponivel - v_preco_lead
      where id = p_prestador_id;

    insert into public.leads_cobrados
      (prestador_id, pedido_id, cliente_id, creditos_gastos, usou_lead_gratis)
      values (p_prestador_id, p_pedido_id, v_cliente, v_preco_lead, false);
    return v_preco_lead;

  else
    raise exception 'creditos_insuficientes';
  end if;
end;
$$;

comment on function public.liberar_contato is
  'Debita 1 lead (grátis primeiro, senão crédito). Atômica e idempotente por (prestador,pedido).';

-- ------------------------------------------------------------
-- devolver_lead(lead_id, motivo): estorna crédito (cliente sumiu / pedido falso).
-- ------------------------------------------------------------
create or replace function public.devolver_lead(p_lead_id uuid, p_motivo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prest   uuid;
  v_creditos int;
  v_gratis  boolean;
begin
  if not public.eh_admin() then
    raise exception 'sem_permissao';
  end if;

  select prestador_id, creditos_gastos, usou_lead_gratis
    into v_prest, v_creditos, v_gratis
    from public.leads_cobrados
    where id = p_lead_id and devolvido = false
    for update;

  if v_prest is null then
    raise exception 'lead_inexistente_ou_ja_devolvido';
  end if;

  update public.leads_cobrados
    set devolvido = true, devolvido_em = now(), devolvido_motivo = p_motivo
    where id = p_lead_id;

  if v_gratis then
    update public.prestadores set leads_gratis_restantes = leads_gratis_restantes + 1 where id = v_prest;
  else
    update public.prestadores set credito_disponivel = credito_disponivel + v_creditos where id = v_prest;
  end if;
end;
$$;

-- ------------------------------------------------------------
-- Recalcular reputação do prestador após nova avaliação.
-- ------------------------------------------------------------
create or replace function public.recalcular_reputacao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prest uuid;
begin
  -- só recalcula quando o destinatário é um prestador
  select id into v_prest from public.prestadores
    where usuario_id = coalesce(new.destinatario_id, old.destinatario_id);

  if v_prest is not null then
    update public.prestadores p
      set nota_media = coalesce((
            select round(avg(nota)::numeric, 2)
            from public.avaliacoes a
            join public.prestadores pp on pp.usuario_id = a.destinatario_id
            where pp.id = v_prest
          ), 0),
          total_avaliacoes = (
            select count(*)
            from public.avaliacoes a
            join public.prestadores pp on pp.usuario_id = a.destinatario_id
            where pp.id = v_prest
          )
      where p.id = v_prest;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger trg_avaliacao_reputacao
  after insert or update or delete on public.avaliacoes
  for each row execute function public.recalcular_reputacao();

-- ------------------------------------------------------------
-- Ao criar usuário em auth.users, criar perfil em public.usuarios.
-- Puxa nome/telefone dos metadados do OTP.
-- ------------------------------------------------------------
create or replace function public.handle_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.usuarios (id, nome, telefone, whatsapp)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', 'Novo usuário'),
    coalesce(new.phone, new.raw_user_meta_data->>'telefone', ''),
    coalesce(new.raw_user_meta_data->>'whatsapp', new.phone)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger trg_auth_novo_usuario
  after insert on auth.users
  for each row execute function public.handle_novo_usuario();
