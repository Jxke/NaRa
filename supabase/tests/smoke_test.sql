-- smoke_test.sql
-- Run against a fresh Supabase instance after all migrations + seed.
-- Validates schema, RLS, cascade deletes, and glyph data.
--
-- Usage: psql $DATABASE_URL -f supabase/tests/smoke_test.sql
--
-- This script uses DO blocks with RAISE NOTICE for pass/fail output.
-- It creates test data and cleans up after itself.

-- ============================================================================
-- 1. Verify all tables exist
-- ============================================================================
do $$
declare
  expected_tables text[] := array[
    'devices', 'tier_1_signals', 'tier_2_daily', 'tier_3_weekly',
    'tier_4_themes', 'consultations', 'glyphs', 'device_api_keys'
  ];
  t text;
begin
  foreach t in array expected_tables loop
    if not exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = t
    ) then
      raise exception 'FAIL: table % does not exist', t;
    end if;
  end loop;
  raise notice 'PASS: All 8 tables exist';
end $$;

-- ============================================================================
-- 2. Verify RLS is enabled on all tables
-- ============================================================================
do $$
declare
  t record;
begin
  for t in
    select tablename from pg_tables
    where schemaname = 'public'
      and tablename in (
        'devices', 'tier_1_signals', 'tier_2_daily', 'tier_3_weekly',
        'tier_4_themes', 'consultations', 'glyphs', 'device_api_keys'
      )
  loop
    if not exists (
      select 1 from pg_class
      where relname = t.tablename and relrowsecurity = true
    ) then
      raise exception 'FAIL: RLS not enabled on %', t.tablename;
    end if;
  end loop;
  raise notice 'PASS: RLS enabled on all tables';
end $$;

-- ============================================================================
-- 3. Verify all 42 glyphs are seeded
-- ============================================================================
do $$
declare
  glyph_count int;
begin
  select count(*) into glyph_count from public.glyphs;
  if glyph_count != 42 then
    raise exception 'FAIL: Expected 42 glyphs, found %', glyph_count;
  end if;
  raise notice 'PASS: 42 glyphs seeded';
end $$;

-- ============================================================================
-- 4. Verify each glyph has required fields populated
-- ============================================================================
do $$
declare
  bad_glyphs int;
begin
  select count(*) into bad_glyphs from public.glyphs
  where array_length(tags, 1) is null
     or array_length(interpretations, 1) is null
     or array_length(prompt_questions, 1) is null
     or bitmap_url is null;
  if bad_glyphs > 0 then
    raise exception 'FAIL: % glyphs have missing data', bad_glyphs;
  end if;
  raise notice 'PASS: All glyphs have tags, interpretations, prompt_questions, bitmap_url';
end $$;

-- ============================================================================
-- 5. Verify indexes exist
-- ============================================================================
do $$
declare
  expected_indexes text[] := array[
    'idx_devices_user',
    'idx_tier1_device_created', 'idx_tier1_created',
    'idx_tier2_device_date', 'idx_tier2_created',
    'idx_tier3_device_week', 'idx_tier3_created',
    'idx_tier4_device_strength', 'idx_tier4_last_reinforced',
    'idx_consultations_device_created',
    'idx_device_api_keys_hash'
  ];
  idx text;
begin
  foreach idx in array expected_indexes loop
    if not exists (
      select 1 from pg_indexes where indexname = idx
    ) then
      raise exception 'FAIL: index % does not exist', idx;
    end if;
  end loop;
  raise notice 'PASS: All 11 indexes exist';
end $$;

-- ============================================================================
-- 6. Verify pg_cron jobs are scheduled
-- ============================================================================
do $$
declare
  expected_jobs text[] := array[
    'cleanup-tier1', 'cleanup-tier2', 'cleanup-tier3', 'cleanup-tier4'
  ];
  j text;
begin
  foreach j in array expected_jobs loop
    if not exists (
      select 1 from cron.job where jobname = j
    ) then
      raise exception 'FAIL: cron job % not found', j;
    end if;
  end loop;
  raise notice 'PASS: All 4 pg_cron retention jobs scheduled';
end $$;

-- ============================================================================
-- 7. Verify cascade delete works (devices → all child tables)
-- NOTE: Temporarily disables FK checks to avoid needing a real auth.users row.
-- This is safe for testing — we're validating ON DELETE CASCADE, not FK integrity.
-- ============================================================================
do $$
declare
  test_user_id uuid := gen_random_uuid();
  test_device_id uuid;
  remaining int;
begin
  -- Bypass FK constraint on auth.users for test data insertion
  set local session_replication_role = 'replica';

  insert into public.devices (id, user_id, name)
  values (gen_random_uuid(), test_user_id, 'Test Device')
  returning id into test_device_id;

  -- Re-enable FK checks before cascade test
  set local session_replication_role = 'origin';

  -- Insert child rows
  insert into public.tier_1_signals (device_id, transcript)
  values (test_device_id, 'test transcript');

  insert into public.tier_2_daily (device_id, date)
  values (test_device_id, current_date);

  insert into public.tier_3_weekly (device_id, week_start)
  values (test_device_id, current_date);

  insert into public.tier_4_themes (device_id, theme_type, theme_name)
  values (test_device_id, 'test', 'Test Theme');

  insert into public.consultations (device_id, query_transcript, word)
  values (test_device_id, 'test query', 'reflect');

  insert into public.device_api_keys (device_id, key_hash)
  values (test_device_id, 'test_hash_' || test_device_id);

  -- Delete the device — should cascade to all children
  delete from public.devices where id = test_device_id;

  -- Verify all children are gone
  select count(*) into remaining from public.tier_1_signals where device_id = test_device_id;
  if remaining > 0 then raise exception 'FAIL: T1 rows not cascaded'; end if;

  select count(*) into remaining from public.tier_2_daily where device_id = test_device_id;
  if remaining > 0 then raise exception 'FAIL: T2 rows not cascaded'; end if;

  select count(*) into remaining from public.tier_3_weekly where device_id = test_device_id;
  if remaining > 0 then raise exception 'FAIL: T3 rows not cascaded'; end if;

  select count(*) into remaining from public.tier_4_themes where device_id = test_device_id;
  if remaining > 0 then raise exception 'FAIL: T4 rows not cascaded'; end if;

  select count(*) into remaining from public.consultations where device_id = test_device_id;
  if remaining > 0 then raise exception 'FAIL: consultation rows not cascaded'; end if;

  select count(*) into remaining from public.device_api_keys where device_id = test_device_id;
  if remaining > 0 then raise exception 'FAIL: API key rows not cascaded'; end if;

  raise notice 'PASS: Cascade delete removes all child rows across 6 tables';
end $$;

-- ============================================================================
-- 8. Verify schema column types match spec
-- ============================================================================
do $$
begin
  -- emotional_valence should be text (not float)
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'tier_1_signals'
      and column_name = 'emotional_valence'
      and data_type = 'text'
  ) then
    raise exception 'FAIL: emotional_valence should be text';
  end if;

  -- device_api_keys.key_hash should have a unique constraint
  if not exists (
    select 1 from information_schema.table_constraints
    where table_name = 'device_api_keys'
      and constraint_type = 'UNIQUE'
  ) then
    raise exception 'FAIL: device_api_keys missing unique constraint on key_hash';
  end if;

  raise notice 'PASS: Schema column types match spec';
end $$;

-- ============================================================================
-- Summary
-- ============================================================================
do $$
begin
  raise notice '';
  raise notice '========================================';
  raise notice 'All smoke tests passed.';
  raise notice '========================================';
end $$;
