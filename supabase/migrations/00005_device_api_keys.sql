-- 00005_device_api_keys.sql
-- Device authentication for Edge Functions
-- Devices use API keys (not user JWTs) to authenticate to ingest-audio and consult endpoints.
-- Edge Functions validate the key and resolve it to a device_id.

-- ============================================================================
-- device_api_keys — one key per device, created during provisioning
-- ============================================================================
create table if not exists public.device_api_keys (
  id         bigint generated always as identity primary key,
  device_id  uuid not null references public.devices (id) on delete cascade,
  key_hash   text not null,              -- SHA-256 hash of the API key (never store plaintext)
  label      text default 'default',     -- human-readable label
  is_active  boolean not null default true,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),

  constraint uq_device_api_keys_hash unique (key_hash)
);

comment on table public.device_api_keys is
  'API keys for device-to-cloud auth. Keys are hashed; plaintext shown once at provisioning.';

-- Index for key lookup (Edge Function auth hot path)
create index if not exists idx_device_api_keys_hash
  on public.device_api_keys (key_hash)
  where is_active = true;

-- ============================================================================
-- RLS — only device owners can manage their keys
-- ============================================================================
alter table public.device_api_keys enable row level security;

create policy "device_api_keys_select_own"
  on public.device_api_keys for select
  using (device_id in (select id from public.devices where user_id = (select auth.uid())));

create policy "device_api_keys_insert_own"
  on public.device_api_keys for insert
  with check (device_id in (select id from public.devices where user_id = (select auth.uid())));

create policy "device_api_keys_delete_own"
  on public.device_api_keys for delete
  using (device_id in (select id from public.devices where user_id = (select auth.uid())));

-- No UPDATE policy — keys are immutable. Revoke by deleting and creating a new one.

-- ============================================================================
-- Grants
-- ============================================================================
revoke all on public.device_api_keys from anon;
grant select, insert, delete on public.device_api_keys to authenticated;
