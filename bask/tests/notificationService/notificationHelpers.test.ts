import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { hashForecastForNotifications, notificationService } from '../../lib/services/notificationService';
import type { OptimalWindow, SynthesisWindow } from '../../lib/dWindowForecast';

function makeSynthesis(dayLabel: 'Today' | 'Tomorrow' = 'Today'): SynthesisWindow {
  const start = new Date();
  start.setHours(10, 0, 0, 0);
  const end = new Date();
  end.setHours(18, 0, 0, 0);
  return {
    date: start.toISOString(),
    dayLabel,
    startTime: '10:00 AM',
    endTime: '6:00 PM',
    startsAt: start,
    endsAt: end,
  };
}

function makeWindow(dayLabel: 'Today' | 'Tomorrow' = 'Today'): OptimalWindow {
  const now = new Date();
  return {
    date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T12:00:00`,
    dayLabel,
    windowStartTime: '12:00 PM',
    windowEndTime: '3:00 PM',
    startTime: '12:00 PM',
    endTime: '12:30 PM',
    durationMinutes: 30,
    avgUvIndex: 8,
    effectiveUvIndex: 8,
    estimatedIU: 2000,
    reason: 'UV 8.0, clear skies',
    cloudCover: 0,
  };
}

beforeEach(() => {
  const early = new Date();
  early.setHours(6, 0, 0, 0);
  vi.useFakeTimers();
  vi.setSystemTime(early);
});

afterEach(() => vi.useRealTimers());

describe('hashForecastForNotifications', () => {
  it('returns "null" for null forecast', () => {
    expect(hashForecastForNotifications(null)).toBe('null');
  });

  it('produces a stable hash for the same forecast', () => {
    const forecast = {
      today: makeWindow(),
      tomorrow: null,
      todaySynthesis: makeSynthesis(),
      tomorrowSynthesis: null,
      todayCloudBlocked: null,
      tomorrowCloudBlocked: null,
      efficiency: 'excellent' as const,
      recommendations: [],
    };
    const hash1 = hashForecastForNotifications(forecast);
    const hash2 = hashForecastForNotifications({ ...forecast });
    expect(hash1).toBe(hash2);
  });

  it('produces different hashes for different windows', () => {
    const f1 = {
      today: makeWindow(),
      tomorrow: null,
      todaySynthesis: null,
      tomorrowSynthesis: null,
      todayCloudBlocked: null,
      tomorrowCloudBlocked: null,
      efficiency: 'excellent' as const,
      recommendations: [],
    };
    const f2 = {
      ...f1,
      today: { ...makeWindow(), startTime: '1:00 PM', endTime: '1:30 PM' },
    };
    expect(hashForecastForNotifications(f1)).not.toBe(hashForecastForNotifications(f2));
  });
});

describe('notificationService.createCloudBlockedNotification', () => {
  it('creates a notification with cloud-blocked messaging', () => {
    const band = makeSynthesis();
    const result = notificationService.createCloudBlockedNotification(band, 1007, 10);
    expect(result).not.toBeNull();
    expect(result!.title).toContain('Clouds');
    expect(result!.body.toLowerCase()).toContain('vitamin d');
    expect(result!.extra.type).toBe('cloud_blocked');
  });

  it('returns null if the notification time would be in the past', () => {
    const band = makeSynthesis();
    band.startsAt = new Date();
    band.startsAt.setHours(6, 5, 0, 0);
    const result = notificationService.createCloudBlockedNotification(band, 1007, 10);
    expect(result).toBeNull();
  });

  it('includes the band start/end times in extra', () => {
    const band = makeSynthesis();
    const result = notificationService.createCloudBlockedNotification(band, 1007, 20);
    expect(result!.extra.bandStart).toBe(band.startTime);
    expect(result!.extra.bandEnd).toBe(band.endTime);
  });

  it('uses "tomorrow" dayRef for Tomorrow label', () => {
    const band = makeSynthesis('Tomorrow');
    const result = notificationService.createCloudBlockedNotification(band, 1008, 10);
    expect(result!.extra.dayRef).toBe('tomorrow');
  });
});

describe('notificationService.createWindowNotification', () => {
  it('creates a notification with window messaging', () => {
    const win = makeWindow();
    const result = notificationService.createWindowNotification(win, 1001, 10);
    expect(result).not.toBeNull();
    expect(result!.title).toContain('Vitamin D');
    expect(result!.body).toContain(win.startTime);
    expect(result!.extra.estimatedIU).toBe(2000);
  });

  it('returns null if the window start time is invalid', () => {
    const win = makeWindow();
    win.startTime = 'invalid time';
    const result = notificationService.createWindowNotification(win, 1001, 10);
    expect(result).toBeNull();
  });
});

describe('notificationService.createSynthesisStartNotification', () => {
  it('creates notification with optimal window info when available', () => {
    const synthesis = makeSynthesis();
    const optimal = makeWindow();
    const result = notificationService.createSynthesisStartNotification(synthesis, optimal, 1003);
    expect(result).not.toBeNull();
    expect(result!.body).toContain(optimal.startTime);
  });

  it('creates notification without optimal window info', () => {
    const synthesis = makeSynthesis();
    const result = notificationService.createSynthesisStartNotification(synthesis, null, 1003);
    expect(result).not.toBeNull();
    expect(result!.body).toContain(synthesis.endTime);
  });

  it('returns null if synthesis start is in the past', () => {
    const synthesis = makeSynthesis();
    synthesis.startsAt = new Date();
    synthesis.startsAt.setHours(5, 0, 0, 0);
    const result = notificationService.createSynthesisStartNotification(synthesis, null, 1003);
    expect(result).toBeNull();
  });
});

describe('notificationService.createSynthesisEndingNotification', () => {
  it('creates "D-window closing" notification without streak', () => {
    const synthesis = makeSynthesis();
    const result = notificationService.createSynthesisEndingNotification(synthesis, 1005, 10, null);
    expect(result).not.toBeNull();
    expect(result!.title).toBe('D-window closing');
    expect(result!.body).toContain('10 min');
  });

  it('creates "streak on the line" notification when streak >= 3', () => {
    const synthesis = makeSynthesis();
    const result = notificationService.createSynthesisEndingNotification(synthesis, 1005, 10, {
      currentStreak: 5,
      hitToday: false,
    });
    expect(result!.title).toContain('streak');
    expect(result!.body).toContain('5-day streak');
  });

  it('uses "D-window closing" when streak < 3', () => {
    const synthesis = makeSynthesis();
    const result = notificationService.createSynthesisEndingNotification(synthesis, 1005, 10, {
      currentStreak: 2,
      hitToday: false,
    });
    expect(result!.title).toBe('D-window closing');
  });

  it('returns null when streak already hit today', () => {
    const synthesis = makeSynthesis();
    const result = notificationService.createSynthesisEndingNotification(synthesis, 1005, 10, {
      currentStreak: 7,
      hitToday: true,
    });
    expect(result).toBeNull();
  });

  it('returns null if the ending time is in the past', () => {
    const synthesis = makeSynthesis();
    synthesis.endsAt = new Date();
    synthesis.endsAt.setHours(5, 0, 0, 0);
    const result = notificationService.createSynthesisEndingNotification(synthesis, 1005, 10, null);
    expect(result).toBeNull();
  });
});
