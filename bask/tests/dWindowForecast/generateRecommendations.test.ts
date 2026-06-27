import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { calculateOptimalWindows } from '../../lib/dWindowForecast';
import type { Recommendation } from '../../lib/dWindowForecast';
import type { HourlyForecastItem } from '../../lib/plugins/baskWeather';
import { buildDay } from '../fixtures/hourlyForecasts';
import {
  makeClearSummerDay,
  makeOvercastAllDay,
  makeWinterLowUVDay,
  makeUvExactlyAt5,
  makeClearNowCloudyLater,
  makeTomorrow,
} from '../fixtures/namedScenarios';

function pinTime(hour: number): void {
  const pinned = new Date();
  pinned.setHours(hour, 0, 0, 0);
  vi.useFakeTimers();
  vi.setSystemTime(pinned);
}

beforeEach(() => {
  pinTime(6);
});

afterEach(() => {
  vi.useRealTimers();
});

function headlines(recs: Recommendation[]): string[] {
  return recs.map((r) => r.content.headline);
}

function buildTwoDayForecast(today: HourlyForecastItem[], tomorrow?: HourlyForecastItem[]): HourlyForecastItem[] {
  const tom = tomorrow ?? makeClearSummerDay({ date: makeTomorrow() });
  return [...today, ...tom];
}

function buildSameScenarioTwoDay(makeDay: (opts?: { date?: Date }) => HourlyForecastItem[]): HourlyForecastItem[] {
  return [...makeDay(), ...makeDay({ date: makeTomorrow() })];
}

describe('generateRecommendations (via calculateOptimalWindows)', () => {
  describe('"Perfect sun right now!"', () => {
    it('does NOT appear when UV is high but user is outside the window (e.g., 6 AM)', () => {
      pinTime(6);
      const forecast = buildSameScenarioTwoDay(makeClearSummerDay);
      const result = calculateOptimalWindows(forecast, 2, 50, 2000, null);
      expect(headlines(result.recommendations)).not.toContain('Perfect sun right now!');
    });
  });

  describe('"Good UV today from {time}"', () => {
    it('appears when today window exists with effective UV >= 3 (but < 5 or not in window)', () => {
      pinTime(6);
      const forecast = buildSameScenarioTwoDay(makeClearSummerDay);
      const result = calculateOptimalWindows(forecast, 2, 50, 2000, null);
      expect(headlines(result.recommendations).some((h) => h.startsWith('Good UV today from'))).toBe(true);
    });
  });

  describe('"Tomorrow looks excellent!"', () => {
    it('appears when tomorrow has effective UV >= 5', () => {
      const today = makeWinterLowUVDay();
      const tomorrow = makeClearSummerDay({ date: makeTomorrow() });
      const forecast = [...today, ...tomorrow];
      const result = calculateOptimalWindows(forecast, 2, 50, 2000, null);
      expect(headlines(result.recommendations)).toContain('Tomorrow looks excellent!');
    });
  });

  describe('"Tomorrow: {start}-{end}"', () => {
    it('appears when tomorrow has effective UV >= 3 but < 5', () => {
      const today = makeWinterLowUVDay();
      const tomorrow = buildDay({
        date: makeTomorrow(),
        uvAt: (hour) => (hour >= 10 && hour <= 15 ? 4 : 0),
        cloudAt: () => 0,
      });
      const forecast = [...today, ...tomorrow];
      const result = calculateOptimalWindows(forecast, 2, 50, 2000, null);
      expect(headlines(result.recommendations).some((h) => h.startsWith('Tomorrow:'))).toBe(true);
    });
  });

  describe('"UV too weak for vitamin D synthesis"', () => {
    it('appears when all UV is below 3 (winter day, both days)', () => {
      const forecast = buildSameScenarioTwoDay(makeWinterLowUVDay);
      const result = calculateOptimalWindows(forecast, 2, 50, 2000, null);
      expect(headlines(result.recommendations)).toContain('UV too weak for vitamin D synthesis');
    });

    it('appears when clouds block all synthesis (overcast both days)', () => {
      const forecast = buildSameScenarioTwoDay(makeOvercastAllDay);
      const result = calculateOptimalWindows(forecast, 2, 50, 2000, null);
      expect(headlines(result.recommendations)).toContain('UV too weak for vitamin D synthesis');
    });
  });

  describe('"More skin exposure could make today viable"', () => {
    it('appears when UV is available but current low exposure prevents viable IU', () => {
      const today = buildDay({
        uvAt: (hour) => (hour >= 10 && hour <= 14 ? 4 : 0),
        cloudAt: () => 0,
      });
      const tomorrow = buildDay({
        date: makeTomorrow(),
        uvAt: (hour) => (hour >= 10 && hour <= 14 ? 4 : 0),
        cloudAt: () => 0,
      });
      const forecast = [...today, ...tomorrow];
      const result = calculateOptimalWindows(forecast, 6, 2, 2000, null);
      const hs = headlines(result.recommendations);
      expect(hs).toContain('More skin exposure could make today viable');
    });
  });

  describe('recommendation ordering and priority', () => {
    it('recommendations are sorted by priority (0 = highest)', () => {
      const forecast = buildSameScenarioTwoDay(makeClearSummerDay);
      const result = calculateOptimalWindows(forecast, 2, 50, 2000, null);
      const priorities = result.recommendations.map((r) => r.priority);
      const sorted = [...priorities].sort((a, b) => a - b);
      expect(priorities).toEqual(sorted);
    });
  });

  describe('no false cloud-blocking messages on clear days', () => {
    it('never shows "clouds-blocking" reason on a fully clear day', () => {
      const forecast = buildSameScenarioTwoDay(makeClearSummerDay);
      const result = calculateOptimalWindows(forecast, 2, 50, 2000, null);
      expect(result.todayNoWindowReason).not.toBe('clouds-blocking');
      expect(result.tomorrowNoWindowReason).not.toBe('clouds-blocking');
      expect(result.noWindowReason).not.toBe('clouds-blocking');
    });

    it('never shows "clouds-blocking" reason when current is clear but later is cloudy', () => {
      pinTime(8);
      const today = makeClearNowCloudyLater();
      const tomorrow = makeClearSummerDay({ date: makeTomorrow() });
      const forecast = [...today, ...tomorrow];
      const result = calculateOptimalWindows(forecast, 2, 50, 2000, null);
      expect(result.todayNoWindowReason).not.toBe('clouds-blocking');
    });
  });
});
