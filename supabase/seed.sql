-- ============================================================
-- Chama Aí — Milestone 0 (Fundação)
-- seed.sql — dados iniciais de Breves/PA.
-- Rode DEPOIS das migrations. Idempotente (on conflict do nothing).
-- ------------------------------------------------------------
-- ⚠️ As coordenadas dos bairros são aproximadas (centro de Breves ~
-- -1.6820, -50.4800). Ajuste com pontos reais quando puder — isso
-- melhora a precisão do match por raio. Bairro sem lat/lng ainda
-- funciona no modo 'bairros'; só não entra bem no cálculo de raio.
-- ============================================================

-- ---------- BAIRROS DE BREVES ----------
insert into public.bairros (cidade, uf, nome, lat_centro, lng_centro) values
  ('Breves','PA','Centro',            -1.6820, -50.4800),
  ('Breves','PA','Aeroporto',         -1.6900, -50.4720),
  ('Breves','PA','Castanheira',       -1.6870, -50.4870),
  ('Breves','PA','Padre Ângelo',      -1.6780, -50.4760),
  ('Breves','PA','Cidade Nova',       -1.6950, -50.4810),
  ('Breves','PA','São Miguel',        -1.6840, -50.4900),
  ('Breves','PA','Parque dos Búfalos',-1.6990, -50.4780),
  ('Breves','PA','Cristo Rei',        -1.6760, -50.4830),
  ('Breves','PA','Jardim Bela Vista', -1.6930, -50.4880),
  ('Breves','PA','Aldeia',            -1.6800, -50.4740),
  ('Breves','PA','Vila Amélia',       -1.6870, -50.4700),
  ('Breves','PA','Antônio Rodrigues', -1.6890, -50.4840)
on conflict (cidade, uf, nome) do nothing;

-- ---------- CATEGORIAS (MVP: 5) ----------
insert into public.categorias (nome, slug, icone, ordem) values
  ('Diarista e limpeza',      'diarista',       'sparkles',   1),
  ('Reforma e reparos',       'reforma',        'hammer',     2),
  ('Capina e jardinagem',     'capina',         'trees',      3),
  ('Mototáxi e frete',        'frete',          'bike',       4),
  ('Beleza em casa',          'beleza',         'scissors',   5)
on conflict (slug) do nothing;

-- ---------- SUBCATEGORIAS (com preco_lead em créditos) ----------
-- Diarista e limpeza
insert into public.subcategorias (categoria_id, nome, slug, preco_lead, ordem)
select id, v.nome, v.slug, v.preco, v.ordem from public.categorias c,
  (values
    ('Faxina de casa',        'faxina-casa',        5, 1),
    ('Passar roupa',          'passar-roupa',       4, 2),
    ('Cozinheira para evento','cozinheira-evento',  5, 3),
    ('Babá / cuidados',       'baba',               5, 4)
  ) as v(nome, slug, preco, ordem)
where c.slug = 'diarista'
on conflict (slug) do nothing;

-- Reforma e reparos
insert into public.subcategorias (categoria_id, nome, slug, preco_lead, ordem)
select id, v.nome, v.slug, v.preco, v.ordem from public.categorias c,
  (values
    ('Pedreiro',    'pedreiro',    10, 1),
    ('Eletricista', 'eletricista', 10, 2),
    ('Encanador',   'encanador',    8, 3),
    ('Pintor',      'pintor',       8, 4),
    ('Marceneiro',  'marceneiro',   8, 5)
  ) as v(nome, slug, preco, ordem)
where c.slug = 'reforma'
on conflict (slug) do nothing;

-- Capina e jardinagem
insert into public.subcategorias (categoria_id, nome, slug, preco_lead, ordem)
select id, v.nome, v.slug, v.preco, v.ordem from public.categorias c,
  (values
    ('Capina de quintal',  'capina-quintal',  6, 1),
    ('Poda de árvore',     'poda-arvore',     6, 2),
    ('Jardinagem',         'jardinagem',      6, 3),
    ('Limpeza de terreno', 'limpeza-terreno', 6, 4)
  ) as v(nome, slug, preco, ordem)
where c.slug = 'capina'
on conflict (slug) do nothing;

-- Mototáxi e frete
insert into public.subcategorias (categoria_id, nome, slug, preco_lead, ordem)
select id, v.nome, v.slug, v.preco, v.ordem from public.categorias c,
  (values
    ('Mototáxi',            'mototaxi',       2, 1),
    ('Frete pequeno',       'frete-pequeno',  3, 2),
    ('Mudança',             'mudanca',        4, 3),
    ('Entrega de encomenda','entrega',        2, 4)
  ) as v(nome, slug, preco, ordem)
where c.slug = 'frete'
on conflict (slug) do nothing;

-- Beleza em casa
insert into public.subcategorias (categoria_id, nome, slug, preco_lead, ordem)
select id, v.nome, v.slug, v.preco, v.ordem from public.categorias c,
  (values
    ('Cabeleireiro(a)',  'cabeleireiro',  4, 1),
    ('Manicure / pedicure','manicure',    4, 2),
    ('Barbeiro',         'barbeiro',      4, 3),
    ('Depilação',        'depilacao',     4, 4),
    ('Maquiagem',        'maquiagem',     4, 5)
  ) as v(nome, slug, preco, ordem)
where c.slug = 'beleza'
on conflict (slug) do nothing;
