// @vitest-environment jsdom
/**
 * Streak algebra — the highest-risk persistence logic in the app.
 * Covers recomputeAndPersistStreak death detection, grace-day survival,
 * milestone detection/repeat-suppression, streak-start, and lowGoalStreak.
 */
import { describe, it, expect, beforeEach } from 'vitest';

import { streaksRepository } from '@/lib/database/repositories/streaksRepository';
import { streakStateRepository } from '@/lib/database/repositories/streakStateRepository';
import { addDays, getLocalDateKey } from '@/lib/streakUtils';
import { getFakeDb, resetBackend } from '../_setup/capacitorMocks';
import type { StreakState } from '@/lib/database';

const GOAL = 2000;

function dayKey(daysAgo: number): string {
  return getLocalDateKey(addDays(new Date(), -daysAgo));
}
function noonIso(daysAgo: number): string {
  const d = addDays(new Date(), -daysAgo);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}
/** Seed a session row meeting the goal for a given days-ago. */
function seedGoalSession(daysAgo: number, iu = GOAL) {
  return {
    started_at: noonIso(daysAgo),
    ended_at: noonIso(daysAgo),
    uv_index: 5,
    duration_seconds: 600,
    iu_gained: iu,
    clothing_preset_id: 'tshirt',
    exposure_percent: 40,
    notes: null,
    created_at: noonIso(daysAgo),
    source: 'manual' as const,
    synced_at: null,
  };
}

function baseState(overrides: Partial<StreakState> = {}): StreakState {
  return {
    currentStreak: 0,
    longestStreak: 0,
    lastQualifyingDate: null,
    lastStreakDeathDate: null,
    lastStreakDeathLength: 0,
    streakRevivalNotifFired: false,
    lastRevivalNotifDate: null,
    milestonesAchieved: [],
    ...overrides,
  };
}

describe('streaksRepository.recomputeAndPersistStreak', () => {
  beforeEach(() => resetBackend());

  it('starts a streak when the first goal-meeting session is logged today', async () => {
    getFakeDb().reset({ bask_sessions: [seedGoalSession(0)] });

    const result = await streaksRepository.recomputeAndPersistStreak(GOAL, 'log');

    expect(result.summary.currentStreak).toBe(1);
    expect(result.summary.hitToday).toBe(true);
    expect(result.events.streakStarted).toBe(true);
    expect(result.state.currentStreak).toBe(1);
    expect(result.state.lastQualifyingDate).toBe(dayKey(0));
  });

  it('continues a streak and detects a new milestone (3 days)', async () => {
    getFakeDb().reset({
      bask_sessions: [seedGoalSession(0), seedGoalSession(1), seedGoalSession(2)],
    });
    await streakStateRepository.save(baseState({ currentStreak: 2, lastQualifyingDate: dayKey(1) }));

    const result = await streaksRepository.recomputeAndPersistStreak(GOAL, 'log');

    expect(result.summary.currentStreak).toBe(3);
    expect(result.events.milestoneReached).toBe(3);
    expect(result.state.milestonesAchieved).toContain(3);
  });

  it('does not repeat an already-achieved milestone', async () => {
    getFakeDb().reset({
      bask_sessions: [seedGoalSession(0), seedGoalSession(1), seedGoalSession(2)],
    });
    await streakStateRepository.save(
      baseState({ currentStreak: 2, lastQualifyingDate: dayKey(1), milestonesAchieved: [3] }),
    );

    const result = await streaksRepository.recomputeAndPersistStreak(GOAL, 'log');

    expect(result.summary.currentStreak).toBe(3);
    expect(result.events.milestoneReached).toBeNull();
    expect(result.state.milestonesAchieved).toEqual([3]);
  });

  it('detects streak death after the grace day is missed', async () => {
    // Previously alive (5-day streak), last qualifying 3 days ago, no recent sessions.
    await streakStateRepository.save(
      baseState({ currentStreak: 5, longestStreak: 5, lastQualifyingDate: dayKey(3) }),
    );

    const result = await streaksRepository.recomputeAndPersistStreak(GOAL, 'app_open');

    expect(result.summary.currentStreak).toBe(0);
    expect(result.events.streakDied).toBe(true);
    // Death date = lastQualifying + 2 days
    expect(result.state.lastStreakDeathDate).toBe(dayKey(1));
    expect(result.state.lastStreakDeathLength).toBe(5);
    expect(result.state.streakRevivalNotifFired).toBe(false);
  });

  it('keeps the streak alive via the grace day (yesterday met, nothing today)', async () => {
    getFakeDb().reset({ bask_sessions: [seedGoalSession(1)] });
    await streakStateRepository.save(baseState({ currentStreak: 1, lastQualifyingDate: dayKey(1) }));

    const result = await streaksRepository.recomputeAndPersistStreak(GOAL, 'app_open');

    // Grace: yesterday counts, streak survives at 1, no death.
    expect(result.summary.currentStreak).toBe(1);
    expect(result.summary.hitToday).toBe(false);
    expect(result.events.streakDied).toBe(false);
    expect(result.state.lastStreakDeathDate).toBeNull();
  });

  it('flags lowGoalStreak when the goal is below 500 IU', async () => {
    getFakeDb().reset({ bask_sessions: [seedGoalSession(0, 400)] });

    const result = await streaksRepository.recomputeAndPersistStreak(400, 'log');

    expect(result.events.lowGoalStreak).toBe(true);
  });

  it('does not double-record death on a second recompute after the break', async () => {
    await streakStateRepository.save(
      baseState({ currentStreak: 5, longestStreak: 5, lastQualifyingDate: dayKey(3) }),
    );

    const first = await streaksRepository.recomputeAndPersistStreak(GOAL, 'app_open');
    expect(first.events.streakDied).toBe(true);

    const second = await streaksRepository.recomputeAndPersistStreak(GOAL, 'app_open');
    // Already recorded this death date — must not fire again.
    expect(second.events.streakDied).toBe(false);
  });

  it('longestStreak never decreases across recomputes', async () => {
    getFakeDb().reset({
      bask_sessions: [seedGoalSession(0), seedGoalSession(1), seedGoalSession(2)],
    });
    await streakStateRepository.save(baseState({ longestStreak: 10 }));

    const result = await streaksRepository.recomputeAndPersistStreak(GOAL, 'log');

    expect(result.state.longestStreak).toBe(10);
  });
});

describe('streaksRepository.getGoalStreakSummary', () => {
  beforeEach(() => resetBackend());

  it('reports hitToday and remaining IU from seeded sessions', async () => {
    getFakeDb().reset({ bask_sessions: [{ ...seedGoalSession(0), iu_gained: 800 }] });

    const summary = await streaksRepository.getGoalStreakSummary(GOAL);

    expect(summary.hitToday).toBe(false); // 800 < 2000
    expect(summary.todayTotalIU).toBe(800);
    expect(summary.remainingTodayIU).toBe(1200);
    expect(summary.currentStreak).toBe(0);
  });

  it('counts a multi-day streak when consecutive days meet the goal', async () => {
    getFakeDb().reset({
      bask_sessions: [seedGoalSession(0), seedGoalSession(1), seedGoalSession(2), seedGoalSession(3)],
    });

    const summary = await streaksRepository.getGoalStreakSummary(GOAL);

    expect(summary.currentStreak).toBe(4);
    expect(summary.hitToday).toBe(true);
  });
});
