import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { calculateOptimalWindows } from '../../lib/dWindowForecast';
import { effectiveUv, getBurnRiskLevel, vitaminDRatePerMinute } from '../../lib/dEngine';
import { getBaskCta } from '../../lib/lightPhase';
import type { HourlyForecastItem } from '../../lib/plugins/baskWeather';
import { buildDay, buildHour, uvBellCurve } from '../fixtures/hourlyForecasts';
import {
  makeClearSummerDay,
  makeOvercastAllDay,
  makeWinterLowUVDay,
  makeClearNowCloudyLater,
  makeCloudyNowClearLater,
  makeAllCloudBlocked,
  makeTomorrow,
} from '../fixtures/namedScenarios';

function pinTime(hour: number, minute: number = 0): void {
  const pinned = new Date();
  pinned.setHours(hour, minute, 0, 0);
  vi.useFakeTimers();
  vi.setSystemTime(pinned);
}

beforeEach(() => pinTime(6));
afterEach(() => vi.useRealTimers());

function twoDay(today: HourlyForecastItem[], tomorrow?: HourlyForecastItem[]): HourlyForecastItem[] {
  return [...today, ...(tomorrow ?? makeClearSummerDay({ date: makeTomorrow() }))];
}

function sameScenario(makeDay: (opts?: { date?: Date }) => HourlyForecastItem[]): HourlyForecastItem[] {
  return [...makeDay(), ...makeDay({ date: makeTomorrow() })];
}

describe('CLOUD COVER SCENARIOS — the BASKAPP-26 matrix', () => {
  describe('current clear, day forecast clear', () => {
    it('user should NOT see any cloud-blocking messaging', () => {
      pinTime(12);
      const result = calculateOptimalWindows(sameScenario(makeClearSummerDay), 2, 50, 2000, null);
      expect(result.todayNoWindowReason).not.toBe('clouds-blocking');
      expect(result.todayCloudBlocked).toBeNull();
    });

    it('user should see a valid window', () => {
      pinTime(12);
      const result = calculateOptimalWindows(sameScenario(makeClearSummerDay), 2, 50, 2000, null);
      expect(result.today).not.toBeNull();
    });

    it('CTA should be "Bask Now" (effective UV >= 3)', () => {
      const cta = getBaskCta({
        rawUV: 10,
        effectiveUV: effectiveUv(10, 0),
        timeOfDay: 'midday',
        synthesisCountdownMin: null,
        cloudCover: 0,
        sunIsUp: true,
      });
      expect(cta.label).toBe('Bask Now');
    });
  });

  describe('current clear, day forecast cloudy later', () => {
    it('user should NOT see cloud-blocking messaging right now', () => {
      pinTime(9);
      const result = calculateOptimalWindows(twoDay(makeClearNowCloudyLater()), 2, 50, 2000, null);
      expect(result.todayNoWindowReason).not.toBe('clouds-blocking');
    });

    it('user should still have a window (clear hours exist)', () => {
      pinTime(9);
      const result = calculateOptimalWindows(twoDay(makeClearNowCloudyLater()), 2, 50, 2000, null);
      expect(result.today).not.toBeNull();
    });

    it('CTA should be "Bask Now" (current conditions are clear)', () => {
      const cta = getBaskCta({
        rawUV: 8,
        effectiveUV: effectiveUv(8, 0.05),
        timeOfDay: 'morning',
        synthesisCountdownMin: null,
        cloudCover: 0.05,
        sunIsUp: true,
      });
      expect(cta.variant).toBe('vitaminD');
    });
  });

  describe('current cloudy, day forecast clear', () => {
    it('CTA should acknowledge clouds blocking vitamin D', () => {
      const cta = getBaskCta({
        rawUV: 8,
        effectiveUV: effectiveUv(8, 0.95),
        timeOfDay: 'morning',
        synthesisCountdownMin: null,
        cloudCover: 0.95,
        sunIsUp: true,
      });
      expect(cta.helper).toContain('Clouds may be blocking');
      expect(cta.variant).not.toBe('vitaminD');
    });

    it('a window should exist later when it clears', () => {
      pinTime(9);
      const result = calculateOptimalWindows(twoDay(makeCloudyNowClearLater()), 2, 50, 2000, null);
      expect(result.today).not.toBeNull();
    });

    it('does not set clouds-blocking reason because clearing hours exist', () => {
      pinTime(9);
      const result = calculateOptimalWindows(twoDay(makeCloudyNowClearLater()), 2, 50, 2000, null);
      expect(result.todayNoWindowReason).not.toBe('clouds-blocking');
    });
  });

  describe('current cloudy, day forecast cloudy all day', () => {
    it('should show clouds-blocking reason', () => {
      const result = calculateOptimalWindows(sameScenario(makeOvercastAllDay), 2, 50, 2000, null);
      expect(result.todayNoWindowReason).toBe('clouds-blocking');
    });

    it('should show no window', () => {
      const result = calculateOptimalWindows(sameScenario(makeOvercastAllDay), 2, 50, 2000, null);
      expect(result.today).toBeNull();
    });

    it('should populate the cloud-blocked daylight band', () => {
      const result = calculateOptimalWindows(sameScenario(makeOvercastAllDay), 2, 50, 2000, null);
      expect(result.todayCloudBlocked).not.toBeNull();
    });

    it('CTA should acknowledge clouds blocking vitamin D', () => {
      const cta = getBaskCta({
        rawUV: 6,
        effectiveUV: effectiveUv(6, 0.9),
        timeOfDay: 'midday',
        synthesisCountdownMin: null,
        cloudCover: 0.9,
        sunIsUp: true,
      });
      expect(cta.helper).toContain('Clouds may be blocking');
    });
  });

  describe('low UV AND cloudy — UV is the real problem', () => {
    it('should classify as uv-too-low (not clouds-blocking)', () => {
      const winterOvercast = buildDay({
        uvAt: uvBellCurve(2, { sunriseHour: 7, sunsetHour: 17 }),
        cloudAt: () => 0.9,
      });
      const tomorrow = buildDay({
        date: makeTomorrow(),
        uvAt: uvBellCurve(2, { sunriseHour: 7, sunsetHour: 17 }),
        cloudAt: () => 0.9,
      });
      const result = calculateOptimalWindows([...winterOvercast, ...tomorrow], 2, 50, 2000, null);
      expect(result.todayNoWindowReason).toBe('uv-too-low');
    });
  });

  describe('clear sky but low UV (winter)', () => {
    it('should classify as uv-too-low (not clouds)', () => {
      const result = calculateOptimalWindows(sameScenario(makeWinterLowUVDay), 2, 50, 2000, null);
      expect(result.todayNoWindowReason).toBe('uv-too-low');
    });

    it('should NOT populate cloud-blocked band', () => {
      const result = calculateOptimalWindows(sameScenario(makeWinterLowUVDay), 2, 50, 2000, null);
      expect(result.todayCloudBlocked).toBeNull();
    });

    it('CTA should mention UV strength (not clouds)', () => {
      const cta = getBaskCta({
        rawUV: 2,
        effectiveUV: 2,
        timeOfDay: 'midday',
        synthesisCountdownMin: null,
        cloudCover: 0,
        sunIsUp: true,
      });
      expect(cta.helper).not.toContain('Clouds');
    });
  });

  describe('100% cloud cover with high raw UV', () => {
    it('should classify as clouds-blocking (raw UV >= 3 but effective < 3)', () => {
      const result = calculateOptimalWindows(sameScenario(makeAllCloudBlocked), 2, 50, 2000, null);
      expect(result.todayNoWindowReason).toBe('clouds-blocking');
    });

    it('effective UV at max clouds = raw * 0.3 — still some UV gets through', () => {
      expect(effectiveUv(10, 1.0)).toBeCloseTo(3.0, 10);
      expect(effectiveUv(11, 1.0)).toBeGreaterThan(3);
    });

    it('very high raw UV (>14) can still synthesize through 100% clouds', () => {
      expect(effectiveUv(14, 1.0)).toBeCloseTo(4.2, 10);
      expect(effectiveUv(14, 1.0)).toBeGreaterThan(3);
    });
  });
});

describe('UV THRESHOLD SCENARIOS', () => {
  describe('UV exactly at 3.0 (synthesis boundary)', () => {
    it('vitaminDRatePerMinute returns positive value at UV 3', () => {
      expect(vitaminDRatePerMinute(3.0, 50, 3, 30)).toBeGreaterThan(0);
    });

    it('vitaminDRatePerMinute returns 0 at UV 2.99', () => {
      expect(vitaminDRatePerMinute(2.99, 50, 3, 30)).toBe(0);
    });

    it('burn risk at UV 3 is Moderate', () => {
      expect(getBurnRiskLevel(3)).toBe('Moderate');
    });

    it('burn risk at UV 2.99 is Low', () => {
      expect(getBurnRiskLevel(2.99)).toBe('Low');
    });
  });

  describe('UV exactly at 5.0 (excellent boundary)', () => {
    it('efficiency should be excellent at effective UV 5', () => {
      const today = buildDay({
        uvAt: (hour) => (hour >= 10 && hour <= 15 ? 5.0 : 0),
        cloudAt: () => 0,
      });
      const tomorrow = buildDay({
        date: makeTomorrow(),
        uvAt: (hour) => (hour >= 10 && hour <= 15 ? 5.0 : 0),
        cloudAt: () => 0,
      });
      const result = calculateOptimalWindows([...today, ...tomorrow], 2, 50, 2000, null);
      expect(result.efficiency).toBe('excellent');
    });
  });

  describe('UV at 11 (extreme)', () => {
    it('burn risk is Extreme', () => {
      expect(getBurnRiskLevel(11)).toBe('Extreme');
    });

    it('still produces vitamin D synthesis', () => {
      expect(vitaminDRatePerMinute(11, 50, 3, 30)).toBeGreaterThan(0);
    });
  });

  describe('UV = 0', () => {
    it('no vitamin D synthesis', () => {
      expect(vitaminDRatePerMinute(0, 50, 3, 30)).toBe(0);
    });

    it('burn risk is Low', () => {
      expect(getBurnRiskLevel(0)).toBe('Low');
    });

    it('effective UV is 0 regardless of clouds', () => {
      expect(effectiveUv(0, 0.5)).toBe(0);
      expect(effectiveUv(0, 1.0)).toBe(0);
    });
  });
});

describe('MIXED CONDITION DAY', () => {
  it('clouds roll in during afternoon — morning window exists, afternoon blocked', () => {
    pinTime(6);
    const day = buildDay({
      uvAt: uvBellCurve(9, { sunriseHour: 6, sunsetHour: 19 }),
      cloudAt: (hour) => (hour < 13 ? 0.05 : 0.95),
    });
    const tomorrow = makeClearSummerDay({ date: makeTomorrow() });
    const result = calculateOptimalWindows([...day, ...tomorrow], 2, 50, 2000, null);
    expect(result.today).not.toBeNull();
    expect(result.todayNoWindowReason).not.toBe('clouds-blocking');
  });

  it('morning cloudy, afternoon clears — window found in afternoon', () => {
    pinTime(6);
    const day = buildDay({
      uvAt: uvBellCurve(9, { sunriseHour: 6, sunsetHour: 19 }),
      cloudAt: (hour) => (hour < 12 ? 0.95 : 0.05),
    });
    const tomorrow = makeClearSummerDay({ date: makeTomorrow() });
    const result = calculateOptimalWindows([...day, ...tomorrow], 2, 50, 2000, null);
    expect(result.today).not.toBeNull();
  });

  it('partial clouds all day (0.3) — window still found, effective UV above 3', () => {
    pinTime(6);
    const day = buildDay({
      uvAt: uvBellCurve(8, { sunriseHour: 6, sunsetHour: 19 }),
      cloudAt: () => 0.3,
    });
    const tomorrow = buildDay({
      date: makeTomorrow(),
      uvAt: uvBellCurve(8, { sunriseHour: 6, sunsetHour: 19 }),
      cloudAt: () => 0.3,
    });
    const result = calculateOptimalWindows([...day, ...tomorrow], 2, 50, 2000, null);
    expect(result.today).not.toBeNull();
    expect(result.today!.effectiveUvIndex).toBeGreaterThan(3);
  });
});

describe('EDGE CASES', () => {
  it('empty forecast array — does not crash, returns safe defaults', () => {
    const result = calculateOptimalWindows([], 2, 50, 2000, null);
    expect(result.today).toBeNull();
    expect(result.tomorrow).toBeNull();
    expect(result.efficiency).toBe('poor');
  });

  it('single hour forecast with UV 0', () => {
    const single = [buildHour({ hour: 12, uvIndex: 0, cloudCover: 0 })];
    const result = calculateOptimalWindows(single, 2, 50, 2000, null);
    expect(result.today).toBeNull();
  });

  it('NaN UV values do not crash', () => {
    const day = buildDay({
      uvAt: () => NaN,
      cloudAt: () => 0,
    });
    const tomorrow = buildDay({
      date: makeTomorrow(),
      uvAt: () => NaN,
      cloudAt: () => 0,
    });
    expect(() => calculateOptimalWindows([...day, ...tomorrow], 2, 50, 2000, null)).not.toThrow();
  });

  it('negative UV values are handled gracefully', () => {
    expect(effectiveUv(-5, 0.5)).toBeLessThan(0);
    expect(getBurnRiskLevel(-1)).toBe('Low');
  });

  it('extreme UV (15+) does not crash', () => {
    expect(vitaminDRatePerMinute(15, 50, 3, 30)).toBeGreaterThan(0);
    expect(getBurnRiskLevel(15)).toBe('Extreme');
  });

  it('100% cloud cover with 0 UV', () => {
    expect(effectiveUv(0, 1.0)).toBe(0);
  });
});
