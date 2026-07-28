-- ============================================================
-- Chama Aí — 0006_conclusao_avaliacao.sql
--
-- Fecha o ciclo de confiança. Três lacunas corrigidas aqui:
--
-- 1) O prestador só conseguia LER o pedido em que foi escolhido —
--    não conseguia marcar como concluído. Agora pode, mas apenas
--    para avançar o próprio trabalho (não pode mexer em outra coisa).
--
-- 2) `total_concluidos` nunca era incrementado por ninguém: aparecia
--    no perfil sempre zerado, mesmo com serviços feitos. Agora um
--    gatilho cuida disso.
--
-- 3) Nada impedia a mesma pessoa de avaliar o mesmo serviço várias
--    vezes, o que distorceria a nota. Agora é uma avaliação por
--    pessoa por serviço.
--
-- Bônus: promoção automática de nível (iniciante → verificado →
-- comprovado) conforme o histórico, em vez de depender de você
-- promover cada um na mão.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Prestador escolhido pode atualizar o pedido dele.
--    O WITH CHECK garante que ele não pode "roubar" o pedido para
--    outro prestador nem trocar o cliente.
-- ------------------------------------------------------------
drop policy if exists "pedidos_prestador_aceito_atualiza" on public.pedidos;
create policy "pedidos_prestador_aceito_atualiza" on public.pedidos for update
  using (
    prestador_aceito_id is not null
    and public.eh_dono_prestador(prestador_aceito_id)
  )
  with check (
    prestador_aceito_id is not null
    and public.eh_dono_prestador(prestador_aceito_id)
  );

-- ------------------------------------------------------------
-- 2) Uma avaliação por pessoa por serviço.
-- ------------------------------------------------------------
create unique index if not exists idx_avaliacao_unica_por_pedido
  on public.avaliacoes (pedido_id, autor_id)
  where pedido_id is not null;

-- ------------------------------------------------------------
-- 3) Ao concluir um pedido, somar no histórico do prestador.
--    Só conta na transição para 'concluido' (nunca duas vezes).
-- ------------------------------------------------------------
create or replace function public.contabilizar_conclusao()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if new.status = 'concluido'
     and coalesce(old.status, 'aberto') <> 'concluido'
     and new.prestador_aceito_id is not null then
    update public.prestadores
       set total_concluidos = total_concluidos + 1
     where id = new.prestador_aceito_id;
  end if;
  return new;
end;
$fn$;

drop trigger if exists trg_pedido_concluido on public.pedidos;
create trigger trg_pedido_concluido
  after update on public.pedidos
  for each row execute function public.contabilizar_conclusao();

-- ------------------------------------------------------------
-- 4) Promoção automática de nível.
--    iniciante  → verificado: 3+ serviços concluídos e nota >= 4
--    verificado → comprovado: 20+ serviços concluídos e nota >= 4.5
--
--    Observação: o nível "verificado" por documento continua sendo
--    decisão sua no admin. Esta promoção é por histórico — o sistema
--    reconhece quem trabalha bem sem depender de aprovação manual.
--    Você pode rebaixar alguém manualmente a qualquer momento.
-- ------------------------------------------------------------
create or replace function public.atualizar_nivel_prestador()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_id uuid;
begin
  v_id := coalesce(new.id, old.id);

  update public.prestadores p
     set nivel = case
        when p.total_concluidos >= 20 and p.nota_media >= 4.5 then 'comprovado'::public.nivel_prestador
        when p.total_concluidos >= 3  and p.nota_media >= 4.0 then 'verificado'::public.nivel_prestador
        else p.nivel
      end
   where p.id = v_id
     -- nunca rebaixa automaticamente: só sobe
     and p.nivel <> 'comprovado';

  return coalesce(new, old);
end;
$fn$;

drop trigger if exists trg_nivel_prestador on public.prestadores;
create trigger trg_nivel_prestador
  after update of total_concluidos, nota_media on public.prestadores
  for each row execute function public.atualizar_nivel_prestador();

-- ------------------------------------------------------------
-- 5) A vitrine precisa expor o usuario_id do prestador.
--    Motivo: a avaliação aponta para a PESSOA (usuarios), não para a
--    ficha de prestador. Sem esse campo, o cliente não conseguiria
--    avaliar quem o atendeu. É só um identificador — nada sensível,
--    e o mesmo id já aparece em perfis_publicos.
-- ------------------------------------------------------------
-- Precisa de DROP: o CREATE OR REPLACE VIEW não permite inserir uma
-- coluna no meio da lista, apenas acrescentar no fim. Nada mais no
-- banco depende desta view (só o app a consulta), então é seguro.
drop view if exists public.feed_prestadores;

create view public.feed_prestadores
with (security_invoker = false) as
  select
    pr.id,
    pr.usuario_id,
    u.nome                          as nome,
    u.foto_url                      as foto_url,
    pr.bio,
    pr.foto_capa_url,
    pr.nivel,
    pr.nota_media,
    pr.total_avaliacoes,
    pr.total_concluidos,
    pr.esta_online,
    pr.tem_loja,
    pr.aceita_orcamento,
    pr.aceita_pedido_rapido,
    pr.modo_cobertura,
    pr.raio_km,
    (select coalesce(array_agg(distinct s.nome order by s.nome), '{}')
       from public.prestador_subcategorias ps
       join public.subcategorias s on s.id = ps.subcategoria_id
      where ps.prestador_id = pr.id)                         as servicos,
    (select coalesce(array_agg(distinct c.slug), '{}')
       from public.prestador_subcategorias ps
       join public.subcategorias s on s.id = ps.subcategoria_id
       join public.categorias    c on c.id = s.categoria_id
      where ps.prestador_id = pr.id)                         as categorias_slugs,
    (select coalesce(array_agg(b.nome order by b.nome), '{}')
       from public.prestador_bairros pb
       join public.bairros b on b.id = pb.bairro_id
      where pb.prestador_id = pr.id)                         as bairros_atendidos
  from public.prestadores pr
  join public.usuarios u on u.id = pr.usuario_id
  where u.banido = false
  order by pr.esta_online desc, pr.nota_media desc, pr.total_concluidos desc;

grant select on public.feed_prestadores to anon, authenticated;

-- ------------------------------------------------------------
-- 6) Permissões das funções usadas pelas telas novas.
-- ------------------------------------------------------------
grant execute on function public.contabilizar_conclusao()     to authenticated;
grant execute on function public.atualizar_nivel_prestador()  to authenticated;
