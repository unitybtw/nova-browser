-- ==============================================================================
-- NOVA BROWSER CLOUD SYNC & ZERO-KNOWLEDGE E2EE SUPABASE SCHEMA
-- Run this SQL in your Supabase project's SQL Editor (https://supabase.com/dashboard)
-- ==============================================================================

-- 1. Create the Sync Chains Table (For 1-Click Pairing Codes)
create table if not exists public.nova_sync_chains (
  sync_code text not null primary key,
  payload jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS & Policies for Sync Chains
alter table public.nova_sync_chains enable row level security;

drop policy if exists "Allow public read of sync chains" on public.nova_sync_chains;
create policy "Allow public read of sync chains"
  on public.nova_sync_chains for select
  using (true);

drop policy if exists "Allow public insert of sync chains" on public.nova_sync_chains;
create policy "Allow public insert of sync chains"
  on public.nova_sync_chains for insert
  with check (true);

drop policy if exists "Allow public update of sync chains" on public.nova_sync_chains;
create policy "Allow public update of sync chains"
  on public.nova_sync_chains for update
  using (true);

-- 2. Create User Vaults Table (Optional legacy/account support)
create table if not exists public.nova_sync_vaults (
  user_id text not null primary key,
  timestamp bigint not null default extract(epoch from now()) * 1000,
  bookmarks jsonb default '[]'::jsonb,
  folders jsonb default '[]'::jsonb,
  history jsonb default '[]'::jsonb,
  encrypted_passwords text,
  passwords_salt text,
  passwords_iv text,
  settings jsonb default '{}'::jsonb,
  workspaces jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.nova_sync_vaults enable row level security;

drop policy if exists "Allow public sync vaults read" on public.nova_sync_vaults;
create policy "Allow public sync vaults read"
  on public.nova_sync_vaults for select
  using (true);

drop policy if exists "Allow public sync vaults write" on public.nova_sync_vaults;
create policy "Allow public sync vaults write"
  on public.nova_sync_vaults for all
  using (true);

-- 3. Enable Realtime updates for instant live sync across computers
alter publication supabase_realtime add table public.nova_sync_chains;
