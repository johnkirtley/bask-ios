import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { calculateOptimalWindows } from '../../lib/dWindowForecast';
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

beforeEach(() => pinTime(6));
afterEach(() => vi.useRealTimers());

describe('GOLDEN — Clear summer day (UV peaks at 10, cloudCover 0)', () => {
  const forecast = () => [...makeClearSummerDay(), ...makeClearSummerDay({ date: makeTomorrow() })];

  it('efficiency is exactly "excellent"', () => {
    expect(calculateOptimalWindows(forecast(), 2, 50, 2000, null).efficiency).toBe('excellent');
  });

  it('today window exists with estimatedIU > 100', () => {
    const result = calculateOptimalWindows(forecast(), 2, 50, 2000, null);
    expect(result.today).not.toBeNull();
    expect(result.today!.estimatedIU).toBeGreaterThan(100);
  });

  it('today window has cloudCover < 0.2 (clear)', () => {
    const result = calculateOptimalWindows(forecast(), 2, 50, 2000, null);
    expect(result.today!.cloudCover).toBeLessThan(0.2);
  });

  it('todayNoWindowReason is undefined', () => {
    const result = calculateOptimalWindows(forecast(), 2, 50, 2000, null);
    expect(result.todayNoWindowReason).toBeUndefined();
  });

  it('tomorrow window exists', () => {
    const result = calculateOptimalWindows(forecast(), 2, 50, 2000, null);
    expect(result.tomorrow).not.toBeNull();
  });

  it('today synthesis band exists', () => {
    const result = calculateOptimalWindows(forecast(), 2, 50, 2000, null);
    expect(result.todaySynthesis).not.toBeNull();
  });

  it('todayCloudBlocked is null (no clouds)', () => {
    const result = calculateOptimalWindows(forecast(), 2, 50, 2000, null);
    expect(result.todayCloudBlocked).toBeNull();
  });

  it('recommendations include "Good UV today from"', () => {
    const result = calculateOptimalWindows(forecast(), 2, 50, 2000, null);
    expect(result.recommendations.some((r) => r.content.headline.startsWith('Good UV today from'))).toBe(true);
  });

  it('session duration is within burn-safe limits (≤ 60 min)', () => {
    const result = calculateOptimalWindows(forecast(), 2, 50, 2000, null);
    expect(result.today!.durationMinutes).toBeLessThanOrEqual(60);
  });
});

describe('GOLDEN — Overcast all day (UV 6 raw, 0.9 cloudCover)', () => {
  const forecast = () => [...makeOvercastAllDay(), ...makeOvercastAllDay({ date: makeTomorrow() })];

  it('today window is null', () => {
    expect(calculateOptimalWindows(forecast(), 2, 50, 2000, null).today).toBeNull();
  });

  it('todayNoWindowReason is exactly "clouds-blocking"', () => {
    expect(calculateOptimalWindows(forecast(), 2, 50, 2000, null).todayNoWindowReason).toBe('clouds-blocking');
  });

  it('todayCloudBlocked band is populated', () => {
    expect(calculateOptimalWindows(forecast(), 2, 50, 2000, null).todayCloudBlocked).not.toBeNull();
  });

  it('efficiency is exactly "poor"', () => {
    expect(calculateOptimalWindows(forecast(), 2, 50, 2000, null).efficiency).toBe('poor');
  });

  it('todaySynthesis is null (no viable effective UV)', () => {
    expect(calculateOptimalWindows(forecast(), 2, 50, 2000, null).todaySynthesis).toBeNull();
  });

  it('recommendations include "UV too weak"', () => {
    const result = calculateOptimalWindows(forecast(), 2, 50, 2000, null);
    expect(result.recommendations.some((r) => r.content.headline.includes('UV too weak'))).toBe(true);
  });
});

describe('GOLDEN — Winter low UV (UV peaks at 2, clear sky)', () => {
  const forecast = () => [...makeWinterLowUVDay(), ...makeWinterLowUVDay({ date: makeTomorrow() })];

  it('today window is null', () => {
    expect(calculateOptimalWindows(forecast(), 2, 50, 2000, null).today).toBeNull();
  });

  it('todayNoWindowReason is exactly "uv-too-low"', () => {
    expect(calculateOptimalWindows(forecast(), 2, 50, 2000, null).todayNoWindowReason).toBe('uv-too-low');
  });

  it('todayCloudBlocked is null (UV is the problem, not clouds)', () => {
    expect(calculateOptimalWindows(forecast(), 2, 50, 2000, null).todayCloudBlocked).toBeNull();
  });

  it('todaySynthesis is null', () => {
    expect(calculateOptimalWindows(forecast(), 2, 50, 2000, null).todaySynthesis).toBeNull();
  });

  it('efficiency is exactly "poor"', () => {
    expect(calculateOptimalWindows(forecast(), 2, 50, 2000, null).efficiency).toBe('poor');
  });
});

describe('GOLDEN — Stable across repeated calls (deterministic)', () => {
  it('produces identical results on back-to-back calls', () => {
    const forecast = [...makeClearSummerDay(), ...makeClearSummerDay({ date: makeTomorrow() })];
    const r1 = calculateOptimalWindows(forecast, 2, 50, 2000, null);
    const r2 = calculateOptimalWindows(forecast, 2, 50, 2000, null);
    expect(r1.today?.estimatedIU).toBe(r2.today?.estimatedIU);
    expect(r1.today?.durationMinutes).toBe(r2.today?.durationMinutes);
    expect(r1.efficiency).toBe(r2.efficiency);
    expect(r1.recommendations.length).toBe(r2.recommendations.length);
  });
});
