// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';

import { notificationService } from '@/lib/services/notificationService';
import { streakStateRepository, type StreakState } from '@/lib/database/repositories/streakStateRepository';
import { getLocalDateKey } from '@/lib/streakUtils';
import { resetBackend, setNotificationPermission } from '../_setup/capacitorMocks';
import { getLocalNotificationsState } from '../_setup/localNotificationsMock';

function state(overrides: Partial<StreakState> = {}): StreakState {
  return {
    currentStreak: 0,
    longestStreak: 0,
    lastQualifyingDate: null,
    lastStreakDeathDate: getLocalDateKey(new Date()), // today -> revival schedules tomorrow 9am (future)
    lastStreakDeathLength: 5,
    streakRevivalNotifFired: false,
    lastRevivalNotifDate: null,
    milestonesAchieved: [],
    ...overrides,
  };
}

describe('scheduleStreakRevivalNotification', () => {
  beforeEach(() => resetBackend());

  it('schedules a revival notification and patches state when eligible', async () => {
    setNotificationPermission('granted');
    await notificationService.saveSettings({ enabled: true, leadTimeMinutes: 20 });
    await streakStateRepository.save(state());

    await notificationService.scheduleStreakRevivalNotification(await streakStateRepository.get());

    expect(getLocalNotificationsState().scheduled).toHaveLength(1);
    const scheduled = getLocalNotificationsState().scheduled[0];
    expect(scheduled.extra?.type).toBe('streak_revival');

    const after = await streakStateRepository.get();
    expect(after.streakRevivalNotifFired).toBe(true);
    expect(after.lastRevivalNotifDate).not.toBeNull();
  });

  it('skips when death length is under 3 days', async () => {
    setNotificationPermission('granted');
    await notificationService.saveSettings({ enabled: true, leadTimeMinutes: 20 });
    await streakStateRepository.save(state({ lastStreakDeathLength: 2 }));

    await notificationService.scheduleStreakRevivalNotification(await streakStateRepository.get());

    expect(getLocalNotificationsState().scheduled).toHaveLength(0);
  });

  it('skips when already fired', async () => {
    setNotificationPermission('granted');
    await notificationService.saveSettings({ enabled: true, leadTimeMinutes: 20 });
    await streakStateRepository.save(state({ streakRevivalNotifFired: true }));

    await notificationService.scheduleStreakRevivalNotification(await streakStateRepository.get());

    expect(getLocalNotificationsState().scheduled).toHaveLength(0);
  });

  it('skips when a revival notification was fired within the last 7 days', async () => {
    setNotificationPermission('granted');
    await notificationService.saveSettings({ enabled: true, leadTimeMinutes: 20 });
    await streakStateRepository.save(state({ streakRevivalNotifFired: false, lastRevivalNotifDate: getLocalDateKey(new Date()) }));

    await notificationService.scheduleStreakRevivalNotification(await streakStateRepository.get());

    expect(getLocalNotificationsState().scheduled).toHaveLength(0);
  });

  it('skips when notifications are disabled', async () => {
    setNotificationPermission('granted');
    await notificationService.saveSettings({ enabled: false, leadTimeMinutes: 20 });
    await streakStateRepository.save(state());

    await notificationService.scheduleStreakRevivalNotification(await streakStateRepository.get());

    expect(getLocalNotificationsState().scheduled).toHaveLength(0);
  });
});
