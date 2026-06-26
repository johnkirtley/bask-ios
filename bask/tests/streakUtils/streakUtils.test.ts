import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  startOfLocalDay,
  endOfLocalDay,
  addDays,
  getLocalDateKey,
  daysBetweenLocalDateKeys,
  getNextMilestone,
  isStreakAtRiskDisplayTime,
  isValidMilestone,
  STREAK_MILESTONES,
  STREAK_AT_RISK_START_HOUR,
} from '../../lib/streakUtils';

describe('startOfLocalDay', () => {
  it('zeroes the time to midnight', () => {
    const noon = new Date('2024-06-15T12:30:45.123');
    const midnight = startOfLocalDay(noon);
    expect(midnight.getHours()).toBe(0);
    expect(midnight.getMinutes()).toBe(0);
    expect(midnight.getSeconds()).toBe(0);
    expect(midnight.getMilliseconds()).toBe(0);
  });

  it('preserves the date', () => {
    const d = new Date('2024-06-15T18:00:00');
    expect(startOfLocalDay(d).getDate()).toBe(15);
    expect(startOfLocalDay(d).getMonth()).toBe(5);
    expect(startOfLocalDay(d).getFullYear()).toBe(2024);
  });

  it('does not mutate the original date', () => {
    const original = new Date('2024-06-15T12:00:00');
    const originalHours = original.getHours();
    startOfLocalDay(original);
    expect(original.getHours()).toBe(originalHours);
  });
});

describe('endOfLocalDay', () => {
  it('sets time to 23:59:59.999', () => {
    const noon = new Date('2024-06-15T12:00:00');
    const end = endOfLocalDay(noon);
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
    expect(end.getSeconds()).toBe(59);
    expect(end.getMilliseconds()).toBe(999);
  });
});

describe('addDays', () => {
  it('adds positive days', () => {
    const d = new Date('2024-06-15T10:00:00');
    const result = addDays(d, 5);
    expect(result.getDate()).toBe(20);
  });

  it('handles negative days (subtracts)', () => {
    const d = new Date('2024-06-15T10:00:00');
    const result = addDays(d, -3);
    expect(result.getDate()).toBe(12);
  });

  it('handles month boundaries', () => {
    const d = new Date('2024-06-30T10:00:00');
    const result = addDays(d, 1);
    expect(result.getDate()).toBe(1);
    expect(result.getMonth()).toBe(6);
  });

  it('handles zero days (returns same date)', () => {
    const d = new Date('2024-06-15T10:00:00');
    const result = addDays(d, 0);
    expect(result.getDate()).toBe(15);
  });

  it('preserves time of day', () => {
    const d = new Date('2024-06-15T14:30:00');
    const result = addDays(d, 7);
    expect(result.getHours()).toBe(14);
    expect(result.getMinutes()).toBe(30);
  });
});

describe('getLocalDateKey', () => {
  it('formats as YYYY-MM-DD', () => {
    const d = new Date(2024, 5, 15);
    expect(getLocalDateKey(d)).toBe('2024-06-15');
  });

  it('pads single-digit months and days', () => {
    const d = new Date(2024, 0, 5);
    expect(getLocalDateKey(d)).toBe('2024-01-05');
  });

  it('handles December 31st', () => {
    const d = new Date(2024, 11, 31);
    expect(getLocalDateKey(d)).toBe('2024-12-31');
  });
});

describe('daysBetweenLocalDateKeys', () => {
  it('returns 0 for the same date', () => {
    expect(daysBetweenLocalDateKeys('2024-06-15', '2024-06-15')).toBe(0);
  });

  it('returns positive for a date after the reference', () => {
    expect(daysBetweenLocalDateKeys('2024-06-16', '2024-06-15')).toBe(1);
    expect(daysBetweenLocalDateKeys('2024-06-20', '2024-06-15')).toBe(5);
  });

  it('returns negative for a date before the reference', () => {
    expect(daysBetweenLocalDateKeys('2024-06-14', '2024-06-15')).toBe(-1);
    expect(daysBetweenLocalDateKeys('2024-06-10', '2024-06-15')).toBe(-5);
  });

  it('handles month boundaries', () => {
    expect(daysBetweenLocalDateKeys('2024-07-01', '2024-06-30')).toBe(1);
  });

  it('handles year boundaries', () => {
    expect(daysBetweenLocalDateKeys('2025-01-01', '2024-12-31')).toBe(1);
  });
});

describe('getNextMilestone', () => {
  it('returns 3 for streak 0', () => {
    expect(getNextMilestone(0)).toBe(3);
  });

  it('returns 7 for streak 3 (at the milestone)', () => {
    expect(getNextMilestone(3)).toBe(7);
  });

  it('returns 7 for streak 5', () => {
    expect(getNextMilestone(5)).toBe(7);
  });

  it('returns 14 for streak 7', () => {
    expect(getNextMilestone(7)).toBe(14);
  });

  it('returns 30 for streak 14', () => {
    expect(getNextMilestone(14)).toBe(30);
  });

  it('returns 365 for streak 100', () => {
    expect(getNextMilestone(100)).toBe(365);
  });

  it('returns currentStreak + 100 when past all milestones', () => {
    expect(getNextMilestone(400)).toBe(500);
    expect(getNextMilestone(365)).toBe(465);
  });
});

describe('isStreakAtRiskDisplayTime', () => {
  afterEach(() => vi.useRealTimers());

  it('returns false before the start hour', () => {
    const early = new Date();
    early.setHours(STREAK_AT_RISK_START_HOUR - 1, 0, 0, 0);
    vi.useFakeTimers();
    vi.setSystemTime(early);
    expect(isStreakAtRiskDisplayTime()).toBe(false);
  });

  it('returns true at the start hour', () => {
    const atStart = new Date();
    atStart.setHours(STREAK_AT_RISK_START_HOUR, 0, 0, 0);
    vi.useFakeTimers();
    vi.setSystemTime(atStart);
    expect(isStreakAtRiskDisplayTime()).toBe(true);
  });

  it('returns true after the start hour', () => {
    const late = new Date();
    late.setHours(22, 0, 0, 0);
    vi.useFakeTimers();
    vi.setSystemTime(late);
    expect(isStreakAtRiskDisplayTime()).toBe(true);
  });
});

describe('isValidMilestone', () => {
  it('returns true for valid milestones', () => {
    for (const m of STREAK_MILESTONES) {
      expect(isValidMilestone(m)).toBe(true);
    }
  });

  it('returns false for non-milestone values', () => {
    expect(isValidMilestone(0)).toBe(false);
    expect(isValidMilestone(1)).toBe(false);
    expect(isValidMilestone(2)).toBe(false);
    expect(isValidMilestone(5)).toBe(false);
    expect(isValidMilestone(50)).toBe(false);
    expect(isValidMilestone(200)).toBe(false);
  });
});
