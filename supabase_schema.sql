-- Nova Browser secure sync schema — FULL RESET MIGRATION.
-- This script is idempotent and safe to re-run: it drops the sync tables
-- (nova_sync_chains, nova_pairing_invitations, nova_sync_vaults) and recreates
-- them with the current v2 E2EE shape, then reapplies RLS policies, the
-- pairing-invitation consumption RPC, grants, and realtime publication.
--
-- WARNING: dropping these tables destroys any previously synced vault data.
-- Run against a project where that is acceptable (fresh setup or schema reset).

drop table if exists public.nova_sync_chains cascade;
drop table if exists public.nova_pairing_invitations cascade;
drop table if exists public.nova_sync_vaults cascade;

create table public.nova_sync_vaults (
  user_id uuid primary key references auth.users(id) on delete cascade,
  envelope jsonb not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint nova_sync_vaults_envelope_version check ((envelope->>'version') = '2')
);

alter table public.nova_sync_vaults enable row level security;

create policy "Users access only their encrypted vault"
  on public.nova_sync_vaults for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table public.nova_pairing_invitations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  consumed_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  constraint pairing_expiry check (expires_at > created_at)
);

alter table public.nova_pairing_invitations enable row level security;

create policy "Owners create their invitations"
  on public.nova_pairing_invitations for insert
  to authenticated
  with check (auth.uid() = owner_id and expires_at <= now() + interval '10 minutes');

create policy "Owners view their invitations"
  on public.nova_pairing_invitations for select
  to authenticated
  using (auth.uid() = owner_id);

create policy "Users can delete own pairing invitations"
  on public.nova_pairing_invitations for delete
  to authenticated
  using (auth.uid() = owner_id);

create or replace function public.consume_nova_pairing_invitation(p_token_hash text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation_owner uuid;
begin
  update public.nova_pairing_invitations
     set consumed_at = now(), consumed_by = auth.uid()
   where token_hash = p_token_hash
     and consumed_at is null
     and expires_at > now()
  returning owner_id into invitation_owner;
  if invitation_owner is null then
    raise exception 'Pairing invitation is invalid, expired, or already used';
  end if;
  return invitation_owner;
end;
$$;

revoke all on function public.consume_nova_pairing_invitation(text) from public;
grant execute on function public.consume_nova_pairing_invitation(text) to authenticated;

-- Guarded so re-running this migration does not error when the table is
-- already a member of the publication.
do $$
begin
  alter publication supabase_realtime add table public.nova_sync_vaults;
exception
  when duplicate_object then null;
end $$;
