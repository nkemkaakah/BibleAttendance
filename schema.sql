-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run

create table if not exists codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  day_key text not null unique,
  starts_at timestamptz not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists checkins (
  id uuid primary key default gen_random_uuid(),
  code_id uuid not null references codes(id) on delete cascade,
  name text not null,
  name_key text not null,
  created_at timestamptz not null default now(),
  unique (code_id, name_key)
);

create index if not exists checkins_code_idx on checkins (code_id);

create table if not exists settings (
  id int primary key default 1,
  admin_email text,
  constraint settings_singleton check (id = 1)
);
insert into settings (id) values (1) on conflict (id) do nothing;

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  email_key text not null unique,
  created_at timestamptz not null default now()
);

-- Only the server touches these, using the service role key.
alter table codes enable row level security;
alter table checkins enable row level security;
alter table settings enable row level security;
alter table members enable row level security;
