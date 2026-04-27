-- Run this in Supabase SQL editor.
create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  avatar_url text,
  plan text not null default 'free' check (plan in ('free', 'pro', 'pro_plus')),
  credits_left integer not null default 3,
  razorpay_customer_id text,
  subscription_id text,
  subscription_end timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null default 'Untitled Resume',
  content jsonb not null default '{}'::jsonb,
  template_id text not null default 'modern',
  ats_score integer check (ats_score between 0 and 100),
  last_jd text,
  is_primary boolean not null default false,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  resume_id uuid references public.resumes(id) on delete set null,
  type text not null check (type in ('jd_match', 'cover_letter', 'linkedin', 'ats_score')),
  jd_text text,
  input_snapshot jsonb,
  output text,
  tokens_used integer,
  created_at timestamptz not null default now()
);

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  plan_type text not null check (plan_type in ('30_day', '60_day')),
  target_role text,
  start_date date,
  target_date date,
  config jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists resumes_primary_per_user_idx
  on public.resumes(user_id, is_primary)
  where is_primary = true;

create index if not exists resumes_user_updated_idx
  on public.resumes(user_id, updated_at desc);

create index if not exists generations_user_created_idx
  on public.generations(user_id, created_at desc);

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_resumes_updated_at on public.resumes;
create trigger set_resumes_updated_at
before update on public.resumes
for each row execute function public.update_updated_at_column();

alter table public.users enable row level security;
alter table public.resumes enable row level security;
alter table public.generations enable row level security;
alter table public.plans enable row level security;

drop policy if exists "Users can read own profile" on public.users;
create policy "Users can read own profile"
on public.users
for select
using (auth.uid() = id);

drop policy if exists "Users can upsert own profile" on public.users;
create policy "Users can upsert own profile"
on public.users
for insert
with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile"
on public.users
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can manage own resumes" on public.resumes;
create policy "Users can manage own resumes"
on public.resumes
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can manage own generations" on public.generations;
create policy "Users can manage own generations"
on public.generations
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can manage own plans" on public.plans;
create policy "Users can manage own plans"
on public.plans
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
