import { describe, it, expect } from 'vitest';
import { getMascotMood } from '../../lib/mascotUtils';

describe('getMascotMood — priority ordering (sleepy > burning > cloudy > excited > happy)', () => {
  it('returns "sleepy" when isNight is true', () => {
    expect(getMascotMood({ isNight: true })).toBe('sleepy');
  });

  it('sleepy takes priority over burning', () => {
    expect(getMascotMood({ isNight: true, sunburnRisk: 'high' })).toBe('sleepy');
  });

  it('returns "burning" when sunburnRisk is high', () => {
    expect(getMascotMood({ sunburnRisk: 'high' })).toBe('burning');
  });

  it('burning takes priority over cloudy', () => {
    expect(getMascotMood({ sunburnRisk: 'high', uvIndex: 0 })).toBe('burning');
  });

  it('returns "cloudy" when UV < 1.5', () => {
    expect(getMascotMood({ uvIndex: 0 })).toBe('cloudy');
    expect(getMascotMood({ uvIndex: 1.4 })).toBe('cloudy');
  });

  it('cloudy takes priority over excited', () => {
    expect(getMascotMood({ uvIndex: 0, goalProgress: 1.5 })).toBe('cloudy');
  });

  it('returns "excited" when goalProgress >= 1.0', () => {
    expect(getMascotMood({ goalProgress: 1.0 })).toBe('excited');
    expect(getMascotMood({ goalProgress: 2.0 })).toBe('excited');
  });

  it('returns "happy" as the default fallback', () => {
    expect(getMascotMood({})).toBe('happy');
  });
});

describe('getMascotMood — individual branches', () => {
  it('moderate sunburnRisk does NOT trigger burning', () => {
    expect(getMascotMood({ sunburnRisk: 'moderate' })).not.toBe('burning');
  });

  it('low sunburnRisk does NOT trigger burning', () => {
    expect(getMascotMood({ sunburnRisk: 'low' })).not.toBe('burning');
  });

  it('UV exactly 1.5 does NOT trigger cloudy (boundary is <)', () => {
    expect(getMascotMood({ uvIndex: 1.5 })).not.toBe('cloudy');
  });

  it('goalProgress < 1.0 does NOT trigger excited', () => {
    expect(getMascotMood({ goalProgress: 0.99 })).not.toBe('excited');
  });

  it('goalProgress = 0 triggers happy (not excited)', () => {
    expect(getMascotMood({ goalProgress: 0 })).toBe('happy');
  });
});

describe('getMascotMood — realistic combinations', () => {
  it('midday clear sky, no goal progress → happy', () => {
    expect(getMascotMood({ uvIndex: 8, sunburnRisk: 'low', goalProgress: 0.3 })).toBe('happy');
  });

  it('midday clear sky, goal reached → excited', () => {
    expect(getMascotMood({ uvIndex: 8, sunburnRisk: 'low', goalProgress: 1.2 })).toBe('excited');
  });

  it('high UV + high burn risk → burning (even with goal reached)', () => {
    expect(getMascotMood({ uvIndex: 11, sunburnRisk: 'high', goalProgress: 1.5 })).toBe('burning');
  });

  it('overcast day → cloudy', () => {
    expect(getMascotMood({ uvIndex: 0.5 })).toBe('cloudy');
  });

  it('night → sleepy regardless of everything', () => {
    expect(getMascotMood({ isNight: true, uvIndex: 0, sunburnRisk: 'high', goalProgress: 2 })).toBe('sleepy');
  });
});
