-- ============================================================
-- Chama Aí — 0007_fotos_pedidos.sql
--
-- Foto no pedido. "Meu quintal tá tomado de mato" com foto vale muito
-- mais que sem: o profissional dá um preço melhor e erra menos.
--
-- Criamos um bucket público de leitura (as fotos aparecem na vitrine
-- para quem nem entrou ainda), mas com escrita restrita: cada pessoa
-- só grava dentro da própria pasta, e só quem enviou pode apagar.
--
-- Idempotente: pode rodar mais de uma vez sem quebrar.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Bucket das fotos de pedido.
--    public = true significa que a URL da foto é legível por quem
--    tiver o link (é o que permite mostrar na vitrine sem login).
--    Não confunda com escrita: gravar continua exigindo permissão.
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pedidos',
  'pedidos',
  true,
  5242880,                                   -- 5 MB por foto
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ------------------------------------------------------------
-- 2) Políticas de acesso ao bucket.
--    Convenção de caminho: pedidos/<uid-de-quem-enviou>/<arquivo>
--    Assim dá para amarrar a permissão à primeira pasta do caminho.
-- ------------------------------------------------------------

-- Leitura pública (a vitrine mostra a foto do pedido).
drop policy if exists "fotos_pedido_leitura_publica" on storage.objects;
create policy "fotos_pedido_leitura_publica" on storage.objects
  for select
  using (bucket_id = 'pedidos');

-- Envio: só quem está logado, e só na própria pasta.
drop policy if exists "fotos_pedido_envio_proprio" on storage.objects;
create policy "fotos_pedido_envio_proprio" on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'pedidos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Apagar: só quem enviou.
drop policy if exists "fotos_pedido_apaga_proprio" on storage.objects;
create policy "fotos_pedido_apaga_proprio" on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'pedidos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ------------------------------------------------------------
-- 3) A vitrine precisa devolver as fotos, não só dizer que existem.
--    Antes o feed expunha apenas `tem_foto` (booleano). Para o
--    profissional avaliar o serviço, ele precisa VER a imagem.
-- ------------------------------------------------------------
drop view if exists public.feed_pedidos;

create view public.feed_pedidos
with (security_invoker = false) as
  select
    p.id,
    p.modo,
    p.status,
    p.criado_em,
    p.prazo_desejado,
    coalesce(p.transcricao, p.descricao)        as descricao,
    (array_length(p.foto_urls, 1) is not null)  as tem_foto,
    coalesce(p.foto_urls, '{}')                 as foto_urls,
    s.id                                        as subcategoria_id,
    s.nome                                      as subcategoria,
    c.nome                                      as categoria,
    c.slug                                      as categoria_slug,
    c.icone                                     as categoria_icone,
    b.id                                        as bairro_id,
    b.nome                                      as bairro,
    b.cidade                                    as cidade,
    split_part(u.nome, ' ', 1)                  as cliente_nome,
    u.foto_url                                  as cliente_foto
  from public.pedidos p
  join public.subcategorias s on s.id = p.subcategoria_id
  join public.categorias   c on c.id = s.categoria_id
  left join public.bairros b on b.id = p.bairro_id
  join public.usuarios     u on u.id = p.cliente_id
  where p.status in ('aberto', 'com_orcamentos')
    and u.banido = false
  order by p.criado_em desc;

grant select on public.feed_pedidos to anon, authenticated;
