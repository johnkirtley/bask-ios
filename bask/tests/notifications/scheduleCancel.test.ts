// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';

import { notificationService } from '@/lib/services/notificationService';
import { resetBackend, setNotificationPermission } from '../_setup/capacitorMocks';
import { getLocalNotificationsState } from '../_setup/localNotificationsMock';
import { makeForecast } from '../_setup/notificationFixtures';

describe('scheduleDWindowNotifications', () => {
  beforeEach(() => resetBackend());

  it('builds notifications from the forecast and schedules them', async () => {
    setNotificationPermission('granted');
    await notificationService.saveSettings({ enabled: true, leadTimeMinutes: 20 });

    await notificationService.scheduleDWindowNotifications(makeForecast());

    const ids = getLocalNotificationsState().scheduled.map((n) => n.id);
    // tomorrow optimal window (1002) + tomorrow synthesis start (1004) + ending (1006)
    expect(ids).toContain(1002);
    expect(ids).toContain(1004);
  });

  it('cancels and skips scheduling when settings are disabled', async () => {
    setNotificationPermission('granted');
    await notificationService.saveSettings({ enabled: false, leadTimeMinutes: 20 });

    await notificationService.scheduleDWindowNotifications(makeForecast());

    expect(getLocalNotificationsState().scheduled).toHaveLength(0);
    expect(getLocalNotificationsState().cancelled.length).toBeGreaterThan(0);
  });

  it('cancels when permission is not granted', async () => {
    setNotificationPermission('denied');
    await notificationService.saveSettings({ enabled: true, leadTimeMinutes: 20 });

    await notificationService.scheduleDWindowNotifications(makeForecast());

    expect(getLocalNotificationsState().scheduled).toHaveLength(0);
  });
});

describe('cancelDWindowNotifications', () => {
  beforeEach(() => resetBackend());

  it('cancels all 8 D-window notification ids', async () => {
    await notificationService.cancelDWindowNotifications();
    const cancelled = getLocalNotificationsState().cancelled.map((c) => c.id).sort((a, b) => a - b);
    expect(cancelled).toEqual([1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008]);
  });
});
