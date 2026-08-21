-- ==============================================================================
-- NOVA BROWSER CLOUD SYNC & ZERO-KNOWLEDGE E2EE SUPABASE SCHEMA
-- Run this SQL in your Supabase project's SQL Editor (https://supabase.com/dashboard)
-- ==============================================================================

-- 1. Create the sync vault table
create table if not exists public.nova_sync_vaults (
  user_id uuid references auth.users(id) on delete cascade not null primary key,
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

-- 2. Enable Row Level Security (RLS)
alter table public.nova_sync_vaults enable row level security;

-- 3. Security Policies: Ensure users can ONLY access and modify their own data
drop policy if exists "Users can view own sync vault" on public.nova_sync_vaults;
create policy "Users can view own sync vault"
  on public.nova_sync_vaults for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own sync vault" on public.nova_sync_vaults;
create policy "Users can insert own sync vault"
  on public.nova_sync_vaults for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own sync vault" on public.nova_sync_vaults;
create policy "Users can update own sync vault"
  on public.nova_sync_vaults for update
  using (auth.uid() = user_id);

-- 4. Enable Realtime updates for instant multi-device sync
alter publication supabase_realtime add table public.nova_sync_vaults;
