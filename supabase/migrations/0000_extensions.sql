-- ============================================================
-- Chama Aí — Milestone 0 (Fundação)
-- 0000_extensions.sql
-- Extensões e utilitários base.
-- ------------------------------------------------------------
-- Optamos por NÃO depender de PostGIS. Para o cálculo de raio de
-- atendimento usamos uma função haversine em SQL puro. É portátil,
-- suficientemente precisa para distâncias urbanas/ribeirinhas e não
-- adiciona peso operacional ao projeto. Se um dia a base crescer e
-- precisar de consultas geoespaciais pesadas, migra-se para PostGIS
-- (que a Supabase já oferece) sem mexer no resto do schema.
-- ============================================================

create extension if not exists "pgcrypto";      -- gen_random_uuid()
create extension if not exists "pg_trgm";        -- busca por nome (fuzzy) em prestadores/serviços

-- Distância em quilômetros entre dois pontos (lat/lng) — fórmula de Haversine.
create or replace function public.distancia_km(
  lat1 double precision,
  lng1 double precision,
  lat2 double precision,
  lng2 double precision
)
returns double precision
language sql
immutable
parallel safe
as $$
  select 6371 * 2 * asin(
    sqrt(
      power(sin(radians(lat2 - lat1) / 2), 2) +
      cos(radians(lat1)) * cos(radians(lat2)) *
      power(sin(radians(lng2 - lng1) / 2), 2)
    )
  );
$$;

comment on function public.distancia_km is
  'Distância em km entre dois pontos geográficos (Haversine). Usada no match por raio de atendimento.';
