-- Super3 MVP schema (Stories-first news aggregation)
-- Apply this in Supabase SQL Editor.

create extension if not exists pgcrypto;
-- For semantic merge (embeddings / vector similarity)
create extension if not exists vector;

-- Sources (sites)
create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  homepage_url text not null,
  rss_url text,
  lang text not null check (lang in ('en','zh')),
  weight numeric not null default 2,
  enabled boolean not null default true,
  last_fetch_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists sources_homepage_url_uq on public.sources (homepage_url);

-- Articles (raw items)
create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources(id) on delete cascade,
  url text not null,
  canonical_url text not null,
  title text not null,
  published_at timestamptz,
  lang text not null check (lang in ('en','zh')),
  excerpt text,
  created_at timestamptz not null default now()
);

create unique index if not exists articles_canonical_url_uq on public.articles (canonical_url);
create index if not exists articles_lang_published_at_idx on public.articles (lang, published_at desc);

-- Stories (event-level aggregation)
create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  -- 'multi' means this story has sources in multiple languages (semantic merge).
  lang text not null check (lang in ('en','zh','multi')),
  title text not null,
  first_seen_at timestamptz not null,
  last_seen_at timestamptz not null,
  hot_score double precision not null default 0,
  -- Optional: semantic embedding for the story title (vector dim must match your embedding model)
  embedding vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- If you applied an earlier schema before semantic merge, the table already exists and
-- `create table if not exists` will NOT add new columns/constraints. The following
-- ALTERs keep the schema idempotent.

-- Add embedding column for existing installs.
alter table public.stories
  add column if not exists embedding vector(1536);

-- Ensure lang constraint allows 'multi' for existing installs.
do $$
declare
  con_to_drop text;
begin
  -- Find a CHECK constraint on stories.lang that does NOT include 'multi' and drop it.
  select c.conname into con_to_drop
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'stories'
    and c.contype = 'c'
    and pg_get_constraintdef(c.oid) ilike '%lang%'
    and pg_get_constraintdef(c.oid) ilike '%in%'
    and pg_get_constraintdef(c.oid) not ilike '%''multi''%';

  if con_to_drop is not null then
    execute 'alter table public.stories drop constraint ' || quote_ident(con_to_drop);
  end if;

  -- Add the expected constraint if missing.
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'stories'
      and c.conname = 'stories_lang_check'
  ) then
    execute 'alter table public.stories add constraint stories_lang_check check (lang in (''en'',''zh'',''multi''))';
  end if;
end $$;

create index if not exists stories_lang_last_seen_idx on public.stories (lang, last_seen_at desc);
create index if not exists stories_lang_hot_score_idx on public.stories (lang, hot_score desc);
-- Vector index (optional but recommended if you plan to query via SQL similarity search)
create index if not exists stories_embedding_hnsw_idx
  on public.stories
  using hnsw (embedding vector_cosine_ops);

-- Join: which articles belong to which story
create table if not exists public.story_articles (
  story_id uuid not null references public.stories(id) on delete cascade,
  article_id uuid not null references public.articles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (story_id, article_id)
);

create index if not exists story_articles_story_id_idx on public.story_articles (story_id);

-- Convenience view for story source coverage (all time)
create or replace view public.story_source_counts as
select
  sa.story_id,
  count(distinct a.source_id)::int as source_count_all_time
from public.story_articles sa
join public.articles a on a.id = sa.article_id
group by sa.story_id;

-- Hot metrics window (last 24 hours) used for "Hot" ranking (MVP)
create or replace view public.story_hot_metrics_24h as
select
  t.story_id,
  count(*)::int as source_count_24h,
  coalesce(sum(t.weight), 0)::double precision as weight_sum_24h
from (
  select distinct
    sa.story_id,
    a.source_id,
    s.weight
  from public.story_articles sa
  join public.articles a on a.id = sa.article_id
  join public.sources s on s.id = a.source_id
  where a.published_at is not null
    and a.published_at >= now() - interval '24 hours'
) t
group by t.story_id;

-- Feed view for "Hot" (computed score, 24h window, with recency decay)
create or replace view public.stories_feed_hot_24h as
select
  s.id,
  s.lang,
  s.title,
  s.first_seen_at,
  s.last_seen_at,
  coalesce(m.source_count_24h, 0)::int as source_count_24h,
  coalesce(m.weight_sum_24h, 0)::double precision as weight_sum_24h,
  (
    (ln(greatest(coalesce(m.source_count_24h, 0), 1)) + 1.0)
    * (coalesce(m.weight_sum_24h, 0) + 1.0)
    * exp(-extract(epoch from (now() - s.last_seen_at)) / 86400.0)
  )::double precision as hot_score_calc
from public.stories s
left join public.story_hot_metrics_24h m on m.story_id = s.id;


