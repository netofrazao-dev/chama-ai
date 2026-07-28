-- ============================================================
-- Chama Aí — seed_demo.sql
-- DADOS DE DEMONSTRAÇÃO (fictícios). Servem só pra vitrine não abrir
-- vazia enquanto você cadastra prestadores reais em Breves.
--
-- COMO USAR: rode DEPOIS das migrations + seed.sql.
-- COMO APAGAR: rode a seção "LIMPEZA" no topo (já roda sozinha antes
-- de reinserir, então dá pra rodar este arquivo quantas vezes quiser).
--
-- Truque: inserimos em auth.users com raw_user_meta_data preenchido;
-- o gatilho handle_novo_usuario() cria a linha em public.usuarios
-- automaticamente. Assim não duplicamos lógica.
-- ============================================================

-- ---------- LIMPEZA (idempotência) ----------
-- Apaga qualquer demo anterior (ids fixos abaixo). Cascata limpa o resto.
delete from auth.users where id in (
  '0d000000-0000-0000-0000-0000000000a1',
  '0d000000-0000-0000-0000-0000000000a2',
  '0d000000-0000-0000-0000-0000000000a3',
  '0d000000-0000-0000-0000-0000000000a4',
  '0d000000-0000-0000-0000-0000000000c1',
  '0d000000-0000-0000-0000-0000000000c2',
  '0d000000-0000-0000-0000-0000000000c3'
);

-- ---------- USUÁRIOS DEMO (via auth.users -> gatilho cria usuarios) ----------
insert into auth.users (id, aud, role, phone, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  -- prestadores
  ('0d000000-0000-0000-0000-0000000000a1','authenticated','authenticated','+5591980000001','{}',
    jsonb_build_object('nome','Dona Raimunda Souza','telefone','+5591980000001'), now(), now()),
  ('0d000000-0000-0000-0000-0000000000a2','authenticated','authenticated','+5591980000002','{}',
    jsonb_build_object('nome','Seu Chico Pedreiro','telefone','+5591980000002'), now(), now()),
  ('0d000000-0000-0000-0000-0000000000a3','authenticated','authenticated','+5591980000003','{}',
    jsonb_build_object('nome','Marcos Mototáxi','telefone','+5591980000003'), now(), now()),
  ('0d000000-0000-0000-0000-0000000000a4','authenticated','authenticated','+5591980000004','{}',
    jsonb_build_object('nome','Cléo Beleza','telefone','+5591980000004'), now(), now()),
  -- clientes (autores dos pedidos)
  ('0d000000-0000-0000-0000-0000000000c1','authenticated','authenticated','+5591970000001','{}',
    jsonb_build_object('nome','Ana Paula Lima','telefone','+5591970000001'), now(), now()),
  ('0d000000-0000-0000-0000-0000000000c2','authenticated','authenticated','+5591970000002','{}',
    jsonb_build_object('nome','José Ribeiro','telefone','+5591970000002'), now(), now()),
  ('0d000000-0000-0000-0000-0000000000c3','authenticated','authenticated','+5591970000003','{}',
    jsonb_build_object('nome','Fabiana Costa','telefone','+5591970000003'), now(), now());

-- marca os prestadores como do tipo certo
update public.usuarios set tipo = 'prestador'
 where id in ('0d000000-0000-0000-0000-0000000000a1','0d000000-0000-0000-0000-0000000000a2',
              '0d000000-0000-0000-0000-0000000000a3','0d000000-0000-0000-0000-0000000000a4');

-- ---------- FICHAS DE PRESTADOR ----------
-- Dona Raimunda — diarista, cobertura por BAIRROS, tem loja
insert into public.prestadores (id, usuario_id, bio, nivel, modo_cobertura, tem_loja, aceita_orcamento,
       esta_online, nota_media, total_avaliacoes, total_concluidos)
values ('a1e50000-0000-0000-0000-0000000000a1','0d000000-0000-0000-0000-0000000000a1',
       'Faço faxina com capricho há mais de 15 anos aqui em Breves.', 'comprovado','bairros',
       true, true, true, 4.90, 42, 58);

-- Seu Chico — pedreiro/eletricista, cobertura por RAIO, orçamento
insert into public.prestadores (id, usuario_id, bio, nivel, modo_cobertura, raio_km, base_lat, base_lng,
       tem_loja, aceita_orcamento, esta_online, nota_media, total_avaliacoes, total_concluidos)
values ('a1e50000-0000-0000-0000-0000000000a2','0d000000-0000-0000-0000-0000000000a2',
       'Pedreiro e eletricista. Reforma, muro, laje, instalação elétrica.', 'verificado','raio',
       6.0, -1.6820, -50.4800, false, true, false, 4.70, 19, 25);

-- Marcos — mototáxi/frete, pedido rápido, cobertura por RAIO
insert into public.prestadores (id, usuario_id, bio, nivel, modo_cobertura, raio_km, base_lat, base_lng,
       aceita_pedido_rapido, aceita_orcamento, esta_online, nota_media, total_avaliacoes, total_concluidos)
values ('a1e50000-0000-0000-0000-0000000000a3','0d000000-0000-0000-0000-0000000000a3',
       'Mototáxi e entrega rápida. Chamou, tô indo.', 'verificado','raio',
       10.0, -1.6900, -50.4720, true, true, true, 4.80, 88, 210);

-- Cléo — beleza em casa, loja, cobertura por BAIRROS
insert into public.prestadores (id, usuario_id, bio, nivel, modo_cobertura, tem_loja, aceita_orcamento,
       esta_online, nota_media, total_avaliacoes, total_concluidos)
values ('a1e50000-0000-0000-0000-0000000000a4','0d000000-0000-0000-0000-0000000000a4',
       'Cabelo, unha e maquiagem no conforto da sua casa.', 'comprovado','bairros',
       true, true, false, 5.00, 31, 40);

-- ---------- SUBCATEGORIAS DOS PRESTADORES ----------
insert into public.prestador_subcategorias (prestador_id, subcategoria_id, anos_experiencia)
select 'a1e50000-0000-0000-0000-0000000000a1', id, 15 from public.subcategorias where slug in ('faxina-casa','passar-roupa');
insert into public.prestador_subcategorias (prestador_id, subcategoria_id, anos_experiencia)
select 'a1e50000-0000-0000-0000-0000000000a2', id, 20 from public.subcategorias where slug in ('pedreiro','eletricista');
insert into public.prestador_subcategorias (prestador_id, subcategoria_id, anos_experiencia)
select 'a1e50000-0000-0000-0000-0000000000a3', id, 8  from public.subcategorias where slug in ('mototaxi','entrega','frete-pequeno');
insert into public.prestador_subcategorias (prestador_id, subcategoria_id, anos_experiencia)
select 'a1e50000-0000-0000-0000-0000000000a4', id, 10 from public.subcategorias where slug in ('cabeleireiro','manicure','maquiagem');

-- ---------- BAIRROS ATENDIDOS (para quem usa cobertura = bairros) ----------
insert into public.prestador_bairros (prestador_id, bairro_id)
select 'a1e50000-0000-0000-0000-0000000000a1', id from public.bairros where nome in ('Centro','Aeroporto','Castanheira','Padre Ângelo');
insert into public.prestador_bairros (prestador_id, bairro_id)
select 'a1e50000-0000-0000-0000-0000000000a4', id from public.bairros where nome in ('Centro','Cidade Nova','São Miguel');

-- ---------- SERVIÇOS DE LOJA (preço fixo) ----------
insert into public.servicos_loja (prestador_id, subcategoria_id, titulo, descricao, unidade, preco_min, preco_max, duracao_min)
select 'a1e50000-0000-0000-0000-0000000000a1', id, 'Faxina casa até 2 quartos',
       'Limpeza completa: chão, banheiro, cozinha e quartos.', 'por_diaria', 120, 120, 240
from public.subcategorias where slug='faxina-casa';
insert into public.servicos_loja (prestador_id, subcategoria_id, titulo, descricao, unidade, preco_min, preco_max, duracao_min)
select 'a1e50000-0000-0000-0000-0000000000a4', id, 'Corte + escova', 'Corte feminino com escova, em casa.', 'por_servico', 45, 60, 60
from public.subcategorias where slug='cabeleireiro';
insert into public.servicos_loja (prestador_id, subcategoria_id, titulo, descricao, unidade, preco_min, preco_max, duracao_min)
select 'a1e50000-0000-0000-0000-0000000000a4', id, 'Pé e mão', 'Manicure e pedicure completa.', 'por_servico', 35, 35, 90
from public.subcategorias where slug='manicure';

-- ---------- PEDIDOS ABERTOS (quem está precisando) ----------
insert into public.pedidos (cliente_id, modo, subcategoria_id, descricao, bairro_id, prazo_desejado, status)
select '0d000000-0000-0000-0000-0000000000c1','orcamento', s.id,
       'Preciso de uma faxina pesada num apê de 2 quartos, tô me mudando.',
       b.id, 'essa semana', 'aberto'
from public.subcategorias s, public.bairros b where s.slug='faxina-casa' and b.nome='Centro';

insert into public.pedidos (cliente_id, modo, subcategoria_id, descricao, bairro_id, prazo_desejado, status)
select '0d000000-0000-0000-0000-0000000000c2','orcamento', s.id,
       'Quero levantar um muro de uns 8 metros no fundo do quintal.',
       b.id, 'esse mês', 'aberto'
from public.subcategorias s, public.bairros b where s.slug='pedreiro' and b.nome='Cidade Nova';

insert into public.pedidos (cliente_id, modo, subcategoria_id, descricao, bairro_id, prazo_desejado, status)
select '0d000000-0000-0000-0000-0000000000c3','rapido', s.id,
       'Preciso de um mototáxi pra levar uma encomenda pro Centro agora.',
       b.id, 'agora', 'aberto'
from public.subcategorias s, public.bairros b where s.slug='mototaxi' and b.nome='Aeroporto';

insert into public.pedidos (cliente_id, modo, subcategoria_id, descricao, bairro_id, prazo_desejado, status)
select '0d000000-0000-0000-0000-0000000000c1','orcamento', s.id,
       'Meu quintal tá tomado de mato, preciso capinar tudo.',
       b.id, 'essa semana', 'aberto'
from public.subcategorias s, public.bairros b where s.slug='capina-quintal' and b.nome='Castanheira';

insert into public.pedidos (cliente_id, modo, subcategoria_id, descricao, bairro_id, prazo_desejado, status)
select '0d000000-0000-0000-0000-0000000000c2','loja', s.id,
       'Queria fazer o cabelo pra uma festa no sábado.',
       b.id, 'sábado', 'aberto'
from public.subcategorias s, public.bairros b where s.slug='cabeleireiro' and b.nome='São Miguel';

-- pronto: 4 prestadores e 5 pedidos abertos pra vitrine.
