import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  effectiveUvFromHour,
  getRepresentativeUvForPassiveSync,
} from '../../lib/healthKitUvUtils';
import { effectiveUv } from '../../lib/dEngine';
import { buildHour, buildDay, uvBellCurve } from '../fixtures/hourlyForecasts';
import { makeTomorrow } from '../fixtures/namedScenarios';

describe('effectiveUvFromHour', () => {
  it('returns effectiveUv(uvIndex, cloudCover) for the hour', () => {
    const hour = buildHour({ hour: 12, uvIndex: 8, cloudCover: 0.5 });
    expect(effectiveUvFromHour(hour)).toBeCloseTo(effectiveUv(8, 0.5), 10);
  });

  it('returns raw UV for clear skies', () => {
    const hour = buildHour({ hour: 12, uvIndex: 10, cloudCover: 0 });
    expect(effectiveUvFromHour(hour)).toBe(10);
  });

  it('returns attenuated UV for overcast', () => {
    const hour = buildHour({ hour: 12, uvIndex: 10, cloudCover: 1.0 });
    expect(effectiveUvFromHour(hour)).toBeCloseTo(3.0, 10);
  });
});

describe('getRepresentativeUvForPassiveSync', () => {
  beforeEach(() => {
    const noon = new Date();
    noon.setHours(12, 0, 0, 0);
    vi.useFakeTimers();
    vi.setSystemTime(noon);
  });

  afterEach(() => vi.useRealTimers());

  it('averages today\'s viable UV hours (>= 3) when forecast is available', () => {
    const today = buildDay({
      uvAt: uvBellCurve(8, { sunriseHour: 6, sunsetHour: 19 }),
      cloudAt: () => 0,
    });
    const result = getRepresentativeUvForPassiveSync(0, today);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeGreaterThanOrEqual(3);
  });

  it('falls back to currentEffectiveUv >= 3 when no viable forecast hours', () => {
    const today = buildDay({
      uvAt: () => 1,
      cloudAt: () => 0,
    });
    const result = getRepresentativeUvForPassiveSync(5, today);
    expect(result).toBe(5);
  });

  it('falls back to default (5) when no forecast and current UV < 3', () => {
    const result = getRepresentativeUvForPassiveSync(2);
    expect(result).toBe(5);
  });

  it('falls back to currentEffectiveUv when no forecast but current >= 3', () => {
    const result = getRepresentativeUvForPassiveSync(7);
    expect(result).toBe(7);
  });

  it('falls back to default (5) when forecast is empty array', () => {
    const result = getRepresentativeUvForPassiveSync(1, []);
    expect(result).toBe(5);
  });

  it('only considers TODAY\'s hours (ignores tomorrow)', () => {
    const tomorrow = makeTomorrow();
    const today = buildDay({
      uvAt: () => 1,
      cloudAt: () => 0,
    });
    const tomorrowHours = buildDay({
      date: tomorrow,
      uvAt: uvBellCurve(10, { sunriseHour: 6, sunsetHour: 19 }),
      cloudAt: () => 0,
    });
    const result = getRepresentativeUvForPassiveSync(1, [...today, ...tomorrowHours]);
    expect(result).toBe(5);
  });

  it('ignores hours with effective UV < 3 (cloud-blocked hours)', () => {
    const today = buildDay({
      uvAt: (hour) => (hour >= 10 && hour <= 14 ? 5 : 0),
      cloudAt: (hour) => (hour === 12 ? 1.0 : 0),
    });
    const result = getRepresentativeUvForPassiveSync(0, today);
    const viableHours = today
      .map(effectiveUvFromHour)
      .filter((uv) => uv >= 3);
    const expectedAvg = viableHours.reduce((a, b) => a + b, 0) / viableHours.length;
    expect(result).toBeCloseTo(expectedAvg, 5);
  });
});
