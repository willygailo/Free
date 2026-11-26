-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Confessions table
create table if not exists public.confessions (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  category text not null default 'Confession',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'flagged')),
  ai_emoji text,
  ai_comment text,
  moderation_reason text,
  report_count int not null default 0,
  ip_hash text,
  created_at timestamptz not null default now()
);

-- Reactions table
create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  confession_id uuid not null references public.confessions(id) on delete cascade,
  emoji text not null,
  count int not null default 0 check (count >= 0),
  unique (confession_id, emoji)
);

-- Migrations for existing installations
alter table public.confessions
  add column if not exists category text not null default 'Confession';

alter table public.confessions
  add column if not exists report_count int not null default 0;

-- Helpful indexes
create index if not exists idx_confessions_status_created_at
  on public.confessions (status, created_at desc);

create index if not exists idx_confessions_status_category_created_at
  on public.confessions (status, category, created_at desc);

create index if not exists idx_reactions_confession_id
  on public.reactions (confession_id);

-- Row Level Security (RLS)
alter table public.confessions enable row level security;
alter table public.reactions enable row level security;

-- Public read access for approved confessions only
drop policy if exists "Public can read approved confessions" on public.confessions;
create policy "Public can read approved confessions"
  on public.confessions
  for select
  to anon, authenticated
  using (status = 'approved');

-- Public read access for reactions belonging to approved confessions
drop policy if exists "Public can read reactions for approved confessions" on public.reactions;
create policy "Public can read reactions for approved confessions"
  on public.reactions
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.confessions c
      where c.id = reactions.confession_id
        and c.status = 'approved'
    )
  );

-- Realtime publication
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'confessions'
  ) then
    alter publication supabase_realtime add table public.confessions;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'reactions'
  ) then
    alter publication supabase_realtime add table public.reactions;
  end if;
end
$$;

-- Atomic reaction adjustment RPC (+1 / -1 clamped at 0)
create or replace function public.adjust_reaction(
  p_confession_id uuid,
  p_emoji text,
  p_delta int default 1
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count int;
  safe_delta int := case when p_delta < 0 then -1 else 1 end;
begin
  insert into public.reactions (confession_id, emoji, count)
  values (p_confession_id, p_emoji, greatest(0, safe_delta))
  on conflict (confession_id, emoji)
  do update set count = greatest(0, public.reactions.count + safe_delta)
  returning count into new_count;

  return new_count;
end;
$$;

-- Backwards-compatible wrapper
create or replace function public.increment_reaction(
  p_confession_id uuid,
  p_emoji text
)
returns int
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.adjust_reaction(p_confession_id, p_emoji, 1);
end;
$$;

grant execute on function public.adjust_reaction(uuid, text, int) to anon, authenticated, service_role;
grant execute on function public.increment_reaction(uuid, text) to anon, authenticated, service_role;
