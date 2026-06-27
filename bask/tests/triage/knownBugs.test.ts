import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { formatDurationMinutes } from '../../lib/dEngine';
import { calculateOptimalWindows } from '../../lib/dWindowForecast';
import type { Recommendation } from '../../lib/dWindowForecast';
import { buildDay } from '../fixtures/hourlyForecasts';
import {
  makeClearSummerDay,
  makeTomorrow,
} from '../fixtures/namedScenarios';

function headlines(recs: Recommendation[]): string[] {
  return recs.map((r) => r.content.headline);
}

function pinTime(hour: number): void {
  const pinned = new Date();
  pinned.setHours(hour, 0, 0, 0);
  vi.useFakeTimers();
  vi.setSystemTime(pinned);
}

beforeEach(() => pinTime(6));
afterEach(() => vi.useRealTimers());

describe('TRIAGE — known bugs (not part of the green gate)', () => {
  it('TRIAGE #1: formatDurationMinutes(59.7) returns "60m" instead of "1h"', () => {
    expect(formatDurationMinutes(59.7)).toBe('1h');
  });

  it('TRIAGE #2: "Perfect sun right now!" is unreachable (windowStartTime always pushed ahead of now)', () => {
    vi.setSystemTime(new Date().setHours(14, 30, 0, 0));
    const forecast = [...makeClearSummerDay(), ...makeClearSummerDay({ date: makeTomorrow() })];
    const result = calculateOptimalWindows(forecast, 2, 50, 2000, null);
    expect(result.today).not.toBeNull();
    expect(result.today!.effectiveUvIndex).toBeGreaterThanOrEqual(5);
    expect(headlines(result.recommendations)).toContain('Perfect sun right now!');
  });

  it('TRIAGE #3: "UV is weak this week" is unreachable (contradictory preconditions)', () => {
    const today = buildDay({
      uvAt: (hour) => (hour >= 10 && hour <= 12 ? 2.5 : 0),
      cloudAt: () => 0,
    });
    const tomorrow = buildDay({
      date: makeTomorrow(),
      uvAt: (hour) => (hour >= 10 && hour <= 12 ? 2.5 : 0),
      cloudAt: () => 0,
    });
    const result = calculateOptimalWindows([...today, ...tomorrow], 2, 50, 2000, null);
    expect(headlines(result.recommendations)).toContain('UV is weak this week');
  });
});
