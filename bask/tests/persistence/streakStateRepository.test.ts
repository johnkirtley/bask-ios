// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';

import {
  streakStateRepository,
  type StreakState,
} from '@/lib/database/repositories/streakStateRepository';
import { getFakeDb, resetBackend } from '../_setup/capacitorMocks';

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

describe('streakStateRepository', () => {
  beforeEach(() => resetBackend());

  it('get returns defaults when no row exists (INSERT OR IGNORE seed)', async () => {
    const state = await streakStateRepository.get();
    expect(state.currentStreak).toBe(0);
    expect(state.milestonesAchieved).toEqual([]);
  });

  it('save then get round-trips all fields', async () => {
    await streakStateRepository.save(
      baseState({
        currentStreak: 7,
        longestStreak: 14,
        lastQualifyingDate: '2025-01-01',
        milestonesAchieved: [3, 7],
        streakRevivalNotifFired: true,
      }),
    );
    const loaded = await streakStateRepository.get();
    expect(loaded.currentStreak).toBe(7);
    expect(loaded.longestStreak).toBe(14);
    expect(loaded.milestonesAchieved).toEqual([3, 7]);
    expect(loaded.streakRevivalNotifFired).toBe(true);
  });

  it('save is idempotent (upsert, no duplicate rows)', async () => {
    await streakStateRepository.save(baseState({ currentStreak: 1 }));
    await streakStateRepository.save(baseState({ currentStreak: 2 }));
    expect(getFakeDb().getTable('bask_streak_state')).toHaveLength(1);
  });

  it('patch shallow-merges onto the current state', async () => {
    await streakStateRepository.save(baseState({ currentStreak: 3, longestStreak: 3 }));
    const next = await streakStateRepository.patch({ streakRevivalNotifFired: true });
    expect(next.streakRevivalNotifFired).toBe(true);
    expect(next.currentStreak).toBe(3); // unchanged
  });

  it('recovers gracefully from a corrupt milestones blob', async () => {
    getFakeDb().reset({
      bask_streak_state: [
        { id: 1, current_streak: 2, milestones_achieved: 'not-json' },
      ],
    });
    const loaded = await streakStateRepository.get();
    expect(loaded.milestonesAchieved).toEqual([]);
  });

  it('recovers from milestones stored as a raw array', async () => {
    getFakeDb().reset({
      bask_streak_state: [
        { id: 1, current_streak: 2, milestones_achieved: [3, 7, 'bad', 14] },
      ],
    });
    const loaded = await streakStateRepository.get();
    expect(loaded.milestonesAchieved).toEqual([3, 7, 14]);
  });

  it('reset clears state + snapshots and reseeds the default row', async () => {
    await streakStateRepository.save(baseState({ currentStreak: 5, longestStreak: 5 }));
    getFakeDb().reset({
      bask_streak_state: [{ id: 1, current_streak: 5 }],
      bask_daily_goal_snapshots: [{ date_key: '2025-01-01', goal_iu: 2000 }],
    });

    await streakStateRepository.reset();

    expect(getFakeDb().getTable('bask_daily_goal_snapshots')).toHaveLength(0);
    const streak = getFakeDb().getTable('bask_streak_state');
    expect(streak).toHaveLength(1);
    expect(streak[0].id).toBe(1);
  });

  it('getGoalSnapshots falls back to the provided goal for unmapped dates', async () => {
    const snaps = await streakStateRepository.getGoalSnapshots(['2025-01-01', '2025-01-02'], 2000);
    expect(snaps.get('2025-01-01')).toBe(2000);
    expect(snaps.get('2025-01-02')).toBe(2000);
  });

  it('upsertGoalSnapshot ignores invalid (<=0) goals', async () => {
    await streakStateRepository.upsertGoalSnapshot('2025-01-01', 0);
    expect(getFakeDb().getTable('bask_daily_goal_snapshots')).toHaveLength(0);
  });
});
