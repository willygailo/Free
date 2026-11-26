-- Run this once in your Supabase SQL Editor to enable the Shared Public Confession Wall
-- so every visitor across different devices sees other users' confessions.

create extension if not exists "pgcrypto";

create table if not exists public.confessions (
  id uuid primary key default gen_random_uuid(),
  content text not null check (char_length(content) between 2 and 1000),
  emotion text not null default 'neutral',
  category text not null default 'Confession',
  ai_emoji text,
  ai_advice text,
  ai_steps jsonb not null default '[]'::jsonb,
  reactions jsonb not null default '{"❤️":0,"😂":0,"😢":0,"😮":0}'::jsonb,
  replies jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_public_confessions_created_at
  on public.confessions (created_at desc);

-- Open Row Level Security policies (no login / no admin gate)
alter table public.confessions enable row level security;

drop policy if exists "Anyone can read confessions" on public.confessions;
create policy "Anyone can read confessions"
  on public.confessions
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Anyone can insert confessions" on public.confessions;
create policy "Anyone can insert confessions"
  on public.confessions
  for insert
  to anon, authenticated
  with check (char_length(trim(content)) >= 2);

drop policy if exists "Anyone can update reactions or replies" on public.confessions;
create policy "Anyone can update reactions or replies"
  on public.confessions
  for update
  to anon, authenticated
  using (true)
  with check (true);
