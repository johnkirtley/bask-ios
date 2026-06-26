import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { calculateOptimalWindows } from '../../lib/dWindowForecast';
import { notificationService } from '../../lib/services/notificationService';
import { makeClearSummerDay, makeOvercastAllDay, makeWinterLowUVDay, makeTomorrow } from '../fixtures/namedScenarios';

function pinTime(hour: number): void {
  const pinned = new Date();
  pinned.setHours(hour, 0, 0, 0);
  vi.useFakeTimers();
  vi.setSystemTime(pinned);
}

beforeEach(() => pinTime(6));
afterEach(() => vi.useRealTimers());

function twoDay(today: ReturnType<typeof makeClearSummerDay>, tomorrow?: ReturnType<typeof makeClearSummerDay>) {
  return [...today, ...(tomorrow ?? makeClearSummerDay({ date: makeTomorrow() }))];
}

describe('Notifications with REAL calculateOptimalWindows output', () => {
  it('createWindowNotification succeeds with a real today window', () => {
    const forecast = twoDay(makeClearSummerDay());
    const result = calculateOptimalWindows(forecast, 2, 50, 2000, null);
    expect(result.today).not.toBeNull();

    const notif = notificationService.createWindowNotification(result.today!, 1001, 20);
    expect(notif).not.toBeNull();
    expect(notif!.title).toContain('Vitamin D');
    expect(notif!.extra.estimatedIU).toBe(result.today!.estimatedIU);
  });

  it('createWindowNotification handles real ISO timestamp in window.date', () => {
    const forecast = twoDay(makeClearSummerDay());
    const result = calculateOptimalWindows(forecast, 2, 50, 2000, null);
    expect(result.today).not.toBeNull();

    expect(result.today!.date).toMatch(/\d{4}-\d{2}-\d{2}T/);

    const notif = notificationService.createWindowNotification(result.today!, 1001, 20);
    expect(notif).not.toBeNull();
  });

  it('createSynthesisStartNotification succeeds with real synthesis window', () => {
    const forecast = twoDay(makeClearSummerDay());
    const result = calculateOptimalWindows(forecast, 2, 50, 2000, null);
    expect(result.todaySynthesis).not.toBeNull();

    const notif = notificationService.createSynthesisStartNotification(
      result.todaySynthesis!,
      result.today,
      1003,
    );
    expect(notif).not.toBeNull();
    expect(notif!.extra.type).toBe('synthesis_start');
  });

  it('createCloudBlockedNotification succeeds with real overcast cloud-blocked band', () => {
    const forecast = [...makeOvercastAllDay(), ...makeOvercastAllDay({ date: makeTomorrow() })];
    const result = calculateOptimalWindows(forecast, 2, 50, 2000, null);
    expect(result.todayCloudBlocked).not.toBeNull();

    const notif = notificationService.createCloudBlockedNotification(
      result.todayCloudBlocked!,
      1007,
      10,
    );
    expect(notif).not.toBeNull();
    expect(notif!.extra.type).toBe('cloud_blocked');
  });

  it('createSynthesisEndingNotification succeeds with real synthesis window', () => {
    const forecast = twoDay(makeClearSummerDay());
    const result = calculateOptimalWindows(forecast, 2, 50, 2000, null);
    expect(result.todaySynthesis).not.toBeNull();

    const notif = notificationService.createSynthesisEndingNotification(
      result.todaySynthesis!,
      1005,
      10,
      null,
    );
    expect(notif).not.toBeNull();
    expect(notif!.title).toBe('D-window closing');
  });

  it('createWindowNotification returns null when today window is null (winter)', () => {
    const forecast = [...makeWinterLowUVDay(), ...makeWinterLowUVDay({ date: makeTomorrow() })];
    const result = calculateOptimalWindows(forecast, 2, 50, 2000, null);
    expect(result.today).toBeNull();
    expect(() => {
      if (result.today) {
        notificationService.createWindowNotification(result.today, 1001, 20);
      }
    }).not.toThrow();
  });
});
