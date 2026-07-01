// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { resetRepository } from '@/lib/database/repositories/resetRepository';
import { leaderboardService } from '@/lib/supabase/leaderboardService';
import { getFakeDb, resetBackend } from '../_setup/capacitorMocks';
import { getLocalNotificationsState } from '../_setup/localNotificationsMock';

function seededDb() {
  return {
    bask_sessions: [{ id: 1, started_at: '2025-01-01T00:00:00.000Z', source: 'manual', iu_gained: 100 }],
    bask_supplements: [{ id: 1, dosage_iu: 500, logged_at: '2025-01-01T00:00:00.000Z' }],
    bask_cofactors: [{ id: 1, cofactor_type: 'magnesium', logged_at: '2025-01-01T00:00:00.000Z' }],
    bask_lab_results: [{ id: 1, value_ng_ml: 30, test_date: '2025-01-01' }],
    settings: [{ key: 'foo', value: 'bar' }],
    bask_user_profile: [{ id: 1, fitzpatrick_type: 4, daily_goal: 5000, age: 40 }],
    bask_streak_state: [{ id: 1, current_streak: 9, longest_streak: 9 }],
    bask_daily_goal_snapshots: [{ date_key: '2025-01-01', goal_iu: 2000 }],
  };
}

describe('resetRepository.deleteAllUserData', () => {
  beforeEach(() => {
    resetBackend();
    localStorage.clear();
  });

  it('clears every user-data table and resets profile to defaults', async () => {
    getFakeDb().reset(seededDb());
    localStorage.setItem('keep-me', 'nope');

    await resetRepository.deleteAllUserData();

    const db = getFakeDb();
    expect(db.getTable('bask_sessions')).toHaveLength(0);
    expect(db.getTable('bask_supplements')).toHaveLength(0);
    expect(db.getTable('bask_cofactors')).toHaveLength(0);
    expect(db.getTable('bask_lab_results')).toHaveLength(0);
    expect(db.getTable('settings')).toHaveLength(0);
    expect(db.getTable('bask_daily_goal_snapshots')).toHaveLength(0);

    const profile = db.getTable('bask_user_profile')[0];
    expect(profile.fitzpatrick_type).toBe(2);
    expect(profile.daily_goal).toBe(2000); // DEFAULT_DAILY_GOAL_IU
    expect(profile.age).toBeNull();

    // streak state table is reset (single default row)
    const streak = db.getTable('bask_streak_state');
    expect(streak).toHaveLength(1);
    expect(streak[0].id).toBe(1);

    expect(localStorage.getItem('keep-me')).toBeNull();
  });

  it('cancels D-window notifications and deletes server leaderboard data', async () => {
    getFakeDb().reset(seededDb());

    await resetRepository.deleteAllUserData();

    const notifState = getLocalNotificationsState();
    expect(notifState.cancelled.length).toBeGreaterThan(0);
    expect(leaderboardService.deleteLeaderboardData).toHaveBeenCalled();
  });

  it('completes even when leaderboard deletion fails (non-fatal)', async () => {
    getFakeDb().reset(seededDb());
    vi.mocked(leaderboardService.deleteLeaderboardData).mockRejectedValueOnce(new Error('network down'));

    await expect(resetRepository.deleteAllUserData()).resolves.toBeUndefined();

    // local data still cleared despite server failure
    expect(getFakeDb().getTable('bask_sessions')).toHaveLength(0);
  });
});
