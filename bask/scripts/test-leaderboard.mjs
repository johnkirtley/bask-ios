#!/usr/bin/env node
/**
 * Smoke test for Touch Grass Leaderboard Supabase setup.
 * Run from bask/: node scripts/test-leaderboard.mjs
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env');

function loadEnv() {
  try {
    const raw = readFileSync(envPath, 'utf8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // .env optional if vars already exported
  }
}

loadEnv();

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function fail(msg) {
  console.error(`\n❌ ${msg}`);
  process.exit(1);
}

function ok(msg) {
  console.log(`✅ ${msg}`);
}

if (!url || !anonKey) {
  fail(
    'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in bask/.env',
  );
}

if (url.includes('your-project') || anonKey.includes('your-anon')) {
  fail('Replace placeholder values in bask/.env with real Supabase credentials');
}

const supabase = createClient(url, anonKey);

function todayBounds() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

async function main() {
  console.log('\nBask Leaderboard — Supabase smoke test\n');

  // 1. Empty leaderboard read
  const bounds = todayBounds();
  const { data: empty, error: readErr } = await supabase.rpc('get_leaderboard', {
    p_start: bounds.start,
    p_end: bounds.end,
    p_limit: 10,
    p_country_code: null,
  });

  if (readErr) {
    if (readErr.message.includes('Could not find the function')) {
      fail(
        `get_leaderboard RPC not found. Run bask/supabase/schema.sql in Supabase SQL Editor.\n   ${readErr.message}`,
      );
    }
    fail(`get_leaderboard failed: ${readErr.message}`);
  }
  ok(`get_leaderboard works (${(empty ?? []).length} rows today)`);

  // 2. Register test user
  const testName = `test-${Date.now().toString(36)}`;
  const { data: reg, error: regErr } = await supabase.rpc('register_leaderboard_user', {
    p_anonymous_name: testName,
    p_country_code: 'US',
    p_region_label: 'TX',
    p_city_label: null,
    p_location_precision: 'region',
  });

  if (regErr) {
    fail(`register_leaderboard_user failed: ${regErr.message}`);
  }

  const row = Array.isArray(reg) ? reg[0] : reg;
  if (!row?.public_user_id || !row?.write_token) {
    fail('register_leaderboard_user did not return public_user_id + write_token');
  }
  ok(`register_leaderboard_user works (name: ${testName})`);

  // 3. Submit test session
  const { error: submitErr } = await supabase.rpc('submit_leaderboard_session', {
    p_public_user_id: row.public_user_id,
    p_write_token: row.write_token,
    p_local_session_id: `smoke-${Date.now()}`,
    p_iu_gained: 1200,
    p_duration_seconds: 900,
    p_country_code: 'US',
    p_region_label: 'TX',
    p_city_label: null,
  });

  if (submitErr) {
    fail(`submit_leaderboard_session failed: ${submitErr.message}`);
  }
  ok('submit_leaderboard_session works (1200 IU, 15 min)');

  // 4. Read leaderboard again — should include test user
  const { data: filled, error: read2Err } = await supabase.rpc('get_leaderboard', {
    p_start: bounds.start,
    p_end: bounds.end,
    p_limit: 50,
    p_country_code: null,
  });

  if (read2Err) fail(`get_leaderboard (after submit) failed: ${read2Err.message}`);

  const mine = (filled ?? []).find((e) => e.anonymous_name === testName);
  if (!mine) {
    fail('Test user not found in leaderboard after submit');
  }
  ok(`Leaderboard shows test user at rank #${mine.rank} (${mine.total_iu} IU)`);

  // 5. Idempotency — same session id should not double-count
  const sessionId = `smoke-idempotent-${Date.now()}`;
  await supabase.rpc('submit_leaderboard_session', {
    p_public_user_id: row.public_user_id,
    p_write_token: row.write_token,
    p_local_session_id: sessionId,
    p_iu_gained: 500,
    p_duration_seconds: 300,
  });
  await supabase.rpc('submit_leaderboard_session', {
    p_public_user_id: row.public_user_id,
    p_write_token: row.write_token,
    p_local_session_id: sessionId,
    p_iu_gained: 500,
    p_duration_seconds: 300,
  });

  const { data: afterDup } = await supabase.rpc('get_leaderboard', {
    p_start: bounds.start,
    p_end: bounds.end,
    p_limit: 50,
  });
  const afterMine = (afterDup ?? []).find((e) => e.anonymous_name === testName);
  if (afterMine && Number(afterMine.total_iu) !== Number(mine.total_iu) + 500) {
    fail(`Idempotency check failed — expected +500 IU once, got ${afterMine.total_iu}`);
  }
  ok('Idempotency works (duplicate session id ignored)');

  // 6. Cleanup
  const { error: delErr } = await supabase.rpc('delete_leaderboard_user', {
    p_public_user_id: row.public_user_id,
    p_write_token: row.write_token,
  });

  if (delErr) {
    console.warn(`⚠️  Cleanup failed (delete test user manually): ${delErr.message}`);
  } else {
    ok('delete_leaderboard_user works (test data removed)');
  }

  console.log('\nAll checks passed. Supabase leaderboard is ready for app + marketing site.\n');
}

main().catch((err) => {
  fail(err.message ?? String(err));
});
