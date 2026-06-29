import { describe, it, expect } from 'vitest';
import {
  formatDurationMinutes,
  formatTimeToBurn,
  formatSunburnCountdown,
  formatEstimatedIU,
} from '../../lib/dEngine';

describe('formatDurationMinutes', () => {
  it('returns "—" for 0 minutes', () => {
    expect(formatDurationMinutes(0)).toBe('—');
  });

  it('returns "—" for negative minutes', () => {
    expect(formatDurationMinutes(-10)).toBe('—');
  });

  it('returns "—" for Infinity', () => {
    expect(formatDurationMinutes(Infinity)).toBe('—');
  });

  it('returns "—" for NaN', () => {
    expect(formatDurationMinutes(NaN)).toBe('—');
  });

  it('formats sub-hour durations as "Xm"', () => {
    expect(formatDurationMinutes(1)).toBe('1m');
    expect(formatDurationMinutes(30)).toBe('30m');
    expect(formatDurationMinutes(59)).toBe('59m');
  });

  it('formats exactly 60 minutes as "1h" (no extra "0m")', () => {
    expect(formatDurationMinutes(60)).toBe('1h');
  });

  it('formats hours + minutes as "Xh Ym"', () => {
    expect(formatDurationMinutes(61)).toBe('1h 1m');
    expect(formatDurationMinutes(90)).toBe('1h 30m');
    expect(formatDurationMinutes(125)).toBe('2h 5m');
  });

  it('formats exact hours as "Xh" (no trailing "0m")', () => {
    expect(formatDurationMinutes(120)).toBe('2h');
    expect(formatDurationMinutes(180)).toBe('3h');
  });

  it('rounds minutes, not truncates', () => {
    expect(formatDurationMinutes(90.4)).toBe('1h 30m');
  });

  it('treats sub-hour values that round up to 60 as "1h" (not "60m")', () => {
    expect(formatDurationMinutes(59.7)).toBe('1h');
    expect(formatDurationMinutes(59.5)).toBe('1h');
  });
});

describe('formatTimeToBurn', () => {
  it('prefixes the duration with ~', () => {
    expect(formatTimeToBurn(30)).toBe('~30m');
    expect(formatTimeToBurn(90)).toBe('~1h 30m');
  });

  it('returns "—" for 0/Infinity/NaN without the ~ prefix', () => {
    expect(formatTimeToBurn(0)).toBe('—');
    expect(formatTimeToBurn(Infinity)).toBe('—');
    expect(formatTimeToBurn(NaN)).toBe('—');
  });
});

describe('formatSunburnCountdown', () => {
  it('returns "Now" for remaining seconds <= 0', () => {
    expect(formatSunburnCountdown(0)).toBe('Now');
    expect(formatSunburnCountdown(-1)).toBe('Now');
    expect(formatSunburnCountdown(-100)).toBe('Now');
  });

  it('returns "<1m" for remaining seconds < 60 (but > 0)', () => {
    expect(formatSunburnCountdown(1)).toBe('<1m');
    expect(formatSunburnCountdown(30)).toBe('<1m');
    expect(formatSunburnCountdown(59)).toBe('<1m');
  });

  it('returns "Xm" for 1-59 minutes', () => {
    expect(formatSunburnCountdown(60)).toBe('1m');
    expect(formatSunburnCountdown(120)).toBe('2m');
    expect(formatSunburnCountdown(600)).toBe('10m');
    expect(formatSunburnCountdown(3540)).toBe('59m');
  });

  it('returns "Xh Ym" for hours + minutes', () => {
    expect(formatSunburnCountdown(3600)).toBe('1h');
    expect(formatSunburnCountdown(3660)).toBe('1h 1m');
    expect(formatSunburnCountdown(5400)).toBe('1h 30m');
    expect(formatSunburnCountdown(7200)).toBe('2h');
  });

  it('floors minutes (never rounds up — burn warning never overstates safe time)', () => {
    expect(formatSunburnCountdown(89)).toBe('1m');
    expect(formatSunburnCountdown(119)).toBe('1m');
    expect(formatSunburnCountdown(3599)).toBe('59m');
    expect(formatSunburnCountdown(3659)).toBe('1h');
  });
});

describe('formatEstimatedIU', () => {
  it('rounds to nearest 50 IU', () => {
    expect(formatEstimatedIU(0)).toBe('0');
    expect(formatEstimatedIU(24)).toBe('0');
    expect(formatEstimatedIU(25)).toBe('50');
    expect(formatEstimatedIU(74)).toBe('50');
    expect(formatEstimatedIU(75)).toBe('100');
  });

  it('adds locale separators for large numbers', () => {
    expect(formatEstimatedIU(1000)).toBe('1,000');
    expect(formatEstimatedIU(10000)).toBe('10,000');
    expect(formatEstimatedIU(1525)).toBe('1,550');
  });
});
