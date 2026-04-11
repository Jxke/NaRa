#!/usr/bin/env bash
#
# Test script for Maddi Edge Functions.
# Tests /consult with a text transcript (no audio needed).
# Tests /ingest-audio is reachable (returns 400 without audio body).
# Tests compression functions are reachable (returns 401 without auth).
#
# Prerequisites:
#   - Edge Functions deployed: supabase functions deploy
#   - Environment variables set in supabase/.env
#
# Usage:
#   cd supabase && bash tests/test_edge_functions.sh

set -euo pipefail

# Load env
if [ -f .env ]; then
  source .env
elif [ -f ../.env ]; then
  source ../.env
fi

BASE_URL="${SUPABASE_URL:-https://tsblsjjlrjnllsqyusmb.supabase.co}"
ANON_KEY="${SUPABASE_ANON_KEY:-}"
SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"

PASS=0
FAIL=0

check() {
  local name="$1"
  local expected_status="$2"
  local actual_status="$3"
  if [ "$actual_status" -eq "$expected_status" ]; then
    echo "  PASS: $name (HTTP $actual_status)"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $name (expected HTTP $expected_status, got $actual_status)"
    FAIL=$((FAIL + 1))
  fi
}

echo "========================================="
echo "Maddi Edge Function Tests"
echo "Base URL: $BASE_URL"
echo "========================================="
echo ""

# ─── Test 1: /ingest-audio without auth → 401 ───
echo "Test 1: /ingest-audio reachable (no auth → 401)"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "${BASE_URL}/functions/v1/ingest-audio" \
  -H "Content-Type: audio/wav" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  --data-binary "fake-audio")
check "ingest-audio no device key" 401 "$STATUS"

# ─── Test 2: /consult without auth → 401 ───
echo "Test 2: /consult reachable (no auth → 401)"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "${BASE_URL}/functions/v1/consult" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -d '{"transcript":"hello"}')
check "consult no device key" 401 "$STATUS"

# ─── Test 3: /consult with transcript (needs device key) ───
# This test requires a registered device + API key.
# To run it, set DEVICE_API_KEY in your environment.
DEVICE_KEY="${DEVICE_API_KEY:-}"
if [ -n "$DEVICE_KEY" ]; then
  echo "Test 3: /consult with transcript + device key"
  RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST "${BASE_URL}/functions/v1/consult" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${ANON_KEY}" \
    -H "X-Device-Key: ${DEVICE_KEY}" \
    -d '{"transcript":"How should I approach this important decision?"}')
  STATUS=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  check "consult with transcript" 200 "$STATUS"
  if [ "$STATUS" -eq 200 ]; then
    echo "    Response: $BODY"
  fi
else
  echo "Test 3: SKIPPED (/consult with transcript — set DEVICE_API_KEY to run)"
fi

# ─── Test 4: compress-hourly without auth → 401 ───
echo "Test 4: /compress-hourly reachable (no auth → 401)"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "${BASE_URL}/functions/v1/compress-hourly" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ANON_KEY}")
check "compress-hourly no cron auth" 401 "$STATUS"

# ─── Test 5: compress-hourly with service key ───
if [ -n "$SERVICE_KEY" ]; then
  echo "Test 5: /compress-hourly with service role key"
  RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST "${BASE_URL}/functions/v1/compress-hourly" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${SERVICE_KEY}")
  STATUS=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  check "compress-hourly with service key" 200 "$STATUS"
  if [ "$STATUS" -eq 200 ]; then
    echo "    Response: $BODY"
  fi
else
  echo "Test 5: SKIPPED (set SUPABASE_SERVICE_ROLE_KEY to run)"
fi

# ─── Test 6: compress-daily with service key ───
if [ -n "$SERVICE_KEY" ]; then
  echo "Test 6: /compress-daily with service role key"
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "${BASE_URL}/functions/v1/compress-daily" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${SERVICE_KEY}")
  check "compress-daily with service key" 200 "$STATUS"
else
  echo "Test 6: SKIPPED"
fi

# ─── Test 7: compress-weekly with service key ───
if [ -n "$SERVICE_KEY" ]; then
  echo "Test 7: /compress-weekly with service role key"
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "${BASE_URL}/functions/v1/compress-weekly" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${SERVICE_KEY}")
  check "compress-weekly with service key" 200 "$STATUS"
else
  echo "Test 7: SKIPPED"
fi

echo ""
echo "========================================="
echo "Results: ${PASS} passed, ${FAIL} failed"
echo "========================================="

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
