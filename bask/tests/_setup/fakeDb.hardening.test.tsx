// @vitest-environment jsdom
/**
 * Verifies the fake DB handles the tricky SQL the repos actually emit:
 * datetime('now') literals in VALUES + SET, ON CONFLICT upserts, OR IGNORE,
 * NULL literals, IN clauses, and all-literal UPDATEs (WHERE id = 1).
 */
import { describe, it, expect, beforeEach } from 'vitest';

import { settingsRepository } from '@/lib/database/repositories/settingsRepository';
import { streakStateRepository } from '@/lib/database/repositories/streakStateRepository';
import { userProfileRepository } from '@/lib/database/repositories/userProfileRepository';
import { getFakeDb, resetBackend } from '../_setup/capacitorMocks';

describe('fake DB handles real-repo SQL', () => {
  beforeEach(() => resetBackend());

  it('settings upsert via ON CONFLICT + datetime literal (round-trip)', async () => {
    await settingsRepository.set('foo', 'bar');
    await settingsRepository.set('foo', 'baz'); // update path
    expect(await settingsRepository.get('foo')).toBe('baz');

    await settingsRepository.setMultiple({ a: '1', b: '2' });
    expect(await settingsRepository.get('a')).toBe('1');
    expect(await settingsRepository.get('b')).toBe('2');
    expect((await settingsRepository.getAll()).foo).toBe('baz');
  });

  it('streakState save (datetime + ON CONFLICT) round-trips through rowToState', async () => {
    await streakStateRepository.save({
      currentStreak: 5,
      longestStreak: 9,
      lastQualifyingDate: '2025-01-01',
      lastStreakDeathDate: null,
      lastStreakDeathLength: 0,
      streakRevivalNotifFired: false,
      lastRevivalNotifDate: null,
      milestonesAchieved: [3, 7],
    });
    const loaded = await streakStateRepository.get();
    expect(loaded.currentStreak).toBe(5);
    expect(loaded.longestStreak).toBe(9);
    expect(loaded.lastQualifyingDate).toBe('2025-01-01');
    expect(loaded.milestonesAchieved).toEqual([3, 7]);

    // save again -> upsert (no duplicate row)
    await streakStateRepository.save({ ...loaded, currentStreak: 6 });
    const db = getFakeDb();
    expect(db.getTable('bask_streak_state')).toHaveLength(1);
    expect((await streakStateRepository.get()).currentStreak).toBe(6);
  });

  it('streakState.patch merges shallowly', async () => {
    await streakStateRepository.save({
      currentStreak: 2,
      longestStreak: 2,
      lastQualifyingDate: '2025-01-01',
      lastStreakDeathDate: null,
      lastStreakDeathLength: 0,
      streakRevivalNotifFired: false,
      lastRevivalNotifDate: null,
      milestonesAchieved: [],
    });
    const patched = await streakStateRepository.patch({ streakRevivalNotifFired: true });
    expect(patched.streakRevivalNotifFired).toBe(true);
    expect(patched.currentStreak).toBe(2); // unchanged
  });

  it('ensureGoalSnapshots (executeSet OR IGNORE) + getGoalSnapshots (IN clause)', async () => {
    await streakStateRepository.ensureGoalSnapshots(['2025-01-01', '2025-01-02'], 2000);
    const snaps = await streakStateRepository.getGoalSnapshots(['2025-01-01', '2025-01-02', '2025-01-03'], 2000);
    expect(snaps.get('2025-01-01')).toBe(2000);
    expect(snaps.get('2025-01-03')).toBe(2000); // fallback
    await streakStateRepository.upsertGoalSnapshot('2025-01-01', 3000);
    const after = await streakStateRepository.getGoalSnapshots(['2025-01-01'], 2000);
    expect(after.get('2025-01-01')).toBe(3000);
  });

  it('userProfile.update appends updated_at = datetime(now) and updates by id=1 (no params)', async () => {
    getFakeDb().reset({ bask_user_profile: [{ id: 1, fitzpatrick_type: 1, daily_goal: 1000 }] });
    await userProfileRepository.update({ fitzpatrick_type: 4, daily_goal: 2500 });
    const profile = await userProfileRepository.get();
    expect(profile?.fitzpatrick_type).toBe(4);
    expect(profile?.daily_goal).toBe(2500);
  });

  it('clearBloodTest sets blood fields to NULL (all-literal UPDATE)', async () => {
    getFakeDb().reset({
      bask_user_profile: [
        { id: 1, blood_test_value: 45, blood_test_unit: 'ng/mL', blood_test_date: '2025-01-01' },
      ],
    });
    await userProfileRepository.clearBloodTest();
    const profile = await userProfileRepository.get();
    expect(profile?.blood_test_value).toBeNull();
    expect(profile?.blood_test_unit).toBeNull();
  });
});
