'use client';

import { Capacitor } from '@capacitor/core';
import { databaseService } from '../connection';

const WEB_STREAK_STATE_KEY = 'bask_streak_state';
const WEB_GOAL_SNAPSHOTS_KEY = 'bask_daily_goal_snapshots';

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastQualifyingDate: string | null;
  lastStreakDeathDate: string | null;
  lastStreakDeathLength: number;
  streakRevivalNotifFired: boolean;
  lastRevivalNotifDate: string | null;
  milestonesAchieved: number[];
}

export interface StreakStatePatch {
  currentStreak?: number;
  longestStreak?: number;
  lastQualifyingDate?: string | null;
  lastStreakDeathDate?: string | null;
  lastStreakDeathLength?: number;
  streakRevivalNotifFired?: boolean;
  lastRevivalNotifDate?: string | null;
  milestonesAchieved?: number[];
}

export interface DailyGoalSnapshot {
  dateKey: string;
  goalIU: number;
}

const DEFAULT_STREAK_STATE: StreakState = {
  currentStreak: 0,
  longestStreak: 0,
  lastQualifyingDate: null,
  lastStreakDeathDate: null,
  lastStreakDeathLength: 0,
  streakRevivalNotifFired: false,
  lastRevivalNotifDate: null,
  milestonesAchieved: [],
};

function parseMilestones(raw: unknown): number[] {
  if (Array.isArray(raw)) {
    return raw.filter((value): value is number => typeof value === 'number');
  }

  if (typeof raw !== 'string') return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((value): value is number => typeof value === 'number')
      : [];
  } catch {
    return [];
  }
}

function rowToState(row: any): StreakState {
  return {
    currentStreak: row?.current_streak ?? 0,
    longestStreak: row?.longest_streak ?? 0,
    lastQualifyingDate: row?.last_qualifying_date ?? null,
    lastStreakDeathDate: row?.last_streak_death_date ?? null,
    lastStreakDeathLength: row?.last_streak_death_length ?? 0,
    streakRevivalNotifFired: Boolean(row?.streak_revival_notif_fired),
    lastRevivalNotifDate: row?.last_revival_notif_date ?? null,
    milestonesAchieved: parseMilestones(row?.milestones_achieved),
  };
}

function readWebState(): StreakState {
  if (typeof localStorage === 'undefined') return DEFAULT_STREAK_STATE;

  try {
    const raw = localStorage.getItem(WEB_STREAK_STATE_KEY);
    if (!raw) return DEFAULT_STREAK_STATE;
    return { ...DEFAULT_STREAK_STATE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_STREAK_STATE;
  }
}

function writeWebState(state: StreakState): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(WEB_STREAK_STATE_KEY, JSON.stringify(state));
}

function readWebSnapshots(): Record<string, number> {
  if (typeof localStorage === 'undefined') return {};

  try {
    const raw = localStorage.getItem(WEB_GOAL_SNAPSHOTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeWebSnapshots(snapshots: Record<string, number>): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(WEB_GOAL_SNAPSHOTS_KEY, JSON.stringify(snapshots));
}

export const streakStateRepository = {
  async get(): Promise<StreakState> {
    if (!Capacitor.isNativePlatform()) {
      return readWebState();
    }

    const db = await databaseService.getConnection();
    await db.run('INSERT OR IGNORE INTO bask_streak_state (id) VALUES (1)');

    const result = await db.query(
      'SELECT * FROM bask_streak_state WHERE id = 1',
    );

    return rowToState(result.values?.[0]);
  },

  async save(state: StreakState): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      writeWebState(state);
      return;
    }

    const db = await databaseService.getConnection();
    await db.run(
      `INSERT INTO bask_streak_state (
        id,
        current_streak,
        longest_streak,
        last_qualifying_date,
        last_streak_death_date,
        last_streak_death_length,
        streak_revival_notif_fired,
        last_revival_notif_date,
        milestones_achieved,
        updated_at
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        current_streak = ?,
        longest_streak = ?,
        last_qualifying_date = ?,
        last_streak_death_date = ?,
        last_streak_death_length = ?,
        streak_revival_notif_fired = ?,
        last_revival_notif_date = ?,
        milestones_achieved = ?,
        updated_at = datetime('now')`,
      [
        state.currentStreak,
        state.longestStreak,
        state.lastQualifyingDate,
        state.lastStreakDeathDate,
        state.lastStreakDeathLength,
        state.streakRevivalNotifFired ? 1 : 0,
        state.lastRevivalNotifDate,
        JSON.stringify(state.milestonesAchieved),
        state.currentStreak,
        state.longestStreak,
        state.lastQualifyingDate,
        state.lastStreakDeathDate,
        state.lastStreakDeathLength,
        state.streakRevivalNotifFired ? 1 : 0,
        state.lastRevivalNotifDate,
        JSON.stringify(state.milestonesAchieved),
      ],
    );
  },

  async patch(patch: StreakStatePatch): Promise<StreakState> {
    const current = await this.get();
    const next = { ...current, ...patch };
    await this.save(next);
    return next;
  },

  async reset(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(WEB_STREAK_STATE_KEY);
        localStorage.removeItem(WEB_GOAL_SNAPSHOTS_KEY);
      }
      return;
    }

    const db = await databaseService.getConnection();
    await db.run('DELETE FROM bask_streak_state');
    await db.run('INSERT OR IGNORE INTO bask_streak_state (id) VALUES (1)');
    await db.run('DELETE FROM bask_daily_goal_snapshots');
  },

  async getGoalSnapshots(
    dateKeys: string[],
    fallbackGoalIU: number,
  ): Promise<Map<string, number>> {
    const snapshots = new Map<string, number>();
    dateKeys.forEach((dateKey) => snapshots.set(dateKey, fallbackGoalIU));

    if (dateKeys.length === 0) return snapshots;

    if (!Capacitor.isNativePlatform()) {
      const webSnapshots = readWebSnapshots();
      dateKeys.forEach((dateKey) => {
        if (webSnapshots[dateKey] && webSnapshots[dateKey] > 0) {
          snapshots.set(dateKey, webSnapshots[dateKey]);
        }
      });
      return snapshots;
    }

    const db = await databaseService.getConnection();
    const placeholders = dateKeys.map(() => '?').join(', ');
    const result = await db.query(
      `SELECT date_key, goal_iu FROM bask_daily_goal_snapshots
       WHERE date_key IN (${placeholders})`,
      dateKeys,
    );

    for (const row of result.values ?? []) {
      if (row.goal_iu > 0) {
        snapshots.set(row.date_key, row.goal_iu);
      }
    }

    return snapshots;
  },

  async upsertGoalSnapshot(dateKey: string, goalIU: number): Promise<void> {
    if (goalIU <= 0) return;

    if (!Capacitor.isNativePlatform()) {
      const snapshots = readWebSnapshots();
      snapshots[dateKey] = goalIU;
      writeWebSnapshots(snapshots);
      return;
    }

    const db = await databaseService.getConnection();
    await db.run(
      `INSERT INTO bask_daily_goal_snapshots (date_key, goal_iu, updated_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(date_key) DO UPDATE SET
         goal_iu = ?,
         updated_at = datetime('now')`,
      [dateKey, goalIU, goalIU],
    );
  },

  async ensureGoalSnapshots(
    dateKeys: string[],
    fallbackGoalIU: number,
  ): Promise<void> {
    if (fallbackGoalIU <= 0 || dateKeys.length === 0) return;

    if (!Capacitor.isNativePlatform()) {
      const snapshots = readWebSnapshots();
      dateKeys.forEach((dateKey) => {
        if (snapshots[dateKey] === undefined) snapshots[dateKey] = fallbackGoalIU;
      });
      writeWebSnapshots(snapshots);
      return;
    }

    const db = await databaseService.getConnection();
    const statements = dateKeys.map((dateKey) => ({
      statement: `INSERT OR IGNORE INTO bask_daily_goal_snapshots (date_key, goal_iu)
                  VALUES (?, ?)`,
      values: [dateKey, fallbackGoalIU],
    }));

    await db.executeSet(statements);
  },
};
