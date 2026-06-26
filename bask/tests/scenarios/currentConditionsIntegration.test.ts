import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { calculateOptimalWindows } from '../../lib/dWindowForecast';
import { buildDay, uvBellCurve } from '../fixtures/hourlyForecasts';
import {
  makeClearSummerDay,
  makeOvercastAllDay,
  makeWinterLowUVDay,
  makeTomorrow,
} from '../fixtures/namedScenarios';

function pinTime(hour: number): void {
  const pinned = new Date();
  pinned.setHours(hour, 0, 0, 0);
  vi.useFakeTimers();
  vi.setSystemTime(pinned);
}

beforeEach(() => pinTime(12));
afterEach(() => vi.useRealTimers());

describe('Integrated current-conditions matrix', () => {
  describe('forecast cloudy, current clear', () => {
    it('current conditions override makes the current hour viable', () => {
      const overcast = makeOvercastAllDay();
      const tomorrow = makeOvercastAllDay({ date: makeTomorrow() });

      const result = calculateOptimalWindows([...overcast, ...tomorrow], 2, 50, 2000, null, {
        uvIndex: 9,
        cloudCover: 0.05,
      });

      expect(result.today).not.toBeNull();
      expect(result.today!.effectiveUvIndex).toBeGreaterThan(3);
    });

    it('does NOT show clouds-blocking (current hour is clear)', () => {
      const overcast = makeOvercastAllDay();
      const tomorrow = makeOvercastAllDay({ date: makeTomorrow() });

      const result = calculateOptimalWindows([...overcast, ...tomorrow], 2, 50, 2000, null, {
        uvIndex: 9,
        cloudCover: 0.05,
      });

      expect(result.todayNoWindowReason).not.toBe('clouds-blocking');
    });
  });

  describe('forecast clear, current cloudy', () => {
    it('current conditions override makes the current hour cloud-blocked', () => {
      const clear = makeClearSummerDay();
      const tomorrow = makeClearSummerDay({ date: makeTomorrow() });

      const result = calculateOptimalWindows([...clear, ...tomorrow], 2, 50, 2000, null, {
        uvIndex: 8,
        cloudCover: 0.95,
      });

      expect(result.today).not.toBeNull();
    });

    it('window still exists from non-current clear hours', () => {
      const clear = makeClearSummerDay();
      const tomorrow = makeClearSummerDay({ date: makeTomorrow() });

      const result = calculateOptimalWindows([...clear, ...tomorrow], 2, 50, 2000, null, {
        uvIndex: 8,
        cloudCover: 0.95,
      });

      expect(result.todayNoWindowReason).not.toBe('clouds-blocking');
    });
  });

  describe('forecast stale UV low, current UV high (rescue)', () => {
    it('live UV override rescues a forecasted-low day', () => {
      const winter = makeWinterLowUVDay();
      const tomorrow = makeClearSummerDay({ date: makeTomorrow() });

      const result = calculateOptimalWindows([...winter, ...tomorrow], 2, 50, 2000, null, {
        uvIndex: 8,
        cloudCover: 0.1,
      });

      expect(result.today).not.toBeNull();
      expect(result.today!.effectiveUvIndex).toBeGreaterThan(3);
    });
  });

  describe('forecast stale clear, current cloud-blocked', () => {
    it('live cloud override can block the only viable hour', () => {
      const today = buildDay({
        uvAt: (hour) => (hour === 12 ? 5 : 0),
        cloudAt: () => 0,
      });
      const tomorrow = makeClearSummerDay({ date: makeTomorrow() });

      const result = calculateOptimalWindows([...today, ...tomorrow], 2, 50, 2000, null, {
        uvIndex: 5,
        cloudCover: 0.95,
      });

      expect(result.today).toBeNull();
      expect(result.todayNoWindowReason).toBe('clouds-blocking');
    });
  });

  describe('no current conditions (null) — forecast-only', () => {
    it('uses forecast as-is without override', () => {
      const clear = makeClearSummerDay();
      const tomorrow = makeClearSummerDay({ date: makeTomorrow() });

      const withOverride = calculateOptimalWindows([...clear, ...tomorrow], 2, 50, 2000, null, {
        uvIndex: 0,
        cloudCover: 1.0,
      });
      const withoutOverride = calculateOptimalWindows([...clear, ...tomorrow], 2, 50, 2000, null);

      expect(withoutOverride.today).not.toBeNull();
      expect(withOverride.today).not.toBeNull();
    });
  });

  describe('current conditions change efficiency classification', () => {
    it('overcast forecast + clear current → efficiency improves from poor', () => {
      const overcast = makeOvercastAllDay();
      const overcastTomorrow = makeOvercastAllDay({ date: makeTomorrow() });

      const without = calculateOptimalWindows([...overcast, ...overcastTomorrow], 2, 50, 2000, null);
      const withOverride = calculateOptimalWindows([...overcast, ...overcastTomorrow], 2, 50, 2000, null, {
        uvIndex: 9,
        cloudCover: 0.05,
      });

      expect(without.efficiency).toBe('poor');
      expect(withOverride.efficiency).not.toBe('poor');
    });
  });
});
