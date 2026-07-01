// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';

import { userProfileRepository } from '@/lib/database/repositories/userProfileRepository';
import { streakStateRepository } from '@/lib/database/repositories/streakStateRepository';
import { getLocalDateKey } from '@/lib/streakUtils';
import { getFakeDb, resetBackend } from '../_setup/capacitorMocks';

describe('userProfileRepository', () => {
  beforeEach(() => {
    resetBackend();
    getFakeDb().reset({ bask_user_profile: [{ id: 1, fitzpatrick_type: 1, daily_goal: 1000 }] });
  });

  it('get returns null when no profile row exists', async () => {
    getFakeDb().reset();
    expect(await userProfileRepository.get()).toBeNull();
  });

  it('update writes only provided fields', async () => {
    await userProfileRepository.update({ fitzpatrick_type: 4, age: 35 });
    const profile = await userProfileRepository.get();
    expect(profile?.fitzpatrick_type).toBe(4);
    expect(profile?.age).toBe(35);
    expect(profile?.daily_goal).toBe(1000); // unchanged
  });

  it('setFitzpatrickType delegates to update', async () => {
    await userProfileRepository.setFitzpatrickType(3);
    expect((await userProfileRepository.get())?.fitzpatrick_type).toBe(3);
  });

  it('setDailyGoal writes the profile AND a goal snapshot for today', async () => {
    await userProfileRepository.setDailyGoal(2500);
    expect((await userProfileRepository.get())?.daily_goal).toBe(2500);

    const snaps = await streakStateRepository.getGoalSnapshots([getLocalDateKey(new Date())], 2000);
    expect(snaps.get(getLocalDateKey(new Date()))).toBe(2500);
  });

  it('clearBloodTest nulls blood-test fields', async () => {
    getFakeDb().reset({
      bask_user_profile: [
        { id: 1, blood_test_value: 45, blood_test_unit: 'ng/mL', blood_test_date: '2025-01-01', blood_test_source: 'lab' },
      ],
    });
    await userProfileRepository.clearBloodTest();
    const profile = await userProfileRepository.get();
    expect(profile?.blood_test_value).toBeNull();
    expect(profile?.blood_test_unit).toBeNull();
    expect(profile?.blood_test_date).toBeNull();
    expect(profile?.blood_test_source).toBeNull();
  });

  it('resetBiologicalFields restores onboarding defaults', async () => {
    getFakeDb().reset({
      bask_user_profile: [{ id: 1, fitzpatrick_type: 5, age: 50, weight: 80, weight_unit: 'kg', disclaimer_accepted_at: 'x' }],
    });
    await userProfileRepository.resetBiologicalFields();
    const profile = await userProfileRepository.get();
    expect(profile?.fitzpatrick_type).toBe(2);
    expect(profile?.age).toBeNull();
    expect(profile?.weight).toBeNull();
    expect(profile?.disclaimer_accepted_at).toBeNull();
  });
});
