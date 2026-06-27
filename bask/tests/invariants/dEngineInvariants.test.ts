import { describe, it, expect } from 'vitest';
import {
  effectiveUv,
  calculateVitaminD,
  vitaminDRatePerMinute,
  calculateTimeToBurn,
  calculateTimeToGoal,
  getAgeMultiplier,
  getBurnRiskLevel,
  type FitzpatrickType,
} from '../../lib/dEngine';

const UV_RANGE = [0, 0.5, 1, 2, 2.99, 3, 3.5, 5, 6, 7, 8, 9, 10, 11, 12, 15];
const CLOUD_RANGE = [0, 0.1, 0.25, 0.3, 0.5, 0.7, 0.9, 1.0];
const SKIN_TYPES: FitzpatrickType[] = [1, 2, 3, 4, 5, 6];
const EXPOSURE_RANGE = [0, 5, 10, 20, 30, 50, 70, 90, 100];
const AGE_RANGE = [18, 25, 29, 30, 40, 49, 50, 60, 69, 70, 80, null];

describe('Invariants — effectiveUv', () => {
  for (const uv of UV_RANGE) {
    for (const cloud of CLOUD_RANGE) {
      it(`effectiveUv(${uv}, ${cloud}) <= ${uv} (clouds never increase UV)`, () => {
        expect(effectiveUv(uv, cloud)).toBeLessThanOrEqual(uv + 1e-10);
      });

      it(`effectiveUv(${uv}, ${cloud}) >= 0 (never negative for non-negative inputs)`, () => {
        expect(effectiveUv(uv, cloud)).toBeGreaterThanOrEqual(0);
      });
    }
  }

  for (const uv of UV_RANGE) {
    it(`effectiveUv(${uv}) === effectiveUv(${uv}, undefined) === effectiveUv(${uv}, 0)`, () => {
      expect(effectiveUv(uv)).toBe(effectiveUv(uv, 0));
      expect(effectiveUv(uv, undefined)).toBe(uv);
    });
  }

  it('effectiveUv monotonically decreases as cloud cover increases', () => {
    for (const uv of [3, 5, 8, 10, 15]) {
      let prev = Infinity;
      for (const cloud of [0, 0.1, 0.25, 0.5, 0.75, 1.0]) {
        const current = effectiveUv(uv, cloud);
        expect(current).toBeLessThanOrEqual(prev + 1e-10);
        prev = current;
      }
    }
  });
});

describe('Invariants — vitaminDRatePerMinute (Shadow Rule)', () => {
  for (const uv of [0, 0.5, 1, 2, 2.5, 2.99]) {
    for (const skin of SKIN_TYPES) {
      it(`vitaminDRatePerMinute(${uv}, 50, ${skin}, 30) === 0 (Shadow Rule: UV < 3)`, () => {
        expect(vitaminDRatePerMinute(uv, 50, skin, 30)).toBe(0);
      });
    }
  }

  for (const uv of UV_RANGE) {
    for (const exposure of EXPOSURE_RANGE) {
      it(`vitaminDRatePerMinute(${uv}, ${exposure}, 3, 30) >= 0 (never negative)`, () => {
        expect(vitaminDRatePerMinute(uv, exposure, 3, 30)).toBeGreaterThanOrEqual(0);
      });
    }
  }

  it('vitaminDRatePerMinute = 0 for exposure = 0 regardless of UV', () => {
    for (const uv of [3, 5, 8, 11, 15]) {
      expect(vitaminDRatePerMinute(uv, 0, 3, 30)).toBe(0);
    }
  });
});

describe('Invariants — calculateVitaminD', () => {
  for (const uv of UV_RANGE) {
    for (const minutes of [0, 1, 5, 15, 30, 60, 120]) {
      it(`calculateVitaminD(${uv}, ${minutes}, 50, 3, 30) >= 0 (never negative)`, () => {
        expect(calculateVitaminD(uv, minutes, 50, 3, 30)).toBeGreaterThanOrEqual(0);
      });
    }
  }

  it('calculateVitaminD = 0 for 0 minutes regardless of UV', () => {
    for (const uv of [3, 5, 8, 11]) {
      expect(calculateVitaminD(uv, 0, 50, 3, 30)).toBe(0);
    }
  });

  it('calculateVitaminD = 0 for UV < 3 regardless of minutes', () => {
    for (const minutes of [1, 15, 60, 600]) {
      expect(calculateVitaminD(2, minutes, 50, 3, 30)).toBe(0);
    }
  });

  it('calculateVitaminD is monotonically non-decreasing with minutes (at UV 8)', () => {
    let prev = 0;
    for (const minutes of [1, 5, 10, 15, 20, 30, 45, 60, 90, 120, 240]) {
      const current = calculateVitaminD(8, minutes, 50, 3, 30);
      expect(current).toBeGreaterThanOrEqual(prev);
      prev = current;
    }
  });
});

describe('Invariants — calculateTimeToBurn', () => {
  for (const skin of SKIN_TYPES) {
    it(`calculateTimeToBurn monotonically decreases as UV increases (skin ${skin})`, () => {
      let prev = Infinity;
      for (const uv of [1, 2, 3, 5, 7, 9, 11, 15]) {
        const current = calculateTimeToBurn(uv, skin);
        expect(current).toBeLessThanOrEqual(prev);
        prev = current;
      }
    });
  }

  it('calculateTimeToBurn for skin VI > skin I at the same UV', () => {
    for (const uv of [3, 5, 8, 11]) {
      expect(calculateTimeToBurn(uv, 6)).toBeGreaterThan(calculateTimeToBurn(uv, 1));
    }
  });

  it('calculateTimeToBurn is always positive for UV > 0', () => {
    for (const skin of SKIN_TYPES) {
      for (const uv of [1, 3, 5, 8, 11, 15]) {
        expect(calculateTimeToBurn(uv, skin)).toBeGreaterThan(0);
      }
    }
  });

  it('calculateTimeToBurn never returns NaN or Infinity for valid UV', () => {
    for (const skin of SKIN_TYPES) {
      for (const uv of [1, 3, 5, 8, 11, 15]) {
        const result = calculateTimeToBurn(uv, skin);
        expect(isFinite(result)).toBe(true);
        expect(Number.isNaN(result)).toBe(false);
      }
    }
  });
});

describe('Invariants — calculateTimeToGoal', () => {
  it('returns Infinity for UV < 3 regardless of goal', () => {
    for (const goal of [100, 500, 2000, 10000]) {
      expect(calculateTimeToGoal(goal, 2, 50, 3, 30)).toBe(Infinity);
    }
  });

  it('returns Infinity for exposure = 0', () => {
    expect(calculateTimeToGoal(2000, 8, 0, 3, 30)).toBe(Infinity);
  });

  it('returns Infinity for goal <= 0', () => {
    expect(calculateTimeToGoal(0, 8, 50, 3, 30)).toBe(Infinity);
    expect(calculateTimeToGoal(-1, 8, 50, 3, 30)).toBe(Infinity);
  });
});

describe('Invariants — getAgeMultiplier', () => {
  it('is monotonically non-increasing as age increases (excluding null)', () => {
    const ages = [18, 25, 29, 30, 40, 49, 50, 60, 69, 70, 80];
    const multipliers = ages.map((a) => getAgeMultiplier(a));
    for (let i = 1; i < multipliers.length; i++) {
      expect(multipliers[i]).toBeLessThanOrEqual(multipliers[i - 1]);
    }
  });

  it('null age returns 1.0 (conservative: assumes peak synthesis)', () => {
    expect(getAgeMultiplier(null)).toBe(1.0);
  });

  it('always returns a value in [0.3, 1.0]', () => {
    for (const age of AGE_RANGE) {
      const m = getAgeMultiplier(age);
      expect(m).toBeGreaterThanOrEqual(0.3);
      expect(m).toBeLessThanOrEqual(1.0);
    }
  });
});

describe('Invariants — getBurnRiskLevel', () => {
  it('risk level is monotonically non-decreasing with UV', () => {
    const levels = ['Low', 'Moderate', 'High', 'Very High', 'Extreme'];
    let prevIndex = -1;
    for (const uv of [0, 1, 3, 5, 6, 7, 8, 10, 11, 15]) {
      const level = getBurnRiskLevel(uv);
      const currentIndex = levels.indexOf(level);
      expect(currentIndex).toBeGreaterThanOrEqual(prevIndex);
      prevIndex = currentIndex;
    }
  });
});

describe('Invariants — skin type ordering', () => {
  it('fair skin (Type I) synthesizes faster than dark skin (Type VI) at same UV', () => {
    for (const uv of [3, 5, 8, 11]) {
      const rate1 = vitaminDRatePerMinute(uv, 50, 1, 30);
      const rate6 = vitaminDRatePerMinute(uv, 50, 6, 30);
      expect(rate1).toBeGreaterThan(rate6);
    }
  });

  it('rates are strictly ordered I > II > III > IV > V > VI at same UV', () => {
    const uv = 8;
    const rates = SKIN_TYPES.map((s) => vitaminDRatePerMinute(uv, 50, s, 30));
    for (let i = 1; i < rates.length; i++) {
      expect(rates[i]).toBeLessThan(rates[i - 1]);
    }
  });
});
