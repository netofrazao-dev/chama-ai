-- ============================================================
-- Chama Aí — Milestone 0 (Fundação)
-- 0003_rls.sql
-- Row Level Security em TUDO. Regra geral:
--   cliente vê o que é dele; prestador vê pedidos que pode atender
--   e o que é dele; admin vê tudo. Leitura pública só do que precisa
--   aparecer na vitrine (prestadores, serviços, categorias, bairros).
-- ============================================================

-- Habilita RLS em todas as tabelas.
alter table public.usuarios                enable row level security;
alter table public.bairros                 enable row level security;
alter table public.enderecos_usuario       enable row level security;
alter table public.verificacoes            enable row level security;
alter table public.categorias              enable row level security;
alter table public.subcategorias           enable row level security;
alter table public.prestadores             enable row level security;
alter table public.prestador_subcategorias enable row level security;
alter table public.prestador_bairros       enable row level security;
alter table public.servicos_loja           enable row level security;
alter table public.pedidos                 enable row level security;
alter table public.pedido_notificados      enable row level security;
alter table public.orcamentos              enable row level security;
alter table public.contratacoes_loja       enable row level security;
alter table public.compras_creditos        enable row level security;
alter table public.leads_cobrados          enable row level security;
alter table public.avaliacoes              enable row level security;
alter table public.denuncias               enable row level security;
alter table public.mensagens               enable row level security;
alter table public.admins                  enable row level security;

-- ------------------------------------------------------------
-- Catálogo público (qualquer um lê; só admin escreve)
-- ------------------------------------------------------------
create policy "bairros_leitura_publica"      on public.bairros       for select using (true);
create policy "bairros_admin_escreve"         on public.bairros       for all using (public.eh_admin()) with check (public.eh_admin());

create policy "categorias_leitura_publica"    on public.categorias    for select using (true);
create policy "categorias_admin_escreve"      on public.categorias    for all using (public.eh_admin()) with check (public.eh_admin());

create policy "subcategorias_leitura_publica" on public.subcategorias for select using (true);
create policy "subcategorias_admin_escreve"   on public.subcategorias for all using (public.eh_admin()) with check (public.eh_admin());

-- ------------------------------------------------------------
-- Usuários
-- ------------------------------------------------------------
-- Leitura pública do perfil básico (nome/foto aparecem em pedidos e avaliações).
create policy "usuarios_leitura_publica" on public.usuarios for select using (true);
-- Só edito a mim mesmo.
create policy "usuarios_edita_proprio"   on public.usuarios for update
  using (id = auth.uid()) with check (id = auth.uid());
-- Admin faz tudo.
create policy "usuarios_admin"           on public.usuarios for all
  using (public.eh_admin()) with check (public.eh_admin());

-- ------------------------------------------------------------
-- Endereços — privados do dono.
-- ------------------------------------------------------------
create policy "enderecos_dono" on public.enderecos_usuario for all
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
create policy "enderecos_admin" on public.enderecos_usuario for select
  using (public.eh_admin());

-- ------------------------------------------------------------
-- Verificações — dono cria/lê as suas; admin gerencia.
-- ------------------------------------------------------------
create policy "verif_dono_le"   on public.verificacoes for select
  using (usuario_id = auth.uid() or public.eh_admin());
create policy "verif_dono_cria" on public.verificacoes for insert
  with check (usuario_id = auth.uid());
create policy "verif_admin"     on public.verificacoes for update
  using (public.eh_admin()) with check (public.eh_admin());

-- ------------------------------------------------------------
-- Prestadores — vitrine pública; dono edita a sua; admin tudo.
-- ------------------------------------------------------------
create policy "prestadores_leitura_publica" on public.prestadores for select using (true);
create policy "prestadores_cria"            on public.prestadores for insert
  with check (usuario_id = auth.uid());
create policy "prestadores_edita_dono"      on public.prestadores for update
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
create policy "prestadores_admin"           on public.prestadores for all
  using (public.eh_admin()) with check (public.eh_admin());

-- Subcategorias e bairros do prestador — leitura pública; escreve o dono.
create policy "prest_subcat_le"   on public.prestador_subcategorias for select using (true);
create policy "prest_subcat_dono" on public.prestador_subcategorias for all
  using (public.eh_dono_prestador(prestador_id))
  with check (public.eh_dono_prestador(prestador_id));

create policy "prest_bairros_le"   on public.prestador_bairros for select using (true);
create policy "prest_bairros_dono" on public.prestador_bairros for all
  using (public.eh_dono_prestador(prestador_id))
  with check (public.eh_dono_prestador(prestador_id));

-- Serviços da loja — vitrine pública; dono gerencia.
create policy "servicos_leitura_publica" on public.servicos_loja for select using (true);
create policy "servicos_dono"            on public.servicos_loja for all
  using (public.eh_dono_prestador(prestador_id))
  with check (public.eh_dono_prestador(prestador_id));

-- ------------------------------------------------------------
-- Pedidos — o ponto mais delicado.
--   cliente: enxerga e mexe nos seus.
--   prestador: enxerga pedidos ABERTOS que ele pode atender
--     (subcategoria dele + cobertura), pra poder orçar.
--   ambos veem o pedido quando já estão ligados a ele.
-- ------------------------------------------------------------
create policy "pedidos_cliente_dono" on public.pedidos for all
  using (cliente_id = auth.uid()) with check (cliente_id = auth.uid());

create policy "pedidos_prestador_ve_do_feed" on public.pedidos for select
  using (
    status in ('aberto','com_orcamentos','em_negociacao')
    and exists (
      select 1
      from public.prestadores p
      join public.prestador_subcategorias ps on ps.prestador_id = p.id
      where p.usuario_id = auth.uid()
        and ps.subcategoria_id = pedidos.subcategoria_id
        and public.prestador_cobre_pedido(p.id, pedidos.id)
    )
  );

create policy "pedidos_prestador_aceito_ve" on public.pedidos for select
  using (
    prestador_aceito_id is not null
    and public.eh_dono_prestador(prestador_aceito_id)
  );

create policy "pedidos_admin" on public.pedidos for all
  using (public.eh_admin()) with check (public.eh_admin());

-- ------------------------------------------------------------
-- Notificados (modo rápido) — prestador vê as suas; cliente vê do seu pedido.
-- ------------------------------------------------------------
create policy "notificados_prestador" on public.pedido_notificados for select
  using (public.eh_dono_prestador(prestador_id));
create policy "notificados_prestador_responde" on public.pedido_notificados for update
  using (public.eh_dono_prestador(prestador_id))
  with check (public.eh_dono_prestador(prestador_id));
create policy "notificados_cliente_ve" on public.pedido_notificados for select
  using (exists (select 1 from public.pedidos where id = pedido_id and cliente_id = auth.uid()));
create policy "notificados_admin" on public.pedido_notificados for all
  using (public.eh_admin()) with check (public.eh_admin());

-- ------------------------------------------------------------
-- Orçamentos — prestador cria/vê os seus; cliente vê os do seu pedido.
-- ------------------------------------------------------------
create policy "orcamentos_prestador_dono" on public.orcamentos for all
  using (public.eh_dono_prestador(prestador_id))
  with check (public.eh_dono_prestador(prestador_id));
create policy "orcamentos_cliente_ve" on public.orcamentos for select
  using (exists (select 1 from public.pedidos where id = pedido_id and cliente_id = auth.uid()));
create policy "orcamentos_admin" on public.orcamentos for all
  using (public.eh_admin()) with check (public.eh_admin());

-- ------------------------------------------------------------
-- Contratações de loja — visíveis pra cliente e prestador envolvidos.
-- ------------------------------------------------------------
create policy "contratacoes_partes" on public.contratacoes_loja for select
  using (cliente_id = auth.uid() or public.eh_dono_prestador(prestador_id));
create policy "contratacoes_cliente_cria" on public.contratacoes_loja for insert
  with check (cliente_id = auth.uid());
create policy "contratacoes_partes_editam" on public.contratacoes_loja for update
  using (cliente_id = auth.uid() or public.eh_dono_prestador(prestador_id))
  with check (cliente_id = auth.uid() or public.eh_dono_prestador(prestador_id));
create policy "contratacoes_admin" on public.contratacoes_loja for all
  using (public.eh_admin()) with check (public.eh_admin());

-- ------------------------------------------------------------
-- Economia — prestador vê a sua; escrita passa por funções (security definer).
-- ------------------------------------------------------------
create policy "compras_prestador" on public.compras_creditos for select
  using (public.eh_dono_prestador(prestador_id));
create policy "compras_prestador_cria" on public.compras_creditos for insert
  with check (public.eh_dono_prestador(prestador_id));
create policy "compras_admin" on public.compras_creditos for all
  using (public.eh_admin()) with check (public.eh_admin());

create policy "leads_prestador_ve" on public.leads_cobrados for select
  using (public.eh_dono_prestador(prestador_id));
create policy "leads_admin" on public.leads_cobrados for all
  using (public.eh_admin()) with check (public.eh_admin());
-- Obs: inserção em leads_cobrados só acontece dentro de liberar_contato() (security definer),
-- por isso não há policy de insert pública aqui.

-- ------------------------------------------------------------
-- Avaliações — leitura pública; autor cria; edição só em 24h.
-- ------------------------------------------------------------
create policy "avaliacoes_leitura_publica" on public.avaliacoes for select using (true);
create policy "avaliacoes_autor_cria" on public.avaliacoes for insert
  with check (autor_id = auth.uid());
create policy "avaliacoes_autor_edita_24h" on public.avaliacoes for update
  using (autor_id = auth.uid() and criado_em > now() - interval '24 hours')
  with check (autor_id = auth.uid());
create policy "avaliacoes_admin" on public.avaliacoes for all
  using (public.eh_admin()) with check (public.eh_admin());

-- ------------------------------------------------------------
-- Denúncias — denunciante cria/vê a sua; admin gerencia.
-- ------------------------------------------------------------
create policy "denuncias_cria" on public.denuncias for insert
  with check (denunciante_id = auth.uid());
create policy "denuncias_ve_propria" on public.denuncias for select
  using (denunciante_id = auth.uid() or public.eh_admin());
create policy "denuncias_admin" on public.denuncias for update
  using (public.eh_admin()) with check (public.eh_admin());

-- ------------------------------------------------------------
-- Mensagens — só as partes do pedido leem/escrevem.
-- ------------------------------------------------------------
create policy "mensagens_partes_leem" on public.mensagens for select
  using (
    exists (
      select 1 from public.pedidos ped
      where ped.id = pedido_id
        and (ped.cliente_id = auth.uid()
             or (ped.prestador_aceito_id is not null and public.eh_dono_prestador(ped.prestador_aceito_id)))
    )
  );
create policy "mensagens_remetente_cria" on public.mensagens for insert
  with check (remetente_id = auth.uid());
create policy "mensagens_admin" on public.mensagens for select
  using (public.eh_admin());

-- ------------------------------------------------------------
-- Admins — só admin lê a lista.
-- ------------------------------------------------------------
create policy "admins_admin_le" on public.admins for select using (public.eh_admin());
