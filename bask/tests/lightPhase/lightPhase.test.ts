import { describe, it, expect } from 'vitest';
import {
  getBaskCta,
  morningLightRecommendation,
  isSunUp,
  getSolarPhase,
  type BaskCtaInput,
  type SolarClock,
} from '../../lib/lightPhase';

const baseInput: BaskCtaInput = {
  rawUV: 0,
  effectiveUV: 0,
  timeOfDay: 'midday',
  synthesisCountdownMin: null,
  cloudCover: 0,
  sunIsUp: true,
};

describe('getBaskCta — vitamin D threshold', () => {
  it('returns "Bask Now" when effective UV >= 3', () => {
    const result = getBaskCta({
      ...baseInput,
      rawUV: 8,
      effectiveUV: 8,
      timeOfDay: 'midday',
    });
    expect(result.variant).toBe('vitaminD');
    expect(result.label).toBe('Bask Now');
  });

  it('returns "Bask Now" at exactly effective UV = 3', () => {
    const result = getBaskCta({
      ...baseInput,
      rawUV: 3,
      effectiveUV: 3,
      timeOfDay: 'midday',
    });
    expect(result.variant).toBe('vitaminD');
  });

  it('does NOT return "Bask Now" when effective UV = 2.99', () => {
    const result = getBaskCta({
      ...baseInput,
      rawUV: 3,
      effectiveUV: 2.99,
      timeOfDay: 'midday',
    });
    expect(result.variant).not.toBe('vitaminD');
  });
});

describe('getBaskCta — morning light', () => {
  it('returns "Get morning light" when morning, UV < 3, and sun is up', () => {
    const result = getBaskCta({
      ...baseInput,
      rawUV: 2,
      effectiveUV: 2,
      timeOfDay: 'morning',
      sunIsUp: true,
    });
    expect(result.variant).toBe('morningLight');
    expect(result.label).toBe('Get morning light');
  });

  it('morning + clouds blocking → helper mentions clouds', () => {
    const result = getBaskCta({
      ...baseInput,
      rawUV: 5,
      effectiveUV: 2,
      timeOfDay: 'morning',
      cloudCover: 0.6,
      sunIsUp: true,
    });
    expect(result.helper).toContain('Clouds may be blocking');
  });

  it('morning + low UV (not clouds) → helper mentions UV strength and minutes', () => {
    const result = getBaskCta({
      ...baseInput,
      rawUV: 2,
      effectiveUV: 2,
      timeOfDay: 'morning',
      cloudCover: 0,
      sunIsUp: true,
    });
    expect(result.helper).toContain("UV isn't strong enough");
    expect(result.helper).toContain('min of morning light');
  });

  it('morning light minutes scale with cloud cover (clear → 10 min)', () => {
    const result = getBaskCta({
      ...baseInput,
      rawUV: 2,
      effectiveUV: 2,
      timeOfDay: 'morning',
      cloudCover: 0,
      sunIsUp: true,
    });
    expect(result.helper).toContain('~10 min');
  });

  it('morning light minutes scale with cloud cover (overcast → 30 min)', () => {
    const result = getBaskCta({
      ...baseInput,
      rawUV: 2,
      effectiveUV: 2,
      timeOfDay: 'morning',
      cloudCover: 0.8,
      sunIsUp: true,
    });
    expect(result.helper).toContain('~30 min');
  });
});

describe('getBaskCta — evening light', () => {
  it('returns "Get evening light" when evening, UV < 3', () => {
    const result = getBaskCta({
      ...baseInput,
      rawUV: 1,
      effectiveUV: 1,
      timeOfDay: 'evening',
      sunIsUp: true,
    });
    expect(result.variant).toBe('lowUv');
    expect(result.label).toBe('Get evening light');
  });

  it('evening + clouds blocking → helper mentions clouds', () => {
    const result = getBaskCta({
      ...baseInput,
      rawUV: 5,
      effectiveUV: 2,
      timeOfDay: 'evening',
      cloudCover: 0.6,
      sunIsUp: true,
    });
    expect(result.helper).toContain('Clouds may be blocking');
    expect(result.helper).toContain('evening light');
  });

  it('evening + low UV (no clouds) → helper mentions circadian rhythm', () => {
    const result = getBaskCta({
      ...baseInput,
      rawUV: 1,
      effectiveUV: 1,
      timeOfDay: 'evening',
      cloudCover: 0,
      sunIsUp: true,
    });
    expect(result.helper).toContain('evening light');
    expect(result.helper).toContain('circadian rhythm');
  });
});

describe('getBaskCta — generic daylight (midday, UV < 3)', () => {
  it('returns "Get some light" when midday, UV < 3, not morning/evening', () => {
    const result = getBaskCta({
      ...baseInput,
      rawUV: 2,
      effectiveUV: 2,
      timeOfDay: 'midday',
      sunIsUp: true,
    });
    expect(result.variant).toBe('lowUv');
    expect(result.label).toBe('Get some light');
  });

  it('midday + clouds blocking → helper mentions clouds', () => {
    const result = getBaskCta({
      ...baseInput,
      rawUV: 5,
      effectiveUV: 2,
      timeOfDay: 'midday',
      cloudCover: 0.6,
      sunIsUp: true,
    });
    expect(result.helper).toContain('Clouds may be blocking');
  });
});

describe('getBaskCta — synthesis countdown promotion', () => {
  it('promotes to morning-light CTA when countdown is present even if not morning', () => {
    const result = getBaskCta({
      ...baseInput,
      rawUV: 2,
      effectiveUV: 2,
      timeOfDay: 'midday',
      synthesisCountdownMin: 45,
      sunIsUp: true,
    });
    expect(result.variant).toBe('morningLight');
    expect(result.label).toBe('Get some light');
  });
});

describe('getBaskCta — night fallback', () => {
  it('returns night variant when effectiveUV = 0 and sun is down', () => {
    const result = getBaskCta({
      ...baseInput,
      rawUV: 0,
      effectiveUV: 0,
      timeOfDay: 'night',
      sunIsUp: false,
    });
    expect(result.variant).toBe('night');
  });
});

describe('morningLightRecommendation', () => {
  it('returns 10 min for clear skies (cloudCover < 0.3)', () => {
    expect(morningLightRecommendation(0)).toEqual({ minutes: 10, condition: 'clear' });
    expect(morningLightRecommendation(0.29)).toEqual({ minutes: 10, condition: 'clear' });
  });

  it('returns 20 min for cloudy skies (0.3 <= cloudCover < 0.7)', () => {
    expect(morningLightRecommendation(0.3)).toEqual({ minutes: 20, condition: 'cloudy' });
    expect(morningLightRecommendation(0.5)).toEqual({ minutes: 20, condition: 'cloudy' });
    expect(morningLightRecommendation(0.69)).toEqual({ minutes: 20, condition: 'cloudy' });
  });

  it('returns 30 min for overcast (cloudCover >= 0.7)', () => {
    expect(morningLightRecommendation(0.7)).toEqual({ minutes: 30, condition: 'overcast' });
    expect(morningLightRecommendation(1.0)).toEqual({ minutes: 30, condition: 'overcast' });
  });

  it('treats undefined cloudCover as clear (0)', () => {
    expect(morningLightRecommendation(undefined)).toEqual({ minutes: 10, condition: 'clear' });
  });

  it('boundary: cloudCover exactly 0.3 is "cloudy" (not "clear")', () => {
    expect(morningLightRecommendation(0.3).condition).toBe('cloudy');
  });

  it('boundary: cloudCover exactly 0.7 is "overcast" (not "cloudy")', () => {
    expect(morningLightRecommendation(0.7).condition).toBe('overcast');
  });
});

describe('isSunUp', () => {
  const sunrise = new Date();
  sunrise.setHours(6, 0, 0, 0);
  const sunset = new Date();
  sunset.setHours(19, 0, 0, 0);
  const solar: SolarClock = {
    sunriseMs: sunrise.getTime(),
    sunsetMs: sunset.getTime(),
  };

  it('returns true between sunrise and sunset', () => {
    const noon = new Date();
    noon.setHours(12, 0, 0, 0);
    expect(isSunUp(noon.getTime(), solar)).toBe(true);
  });

  it('returns false before sunrise', () => {
    const early = new Date();
    early.setHours(4, 0, 0, 0);
    expect(isSunUp(early.getTime(), solar)).toBe(false);
  });

  it('returns false after sunset', () => {
    const late = new Date();
    late.setHours(21, 0, 0, 0);
    expect(isSunUp(late.getTime(), solar)).toBe(false);
  });

  it('returns true at exactly sunrise', () => {
    expect(isSunUp(sunrise.getTime(), solar)).toBe(true);
  });

  it('returns false at exactly sunset (exclusive)', () => {
    expect(isSunUp(sunset.getTime(), solar)).toBe(false);
  });

  it('falls back to isDaylightFlag when sunrise/sunset missing', () => {
    expect(isSunUp(0, { isDaylightFlag: true })).toBe(true);
    expect(isSunUp(0, { isDaylightFlag: false })).toBe(false);
  });

  it('falls back to clock hour when no solar data', () => {
    const noon = new Date();
    noon.setHours(12, 0, 0, 0);
    expect(isSunUp(noon.getTime(), {})).toBe(true);

    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    expect(isSunUp(midnight.getTime(), {})).toBe(false);
  });
});

describe('getSolarPhase', () => {
  const sunrise = new Date();
  sunrise.setHours(6, 0, 0, 0);
  const sunset = new Date();
  sunset.setHours(19, 0, 0, 0);
  const solar: SolarClock = {
    sunriseMs: sunrise.getTime(),
    sunsetMs: sunset.getTime(),
  };

  it('returns "night" before sunrise', () => {
    const early = new Date();
    early.setHours(4, 0, 0, 0);
    expect(getSolarPhase(early.getTime(), solar)).toBe('night');
  });

  it('returns "morning" within 3 hours after sunrise', () => {
    const sevenAm = new Date();
    sevenAm.setHours(7, 0, 0, 0);
    expect(getSolarPhase(sevenAm.getTime(), solar)).toBe('morning');
  });

  it('returns "midday" between morning and evening windows', () => {
    const noon = new Date();
    noon.setHours(12, 0, 0, 0);
    expect(getSolarPhase(noon.getTime(), solar)).toBe('midday');
  });

  it('returns "evening" within 2 hours before sunset', () => {
    const sixPm = new Date();
    sixPm.setHours(18, 0, 0, 0);
    expect(getSolarPhase(sixPm.getTime(), solar)).toBe('evening');
  });

  it('returns "night" after sunset', () => {
    const late = new Date();
    late.setHours(21, 0, 0, 0);
    expect(getSolarPhase(late.getTime(), solar)).toBe('night');
  });
});
