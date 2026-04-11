-- 00002_rls_policies.sql
-- Row Level Security for all tables
-- Policy: users can only access data through their own devices
-- NOTE: All auth.uid() calls wrapped in (SELECT ...) for single-evaluation performance

-- ============================================================================
-- Enable RLS on all tables
-- ============================================================================
alter table public.devices enable row level security;
alter table public.tier_1_signals enable row level security;
alter table public.tier_2_daily enable row level security;
alter table public.tier_3_weekly enable row level security;
alter table public.tier_4_themes enable row level security;
alter table public.consultations enable row level security;
alter table public.glyphs enable row level security;

-- ============================================================================
-- Index required by RLS subqueries (must exist before policies are hit)
-- ============================================================================
create index if not exists idx_devices_user
  on public.devices (user_id);

-- ============================================================================
-- devices — direct user_id ownership
-- ============================================================================
create policy "devices_select_own"
  on public.devices for select
  using (user_id = (select auth.uid()));

create policy "devices_insert_own"
  on public.devices for insert
  with check (user_id = (select auth.uid()));

create policy "devices_update_own"
  on public.devices for update
  using (user_id = (select auth.uid()));

create policy "devices_delete_own"
  on public.devices for delete
  using (user_id = (select auth.uid()));

-- ============================================================================
-- tier_1_signals — access through device ownership
-- ============================================================================
create policy "tier1_select_own"
  on public.tier_1_signals for select
  using (device_id in (select id from public.devices where user_id = (select auth.uid())));

create policy "tier1_insert_own"
  on public.tier_1_signals for insert
  with check (device_id in (select id from public.devices where user_id = (select auth.uid())));

create policy "tier1_update_own"
  on public.tier_1_signals for update
  using (device_id in (select id from public.devices where user_id = (select auth.uid())));

create policy "tier1_delete_own"
  on public.tier_1_signals for delete
  using (device_id in (select id from public.devices where user_id = (select auth.uid())));

-- ============================================================================
-- tier_2_daily — access through device ownership
-- ============================================================================
create policy "tier2_select_own"
  on public.tier_2_daily for select
  using (device_id in (select id from public.devices where user_id = (select auth.uid())));

create policy "tier2_insert_own"
  on public.tier_2_daily for insert
  with check (device_id in (select id from public.devices where user_id = (select auth.uid())));

create policy "tier2_update_own"
  on public.tier_2_daily for update
  using (device_id in (select id from public.devices where user_id = (select auth.uid())));

create policy "tier2_delete_own"
  on public.tier_2_daily for delete
  using (device_id in (select id from public.devices where user_id = (select auth.uid())));

-- ============================================================================
-- tier_3_weekly — access through device ownership
-- ============================================================================
create policy "tier3_select_own"
  on public.tier_3_weekly for select
  using (device_id in (select id from public.devices where user_id = (select auth.uid())));

create policy "tier3_insert_own"
  on public.tier_3_weekly for insert
  with check (device_id in (select id from public.devices where user_id = (select auth.uid())));

create policy "tier3_update_own"
  on public.tier_3_weekly for update
  using (device_id in (select id from public.devices where user_id = (select auth.uid())));

create policy "tier3_delete_own"
  on public.tier_3_weekly for delete
  using (device_id in (select id from public.devices where user_id = (select auth.uid())));

-- ============================================================================
-- tier_4_themes — access through device ownership
-- ============================================================================
create policy "tier4_select_own"
  on public.tier_4_themes for select
  using (device_id in (select id from public.devices where user_id = (select auth.uid())));

create policy "tier4_insert_own"
  on public.tier_4_themes for insert
  with check (device_id in (select id from public.devices where user_id = (select auth.uid())));

create policy "tier4_update_own"
  on public.tier_4_themes for update
  using (device_id in (select id from public.devices where user_id = (select auth.uid())));

create policy "tier4_delete_own"
  on public.tier_4_themes for delete
  using (device_id in (select id from public.devices where user_id = (select auth.uid())));

-- ============================================================================
-- consultations — access through device ownership
-- ============================================================================
create policy "consultations_select_own"
  on public.consultations for select
  using (device_id in (select id from public.devices where user_id = (select auth.uid())));

create policy "consultations_insert_own"
  on public.consultations for insert
  with check (device_id in (select id from public.devices where user_id = (select auth.uid())));

create policy "consultations_update_own"
  on public.consultations for update
  using (device_id in (select id from public.devices where user_id = (select auth.uid())));

create policy "consultations_delete_own"
  on public.consultations for delete
  using (device_id in (select id from public.devices where user_id = (select auth.uid())));

-- ============================================================================
-- glyphs — read-only for everyone (static shared data, no user-specific content)
-- No INSERT/UPDATE/DELETE policies = denied by default with RLS enabled
-- ============================================================================
create policy "glyphs_select_all"
  on public.glyphs for select
  using (true);

-- ============================================================================
-- Explicit grants — revoke anon from sensitive tables, grant to authenticated
-- ============================================================================
revoke all on public.devices from anon;
revoke all on public.tier_1_signals from anon;
revoke all on public.tier_2_daily from anon;
revoke all on public.tier_3_weekly from anon;
revoke all on public.tier_4_themes from anon;
revoke all on public.consultations from anon;

grant select, insert, update, delete on public.devices to authenticated;
grant select, insert, update, delete on public.tier_1_signals to authenticated;
grant select, insert, update, delete on public.tier_2_daily to authenticated;
grant select, insert, update, delete on public.tier_3_weekly to authenticated;
grant select, insert, update, delete on public.tier_4_themes to authenticated;
grant select, insert, update, delete on public.consultations to authenticated;
grant select on public.glyphs to authenticated, anon;
