'use client';

/**
 * Development-only seed data for the WEB preview.
 *
 * On web there is no SQLite database (see `connection.ts` — `getConnection()`
 * throws on non-native platforms). To let us see how the UI looks with real-
 * looking history while developing on localhost, the repositories short-circuit
 * their READ methods to this in-memory seed whenever `Capacitor.isNativePlatform()`
 * is false. Native behavior is completely untouched — these helpers are never
 * reached on a device/simulator.
 *
 * The seed is deterministic (same data every reload) and is generated relative
 * to "today" so the ring, streak, calendar, and trend chart all populate.
 */

import type { CofactorType } from './repositories/cofactorsRepository';

export interface SeedSession {
  id: number;
  started_at: string;
  ended_at: string | null;
  uv_index: number;
  duration_seconds: number;
  iu_gained: number;
  clothing_preset_id: string;
  exposure_percent: number;
  notes: string | null;
  created_at: string;
  source: 'manual' | 'healthkit';
  synced_at: string | null;
}

export interface SeedSupplement {
  id: number;
  dosage_iu: number;
  logged_at: string;
  notes: string | null;
  created_at: string;
}

export interface SeedCofactor {
  id: number;
  cofactor_type: CofactorType;
  logged_at: string;
  notes: string | null;
  created_at: string;
}

export interface SeedProfile {
  id: number;
  fitzpatrick_type: number;
  base_d_level: number;
  daily_goal: number;
  age: number;
  weight: number;
  weight_unit: string;
  default_attire: string;
  disclaimer_accepted_at: string;
  created_at: string;
  updated_at: string;
}

interface SeedData {
  profile: SeedProfile;
  sessions: SeedSession[];
  supplements: SeedSupplement[];
  cofactors: SeedCofactor[];
}

const SEED_DAYS = 30;
const SEED_GOAL_IU = 5000;
const PRESET_ID = 't-shirt-shorts';

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function localDateKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Deterministic pseudo-random in [0, 1) from an integer seed.
function rng(seed: number): number {
  const x = Math.sin(seed * 99991 + 7) * 43758.5453;
  return x - Math.floor(x);
}

let cache: SeedData | null = null;

function build(): SeedData {
  const today = startOfDay(new Date());
  const sessions: SeedSession[] = [];
  const supplements: SeedSupplement[] = [];
  const cofactors: SeedCofactor[] = [];
  let sid = 1;
  let supId = 1;
  let cofId = 1;

  for (let i = SEED_DAYS - 1; i >= 0; i--) {
    const day = new Date(today.getTime() - i * 86_400_000);
    const r = rng(i);

    // Leave a few gaps in the older history so the calendar has variety.
    const skip = i > 6 && r < 0.18;
    if (skip) continue;

    const isTodayPartial = i === 0;
    const isRecentStreak = i >= 1 && i <= 5; // guarantee a healthy current streak

    // Primary midday sun session.
    const sessionStart = new Date(day);
    sessionStart.setHours(12, 0, 0, 0);
    const durationMin = 20 + Math.round(rng(i + 100) * 40); // 20–60 min
    const uv = 4 + Math.round(rng(i + 200) * 5); // 4–9

    let iu: number;
    if (isTodayPartial) {
      iu = 2200; // ring shows ~44% progress for today
    } else if (isRecentStreak) {
      iu = 5200 + Math.round(rng(i + 300) * 800); // reliably clears the goal
    } else {
      iu = 2500 + Math.round(rng(i + 300) * 3800); // mixed met/missed days
    }

    const sessionEnd = new Date(sessionStart.getTime() + durationMin * 60_000);
    sessions.push({
      id: sid++,
      started_at: sessionStart.toISOString(),
      ended_at: sessionEnd.toISOString(),
      uv_index: uv,
      duration_seconds: durationMin * 60,
      iu_gained: iu,
      clothing_preset_id: PRESET_ID,
      exposure_percent: 55,
      notes: null,
      created_at: sessionStart.toISOString(),
      source: 'manual',
      synced_at: null,
    });

    // Occasional short afternoon top-up session (not today).
    if (!isTodayPartial && rng(i + 400) > 0.7) {
      const s2 = new Date(day);
      s2.setHours(16, 0, 0, 0);
      const dur2 = 10 + Math.round(rng(i + 450) * 20);
      sessions.push({
        id: sid++,
        started_at: s2.toISOString(),
        ended_at: new Date(s2.getTime() + dur2 * 60_000).toISOString(),
        uv_index: 3 + Math.round(rng(i + 460) * 3),
        duration_seconds: dur2 * 60,
        iu_gained: 800 + Math.round(rng(i + 470) * 1200),
        clothing_preset_id: PRESET_ID,
        exposure_percent: 55,
        notes: null,
        created_at: s2.toISOString(),
        source: 'manual',
        synced_at: null,
      });
    }

    // Supplement on roughly half the days.
    if (rng(i + 500) > 0.55) {
      const sup = new Date(day);
      sup.setHours(8, 30, 0, 0);
      supplements.push({
        id: supId++,
        dosage_iu: rng(i + 510) > 0.5 ? 2000 : 1000,
        logged_at: sup.toISOString(),
        notes: null,
        created_at: sup.toISOString(),
      });
    }

    // Cofactors on some days.
    if (rng(i + 600) > 0.6) {
      const c = new Date(day);
      c.setHours(8, 35, 0, 0);
      cofactors.push({
        id: cofId++,
        cofactor_type: 'magnesium',
        logged_at: c.toISOString(),
        notes: null,
        created_at: c.toISOString(),
      });
    }
    if (rng(i + 700) > 0.75) {
      const c = new Date(day);
      c.setHours(8, 36, 0, 0);
      cofactors.push({
        id: cofId++,
        cofactor_type: 'vitamin_k2',
        logged_at: c.toISOString(),
        notes: null,
        created_at: c.toISOString(),
      });
    }
  }

  const nowIso = new Date().toISOString();
  const profile: SeedProfile = {
    id: 1,
    fitzpatrick_type: 2,
    base_d_level: 30,
    daily_goal: SEED_GOAL_IU,
    age: 32,
    weight: 75,
    weight_unit: 'kg',
    default_attire: PRESET_ID,
    disclaimer_accepted_at: nowIso,
    created_at: nowIso,
    updated_at: nowIso,
  };

  return { profile, sessions, supplements, cofactors };
}

export function getSeed(): SeedData {
  if (!cache) cache = build();
  return cache;
}

function inRange(iso: string, start: string, end: string): boolean {
  return iso >= start && iso <= end;
}

function isToday(iso: string): boolean {
  return localDateKey(iso) === localDateKey(new Date().toISOString());
}

// ---- Session helpers ----
export function seedSessionsToday(): SeedSession[] {
  return getSeed().sessions.filter((s) => isToday(s.started_at));
}
export function seedSessionsTodayTotalIU(): number {
  return seedSessionsToday().reduce((sum, s) => sum + s.iu_gained, 0);
}
export function seedSessionsByRange(start: string, end: string): SeedSession[] {
  return getSeed()
    .sessions.filter((s) => inRange(s.started_at, start, end))
    .sort((a, b) => (a.started_at < b.started_at ? 1 : -1));
}

// ---- Supplement helpers ----
export function seedSupplementsToday(): SeedSupplement[] {
  return getSeed().supplements.filter((s) => isToday(s.logged_at));
}
export function seedSupplementsTodayTotalIU(): number {
  return seedSupplementsToday().reduce((sum, s) => sum + s.dosage_iu, 0);
}
export function seedSupplementsByRange(start: string, end: string): SeedSupplement[] {
  return getSeed()
    .supplements.filter((s) => inRange(s.logged_at, start, end))
    .sort((a, b) => (a.logged_at < b.logged_at ? 1 : -1));
}

// ---- Cofactor helpers ----
export function seedCofactorsByRange(start: string, end: string): SeedCofactor[] {
  return getSeed()
    .cofactors.filter((c) => inRange(c.logged_at, start, end))
    .sort((a, b) => (a.logged_at < b.logged_at ? 1 : -1));
}
export function seedCofactorsTodayByType(type: CofactorType): SeedCofactor[] {
  return getSeed().cofactors.filter(
    (c) => c.cofactor_type === type && isToday(c.logged_at),
  );
}
export function seedCofactorLastLogged(type: CofactorType): string | null {
  const matches = getSeed()
    .cofactors.filter((c) => c.cofactor_type === type)
    .map((c) => c.logged_at)
    .sort();
  return matches.length > 0 ? matches[matches.length - 1] : null;
}
