// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

import { notificationService } from '@/lib/services/notificationService';
import { useDWindowNotifications } from '@/hooks/useDWindowNotifications';
import type { GoalStreakSummary } from '@/lib/database';
import { resetBackend, setNative, setNotificationPermission } from '../_setup/capacitorMocks';
import { makeForecast } from '../_setup/notificationFixtures';

function makeSummary(overrides: Partial<GoalStreakSummary> = {}): GoalStreakSummary {
  return {
    currentStreak: 0,
    longestStreak: 0,
    hitToday: false,
    streakAtRisk: false,
    todayTotalIU: 0,
    todayGoalIU: 2000,
    remainingTodayIU: 2000,
    nextMilestone: 3,
    daysToNextMilestone: 3,
    recentDays: [],
    lastQualifyingDate: null,
    ...overrides,
  };
}

describe('useDWindowNotifications', () => {
  beforeEach(() => resetBackend());

  it('calls reconcile with the derived streak context', async () => {
    setNotificationPermission('granted');
    await notificationService.saveSettings({ enabled: true, leadTimeMinutes: 20 });
    const spy = vi.spyOn(notificationService, 'reconcileDWindowNotifications');

    renderHook(() =>
      useDWindowNotifications(makeForecast(), true, makeSummary({ currentStreak: 4, hitToday: true })),
    );

    expect(spy).toHaveBeenCalledWith({
      forecast: expect.any(Object),
      isPremium: true,
      streakContext: { currentStreak: 4, hitToday: true },
    });
    spy.mockRestore();
  });

  it('passes null streakContext when no summary is provided', async () => {
    const spy = vi.spyOn(notificationService, 'reconcileDWindowNotifications');
    renderHook(() => useDWindowNotifications(makeForecast(), true));
    expect(spy).toHaveBeenCalledWith({
      forecast: expect.any(Object),
      isPremium: true,
      streakContext: null,
    });
    spy.mockRestore();
  });

  it('is a no-op on non-native platforms', async () => {
    setNative(false);
    const spy = vi.spyOn(notificationService, 'reconcileDWindowNotifications');
    renderHook(() => useDWindowNotifications(makeForecast(), true));
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
    setNative(true);
  });
});
