import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { calculateOptimalWindows } from '../../lib/dWindowForecast';
import type { DWindowForecast } from '../../lib/dWindowForecast';
import type { HourlyForecastItem } from '../../lib/plugins/baskWeather';
import { buildDay, uvBellCurve, buildHour } from '../fixtures/hourlyForecasts';
import {
  makeClearSummerDay,
  makeOvercastAllDay,
  makeWinterLowUVDay,
  makeClearNowCloudyLater,
  makeCloudyNowClearLater,
  makeUvExactlyAt3,
  makeUvExactlyAt5,
  makeAllCloudBlocked,
  makeTomorrow,
} from '../fixtures/namedScenarios';

const NOON_HOUR = 12;

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

function buildTwoDayForecast(today: HourlyForecastItem[], tomorrow?: HourlyForecastItem[]): HourlyForecastItem[] {
  const tom = tomorrow ?? makeClearSummerDay({ date: makeTomorrow() });
  return [...today, ...tom];
}

function buildSameScenarioTwoDay(makeDay: (opts?: { date?: Date }) => HourlyForecastItem[]): HourlyForecastItem[] {
  return [...makeDay(), ...makeDay({ date: makeTomorrow() })];
}

describe('calculateOptimalWindows — clear sunny day', () => {
  it('finds a today window', () => {
    const forecast = buildTwoDayForecast(makeClearSummerDay());
    const result = calculateOptimalWindows(forecast, 2, 50, 2000, null);
    expect(result.today).not.toBeNull();
  });

  it('rates efficiency as excellent (effective UV >= 5)', () => {
    const forecast = buildTwoDayForecast(makeClearSummerDay());
    const result = calculateOptimalWindows(forecast, 2, 50, 2000, null);
    expect(result.efficiency).toBe('excellent');
  });

  it('produces a window with high UV and low cloud cover', () => {
    const forecast = buildTwoDayForecast(makeClearSummerDay());
    const result = calculateOptimalWindows(forecast, 2, 50, 2000, null);
    expect(result.today!.avgUvIndex).toBeGreaterThan(5);
    expect(result.today!.cloudCover).toBeLessThan(0.2);
  });

  it('produces a positive estimated IU', () => {
    const forecast = buildTwoDayForecast(makeClearSummerDay());
    const result = calculateOptimalWindows(forecast, 2, 50, 2000, null);
    expect(result.today!.estimatedIU).toBeGreaterThan(100);
  });

  it('does not set a noWindowReason when a window exists', () => {
    const forecast = buildTwoDayForecast(makeClearSummerDay());
    const result = calculateOptimalWindows(forecast, 2, 50, 2000, null);
    expect(result.todayNoWindowReason).toBeUndefined();
  });
});

describe('calculateOptimalWindows — overcast all day', () => {
  it('finds no today window (clouds block synthesis)', () => {
    const forecast = buildTwoDayForecast(makeOvercastAllDay());
    const result = calculateOptimalWindows(forecast, 2, 50, 2000, null);
    expect(result.today).toBeNull();
  });

  it('classifies the reason as clouds-blocking', () => {
    const forecast = buildTwoDayForecast(makeOvercastAllDay());
    const result = calculateOptimalWindows(forecast, 2, 50, 2000, null);
    expect(result.todayNoWindowReason).toBe('clouds-blocking');
  });

  it('populates the cloud-blocked band (raw UV was sufficient)', () => {
    const forecast = buildTwoDayForecast(makeOvercastAllDay());
    const result = calculateOptimalWindows(forecast, 2, 50, 2000, null);
    expect(result.todayCloudBlocked).not.toBeNull();
  });

  it('rates efficiency as poor when BOTH days are overcast (effective UV < 2)', () => {
    const forecast = buildSameScenarioTwoDay(makeOvercastAllDay);
    const result = calculateOptimalWindows(forecast, 2, 50, 2000, null);
    expect(result.efficiency).toBe('poor');
  });
});

describe('calculateOptimalWindows — winter low UV day', () => {
  it('finds no today window (UV too low)', () => {
    const forecast = buildTwoDayForecast(makeWinterLowUVDay());
    const result = calculateOptimalWindows(forecast, 2, 50, 2000, null);
    expect(result.today).toBeNull();
  });

  it('classifies the reason as uv-too-low', () => {
    const forecast = buildTwoDayForecast(makeWinterLowUVDay());
    const result = calculateOptimalWindows(forecast, 2, 50, 2000, null);
    expect(result.todayNoWindowReason).toBe('uv-too-low');
  });

  it('does NOT populate cloud-blocked band (UV itself is too low, not clouds)', () => {
    const forecast = buildTwoDayForecast(makeWinterLowUVDay());
    const result = calculateOptimalWindows(forecast, 2, 50, 2000, null);
    expect(result.todayCloudBlocked).toBeNull();
  });
});

describe('calculateOptimalWindows — clear now, cloudy later', () => {
  it('finds a today window (current hours are clear)', () => {
    const forecast = buildTwoDayForecast(makeClearNowCloudyLater());
    const result = calculateOptimalWindows(forecast, 2, 50, 2000, null);
    expect(result.today).not.toBeNull();
  });

  it('does not show clouds-blocking reason (at least some hours are clear)', () => {
    const forecast = buildTwoDayForecast(makeClearNowCloudyLater());
    const result = calculateOptimalWindows(forecast, 2, 50, 2000, null);
    expect(result.todayNoWindowReason).not.toBe('clouds-blocking');
  });
});

describe('calculateOptimalWindows — cloudy now, clear later', () => {
  it('finds a today window (later hours are clear)', () => {
    const forecast = buildTwoDayForecast(makeCloudyNowClearLater());
    const result = calculateOptimalWindows(forecast, 2, 50, 2000, null);
    expect(result.today).not.toBeNull();
  });

  it('does not show clouds-blocking reason', () => {
    const forecast = buildTwoDayForecast(makeCloudyNowClearLater());
    const result = calculateOptimalWindows(forecast, 2, 50, 2000, null);
    expect(result.todayNoWindowReason).not.toBe('clouds-blocking');
  });
});

describe('calculateOptimalWindows — UV exactly at 3', () => {
  it('finds a window (UV 3 is at the synthesis threshold)', () => {
    const forecast = buildTwoDayForecast(makeUvExactlyAt3());
    const result = calculateOptimalWindows(forecast, 2, 50, 2000, null);
    expect(result.today).not.toBeNull();
  });

  it('rates efficiency as moderate or good when BOTH days have effective UV = 3', () => {
    const forecast = buildSameScenarioTwoDay(makeUvExactlyAt3);
    const result = calculateOptimalWindows(forecast, 2, 50, 2000, null);
    expect(['moderate', 'good']).toContain(result.efficiency);
  });
});

describe('calculateOptimalWindows — UV exactly at 5', () => {
  it('rates efficiency as excellent (effective UV = 5)', () => {
    const forecast = buildTwoDayForecast(makeUvExactlyAt5());
    const result = calculateOptimalWindows(forecast, 2, 50, 2000, null);
    expect(result.efficiency).toBe('excellent');
  });
});

describe('calculateOptimalWindows — all clouds at 100%', () => {
  it('classifies as clouds-blocking', () => {
    const forecast = buildTwoDayForecast(makeAllCloudBlocked());
    const result = calculateOptimalWindows(forecast, 2, 50, 2000, null);
    expect(result.todayNoWindowReason).toBe('clouds-blocking');
  });

  it('still finds a cloud-blocked band (raw UV was >= 3)', () => {
    const forecast = buildTwoDayForecast(makeAllCloudBlocked());
    const result = calculateOptimalWindows(forecast, 2, 50, 2000, null);
    expect(result.todayCloudBlocked).not.toBeNull();
  });
});

describe('calculateOptimalWindows — current conditions override', () => {
  beforeEach(() => {
    pinTime(NOON_HOUR);
  });

  it('live UV override can rescue a forecasted-low day', () => {
    const today = makeWinterLowUVDay();
    const tomorrow = makeClearSummerDay({ date: makeTomorrow() });
    const forecast = [...today, ...tomorrow];

    const result = calculateOptimalWindows(forecast, 2, 50, 2000, null, {
      uvIndex: 8,
      cloudCover: 0.1,
    });

    expect(result.today).not.toBeNull();
    expect(result.today!.effectiveUvIndex).toBeGreaterThan(3);
  });

  it('live cloud override can block the current hour when it was the only viable hour', () => {
    const today = buildDay({
      uvAt: (hour) => (hour === NOON_HOUR ? 4 : 0),
      cloudAt: () => 0,
    });
    const tomorrow = makeClearSummerDay({ date: makeTomorrow() });
    const forecast = [...today, ...tomorrow];

    const result = calculateOptimalWindows(forecast, 2, 50, 2000, null, {
      uvIndex: 4,
      cloudCover: 0.95,
    });

    expect(result.today).toBeNull();
    expect(result.todayNoWindowReason).toBe('clouds-blocking');
  });
});

describe('calculateOptimalWindows — synthesis window', () => {
  it('finds a synthesis band for clear day (effective UV >= 3 hours exist)', () => {
    const forecast = buildTwoDayForecast(makeClearSummerDay());
    const result = calculateOptimalWindows(forecast, 2, 50, 2000, null);
    expect(result.todaySynthesis).not.toBeNull();
  });

  it('does not find synthesis for overcast day', () => {
    const forecast = buildTwoDayForecast(makeOvercastAllDay());
    const result = calculateOptimalWindows(forecast, 2, 50, 2000, null);
    expect(result.todaySynthesis).toBeNull();
  });

  it('does not find synthesis for winter low UV', () => {
    const forecast = buildTwoDayForecast(makeWinterLowUVDay());
    const result = calculateOptimalWindows(forecast, 2, 50, 2000, null);
    expect(result.todaySynthesis).toBeNull();
  });
});

describe('calculateOptimalWindows — tomorrow', () => {
  it('finds a tomorrow window for clear forecast', () => {
    const today = makeClearSummerDay();
    const tomorrow = makeClearSummerDay({ date: makeTomorrow() });
    const forecast = [...today, ...tomorrow];
    const result = calculateOptimalWindows(forecast, 2, 50, 2000, null);
    expect(result.tomorrow).not.toBeNull();
  });

  it('tomorrowNoWindowReason is set for overcast tomorrow', () => {
    const today = makeClearSummerDay();
    const tomorrow = makeOvercastAllDay({ date: makeTomorrow() });
    const forecast = [...today, ...tomorrow];
    const result = calculateOptimalWindows(forecast, 2, 50, 2000, null);
    expect(result.tomorrowNoWindowReason).toBe('clouds-blocking');
  });
});

describe('calculateOptimalWindows — edge cases', () => {
  it('empty forecast → null windows, generates UV-too-weak recommendation', () => {
    const result = calculateOptimalWindows([], 2, 50, 2000, null);
    expect(result.today).toBeNull();
    expect(result.tomorrow).toBeNull();
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.recommendations.some((r) => r.content.headline.includes('UV too weak'))).toBe(true);
  });

  it('single hour forecast (UV 0) → no window', () => {
    const singleHour = [buildHour({ hour: 12, uvIndex: 0, cloudCover: 0 })];
    const result = calculateOptimalWindows(singleHour, 2, 50, 2000, null);
    expect(result.today).toBeNull();
  });

  it('session duration is capped at 60 minutes', () => {
    const forecast = buildTwoDayForecast(makeClearSummerDay());
    const result = calculateOptimalWindows(forecast, 6, 80, 50000, null);
    if (result.today) {
      expect(result.today.durationMinutes).toBeLessThanOrEqual(60);
    }
  });
});
