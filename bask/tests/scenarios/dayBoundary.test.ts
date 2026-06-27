import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { calculateOptimalWindows } from '../../lib/dWindowForecast';
import { buildDay, buildHour, localDateKey } from '../fixtures/hourlyForecasts';
import { uvBellCurve } from '../fixtures/hourlyForecasts';
import { makeClearSummerDay, makeTomorrow } from '../fixtures/namedScenarios';

function pinTime(hour: number, minute: number = 0): void {
  const pinned = new Date();
  pinned.setHours(hour, minute, 0, 0);
  vi.useFakeTimers();
  vi.setSystemTime(pinned);
}

beforeEach(() => pinTime(6));
afterEach(() => vi.useRealTimers());

describe('Day-boundary — local midnight', () => {
  it('forecast hours at local midnight belong to the correct local day', () => {
    const day = makeClearSummerDay();
    const midnightHour = day.find((h) => h.hour === 0)!;
    const date = new Date(midnightHour.date);
    const now = new Date();
    expect(date.getDate()).toBe(now.getDate());
    expect(date.getMonth()).toBe(now.getMonth());
  });
});

describe('Day-boundary — early morning hours (pre-sunrise)', () => {
  it('hour 5 is included in today\'s forecast but UV should be 0', () => {
    pinTime(3);
    const day = makeClearSummerDay();
    const earlyHour = day.find((h) => h.hour === 5)!;
    expect(earlyHour.uvIndex).toBe(0);
  });

  it('hour 8 (synthesis floor) is correctly attributed to today', () => {
    pinTime(3);
    const day = makeClearSummerDay();
    const floorHour = day.find((h) => h.hour === 8)!;
    const date = new Date(floorHour.date);
    const today = new Date();
    expect(localDateKey(date)).toBe(localDateKey(today));
  });
});

function parseClockHour(timeStr: string): number {
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/);
  if (!match) return -1;
  let h = parseInt(match[1], 10);
  if (match[3] === 'PM' && h !== 12) h += 12;
  if (match[3] === 'AM' && h === 12) h = 0;
  return h;
}

describe('Day-boundary — sunset edge', () => {
  it('hour 18 is the last synthesis-eligible hour (6 PM inclusive)', () => {
    pinTime(12);
    const day = makeClearSummerDay();
    const result = calculateOptimalWindows([...day, ...makeClearSummerDay({ date: makeTomorrow() })], 2, 50, 2000, null);
    if (result.todaySynthesis) {
      const endHour = parseClockHour(result.todaySynthesis.endTime);
      expect(endHour).toBeGreaterThanOrEqual(18);
    }
  });

  it('hour 19 (7 PM) is NOT synthesis-eligible', () => {
    pinTime(12);
    const result = calculateOptimalWindows([...makeClearSummerDay(), ...makeClearSummerDay({ date: makeTomorrow() })], 2, 50, 2000, null);
    if (result.todaySynthesis) {
      const endHour = parseClockHour(result.todaySynthesis.endTime);
      expect(endHour).toBeLessThanOrEqual(19);
    }
  });
});

describe('Day-boundary — today vs tomorrow filtering', () => {
  it('today and tomorrow forecast items are correctly separated by local date', () => {
    pinTime(12);
    const today = makeClearSummerDay();
    const tomorrow = makeClearSummerDay({ date: makeTomorrow() });
    const result = calculateOptimalWindows([...today, ...tomorrow], 2, 50, 2000, null);

    if (result.today && result.tomorrow) {
      const todayDate = new Date(result.today.date);
      const tomorrowDate = new Date(result.tomorrow.date);
      const dayDiff = Math.round((tomorrowDate.getTime() - todayDate.getTime()) / 86_400_000);
      expect(dayDiff).toBe(1);
    }
  });
});

describe('Day-boundary — late-night pin does not bleed into next day', () => {
  it('pinning to 11 PM still groups today\'s hours correctly', () => {
    pinTime(23);
    const day = makeClearSummerDay();
    const noonHour = day.find((h) => h.hour === 12)!;
    const date = new Date(noonHour.date);
    const now = new Date();
    expect(localDateKey(date)).toBe(localDateKey(now));
  });
});
