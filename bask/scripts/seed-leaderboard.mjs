#!/usr/bin/env node
/**
 * Bootstrap the Touch Grass Leaderboard with realistic early-community rows.
 * Run from bask/: npm run seed:leaderboard
 *
 * NOT for production smoke tests — use test-leaderboard.mjs for that.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { uniqueNamesGenerator, adjectives, animals } from 'unique-names-generator';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env');
const manifestPath = resolve(__dirname, '.leaderboard-bootstrap-manifest.json');

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

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const wipeBootstrap = args.includes('--wipe-bootstrap');
const countArg = args.find((a) => a.startsWith('--count='));
const seedCount = Math.max(
  1,
  Math.min(50, Number(countArg?.split('=')[1]) || 22),
);

function fail(msg) {
  console.error(`\n❌ ${msg}`);
  process.exit(1);
}

function ok(msg) {
  console.log(`✅ ${msg}`);
}

if (!url || !anonKey) {
  fail('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in bask/.env');
}

if (url.includes('your-project') || anonKey.includes('your-anon')) {
  fail('Replace placeholder values in bask/.env with real Supabase credentials');
}

const supabase = createClient(url, anonKey);

const LOCATIONS = [
  { countryCode: 'US', regionLabel: 'California', cityLabel: 'San Diego' },
  { countryCode: 'US', regionLabel: 'Texas', cityLabel: 'Austin' },
  { countryCode: 'CA', regionLabel: 'British Columbia', cityLabel: 'Vancouver' },
  { countryCode: 'GB', regionLabel: 'England', cityLabel: 'London' },
  { countryCode: 'AU', regionLabel: 'Victoria', cityLabel: 'Melbourne' },
  { countryCode: 'DE', regionLabel: 'Berlin', cityLabel: 'Berlin' },
  { countryCode: 'FR', regionLabel: 'Provence', cityLabel: 'Nice' },
  { countryCode: 'ES', regionLabel: 'Andalusia', cityLabel: 'Seville' },
  { countryCode: 'NL', regionLabel: 'North Holland', cityLabel: 'Amsterdam' },
  { countryCode: 'NZ', regionLabel: 'Auckland', cityLabel: 'Auckland' },
];

const PRECISIONS = ['none', 'none', 'country', 'region', 'city'];
const MAX_SESSION_SECONDS = 28800;
const MAX_NAME_ATTEMPTS = 12;

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}

function todayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    .toISOString()
    .slice(0, 10);
}

function generateName() {
  return uniqueNamesGenerator({
    dictionaries: [adjectives, animals],
    separator: '-',
    length: 2,
    style: 'lowerCase',
  });
}

/** Early-community streaks; current and longest both capped at 4 days. */
function realisticStreaks() {
  const current = randInt(0, 4);
  const longest = current === 0 ? randInt(0, 4) : randInt(current, 4);
  return { currentStreak: current, longestStreak: longest };
}

async function registerWithRetry(location, precision) {
  for (let attempt = 0; attempt < MAX_NAME_ATTEMPTS; attempt++) {
    const name = generateName();
    const { data: reg, error: regErr } = await supabase.rpc('register_leaderboard_user', {
      p_anonymous_name: name,
      p_country_code: precision !== 'none' ? location.countryCode : null,
      p_region_label:
        precision === 'region' || precision === 'city' ? location.regionLabel : null,
      p_city_label: precision === 'city' ? location.cityLabel : null,
      p_location_precision: precision,
    });
    if (!regErr) {
      const u = Array.isArray(reg) ? reg[0] : reg;
      return { ...u, anonymous_name: name };
    }
    if (!regErr.message.includes('anonymous_name_taken')) {
      throw new Error(regErr.message);
    }
  }
  throw new Error('Could not register a unique anonymous name');
}

async function submitTodaySessions(user, location, precision, index, today) {
  const sessionCount = randInt(1, 2);
  const totalMinutes = randInt(12, 55);
  let totalSeconds = 0;

  for (let s = 0; s < sessionCount; s++) {
    const minutes = Math.max(1, Math.round(totalMinutes / sessionCount));
    const durationSeconds = Math.min(MAX_SESSION_SECONDS, minutes * 60);
    totalSeconds += durationSeconds;
    const iuPerMin = randInt(35, 65);
    const iuGained = Math.min(2800, Math.max(400, Math.round(minutes * iuPerMin)));

    const { error } = await supabase.rpc('submit_leaderboard_session', {
      p_public_user_id: user.public_user_id,
      p_write_token: user.write_token,
      p_local_session_id: `lb-bootstrap-${index}-${today}-${s}`,
      p_iu_gained: iuGained,
      p_duration_seconds: durationSeconds,
      p_country_code: precision !== 'none' ? location.countryCode : null,
      p_region_label:
        precision === 'region' || precision === 'city' ? location.regionLabel : null,
      p_city_label: precision === 'city' ? location.cityLabel : null,
    });
    if (error) throw new Error(`submit session for ${user.anonymous_name}: ${error.message}`);
  }

  return Math.round(totalSeconds / 60);
}

async function wipeBootstrapUsers() {
  if (!existsSync(manifestPath)) {
    fail(
      `No manifest at ${manifestPath}. Run seed first, or delete bootstrap users in SQL Editor:\n` +
        `  DELETE FROM leaderboard_users WHERE public_user_id IN (\n` +
        `    SELECT DISTINCT public_user_id FROM leaderboard_sessions\n` +
        `    WHERE local_session_id LIKE 'lb-bootstrap-%'\n` +
        `  );`,
    );
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (!Array.isArray(manifest) || manifest.length === 0) {
    console.log('Manifest empty — nothing to wipe.');
    return;
  }

  console.log(`\nWiping ${manifest.length} bootstrap user(s)...\n`);
  let removed = 0;
  for (const entry of manifest) {
    const { error } = await supabase.rpc('delete_leaderboard_user', {
      p_public_user_id: entry.public_user_id,
      p_write_token: entry.write_token,
    });
    if (error) {
      console.warn(`⚠️  Could not delete ${entry.anonymous_name}: ${error.message}`);
    } else {
      removed++;
    }
  }

  writeFileSync(manifestPath, '[]\n');
  ok(`Removed ${removed} bootstrap user(s)`);
}

async function seedBootstrap() {
  const today = todayUtc();
  console.log(`\nSeeding ${seedCount} bootstrap users (today UTC: ${today})...\n`);

  if (dryRun) {
    for (let i = 0; i < seedCount; i++) {
      const { currentStreak, longestStreak } = realisticStreaks();
      const sun = randInt(12, 55);
      console.log(
        `  [dry-run] ${generateName()} | streak ${currentStreak}/${longestStreak} | ~${sun}m sun`,
      );
    }
    console.log('\nDry run complete — no changes written.\n');
    return;
  }

  const manifest = [];
  const seeded = [];

  for (let i = 0; i < seedCount; i++) {
    const location = LOCATIONS[i % LOCATIONS.length];
    const precision = PRECISIONS[i % PRECISIONS.length];
    const { currentStreak, longestStreak } = realisticStreaks();

    let user;
    try {
      user = await registerWithRetry(location, precision);
    } catch (err) {
      console.warn(`⚠️  Skipped user ${i + 1}: ${err.message}`);
      continue;
    }

    const { error: streakErr } = await supabase.rpc('update_leaderboard_streak', {
      p_public_user_id: user.public_user_id,
      p_write_token: user.write_token,
      p_current_streak: currentStreak,
      p_longest_streak: longestStreak,
    });
    if (streakErr) {
      console.warn(`⚠️  Streak failed for ${user.anonymous_name}: ${streakErr.message}`);
      await supabase.rpc('delete_leaderboard_user', {
        p_public_user_id: user.public_user_id,
        p_write_token: user.write_token,
      });
      continue;
    }

    let sunMinutes;
    try {
      sunMinutes = await submitTodaySessions(user, location, precision, i, today);
    } catch (err) {
      console.warn(`⚠️  Sessions failed for ${user.anonymous_name}: ${err.message}`);
      await supabase.rpc('delete_leaderboard_user', {
        p_public_user_id: user.public_user_id,
        p_write_token: user.write_token,
      });
      continue;
    }

    manifest.push({
      public_user_id: user.public_user_id,
      write_token: user.write_token,
      anonymous_name: user.anonymous_name,
      seeded_at: new Date().toISOString(),
    });
    seeded.push({
      name: user.anonymous_name,
      currentStreak,
      longestStreak,
      sunMinutes,
      precision,
      country: precision === 'none' ? '—' : location.countryCode,
    });
  }

  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  seeded.sort((a, b) => b.currentStreak - a.currentStreak);

  console.log('Bootstrap users (by current streak):');
  for (const s of seeded) {
    console.log(
      `  streak ${String(s.currentStreak).padStart(2)}/${String(s.longestStreak).padEnd(2)}` +
        ` | sun ${String(s.sunMinutes).padStart(2)}m` +
        ` | ${s.country.padEnd(3)} ${s.precision.padEnd(7)} | ${s.name}`,
    );
  }
  ok(`Seeded ${seeded.length} users (manifest: scripts/.leaderboard-bootstrap-manifest.json)`);

  const bounds = { start: today, end: today };
  const endDate = new Date(`${today}T00:00:00Z`);
  endDate.setUTCDate(endDate.getUTCDate() + 1);
  bounds.end = endDate.toISOString().slice(0, 10);

  const { data: board, error: boardErr } = await supabase.rpc('get_leaderboard', {
    p_start: bounds.start,
    p_end: bounds.end,
    p_limit: 10,
    p_country_code: null,
  });
  if (boardErr) {
    console.warn(`⚠️  Could not verify leaderboard: ${boardErr.message}`);
  } else {
    console.log(`\nTop of today's board (${(board ?? []).length} rows returned):`);
    for (const row of board ?? []) {
      console.log(
        `  #${row.rank} ${row.anonymous_name} — streak ${row.current_streak}, ${row.total_sun_minutes}m sun`,
      );
    }
  }
  console.log('');
}

async function main() {
  console.log('\nBask Leaderboard — bootstrap seed\n');

  if (wipeBootstrap) {
    await wipeBootstrapUsers();
    if (!args.some((a) => a.startsWith('--count=')) && !args.includes('--dry-run')) {
      return;
    }
  }

  await seedBootstrap();
}

main().catch((err) => {
  fail(err.message ?? String(err));
});
