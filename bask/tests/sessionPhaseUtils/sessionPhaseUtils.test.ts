import { describe, it, expect } from 'vitest';
import { lightPhaseForLiveActivity, formatElapsedTime } from '../../lib/sessionPhaseUtils';
import type { SolarClock } from '../../lib/lightPhase';

const SOLAR: SolarClock = {
  sunriseMs: new Date().setHours(6, 0, 0, 0),
  sunsetMs: new Date().setHours(19, 0, 0, 0),
};

function msAt(hour: number): number {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d.getTime();
}

describe('lightPhaseForLiveActivity', () => {
  it('returns "vitaminD" when hasSynthesized is true (regardless of time)', () => {
    expect(lightPhaseForLiveActivity(true, SOLAR, msAt(7))).toBe('vitaminD');
    expect(lightPhaseForLiveActivity(true, SOLAR, msAt(12))).toBe('vitaminD');
    expect(lightPhaseForLiveActivity(true, SOLAR, msAt(22))).toBe('vitaminD');
  });

  it('returns "morningLight" in the morning when not yet synthesized', () => {
    expect(lightPhaseForLiveActivity(false, SOLAR, msAt(7))).toBe('morningLight');
    expect(lightPhaseForLiveActivity(false, SOLAR, msAt(8))).toBe('morningLight');
  });

  it('returns "daylight" at midday when not yet synthesized', () => {
    expect(lightPhaseForLiveActivity(false, SOLAR, msAt(12))).toBe('daylight');
    expect(lightPhaseForLiveActivity(false, SOLAR, msAt(14))).toBe('daylight');
  });

  it('returns "eveningLight" in the evening/night when not yet synthesized', () => {
    expect(lightPhaseForLiveActivity(false, SOLAR, msAt(18))).toBe('eveningLight');
    expect(lightPhaseForLiveActivity(false, SOLAR, msAt(22))).toBe('eveningLight');
  });

  it('session that outlives sunset becomes eveningLight', () => {
    const result = lightPhaseForLiveActivity(false, SOLAR, msAt(20));
    expect(result).toBe('eveningLight');
  });

  it('hasSynthesized flips phase from daylight to vitaminD mid-session', () => {
    const before = lightPhaseForLiveActivity(false, SOLAR, msAt(12));
    const after = lightPhaseForLiveActivity(true, SOLAR, msAt(12));
    expect(before).toBe('daylight');
    expect(after).toBe('vitaminD');
  });
});

describe('formatElapsedTime', () => {
  it('formats 0 seconds as "0:00"', () => {
    expect(formatElapsedTime(0)).toBe('0:00');
  });

  it('formats seconds only (< 1 min)', () => {
    expect(formatElapsedTime(5)).toBe('0:05');
    expect(formatElapsedTime(30)).toBe('0:30');
    expect(formatElapsedTime(59)).toBe('0:59');
  });

  it('formats minutes:seconds', () => {
    expect(formatElapsedTime(60)).toBe('1:00');
    expect(formatElapsedTime(65)).toBe('1:05');
    expect(formatElapsedTime(90)).toBe('1:30');
    expect(formatElapsedTime(125)).toBe('2:05');
    expect(formatElapsedTime(599)).toBe('9:59');
  });

  it('formats 10+ minutes with double-digit minutes', () => {
    expect(formatElapsedTime(600)).toBe('10:00');
    expect(formatElapsedTime(3600)).toBe('60:00');
  });

  it('pads single-digit seconds', () => {
    expect(formatElapsedTime(61)).toBe('1:01');
    expect(formatElapsedTime(121)).toBe('2:01');
  });
});
