import { describe, it, expect } from 'vitest';
import {
  calculateVitaminD,
  vitaminDRatePerMinute,
  calculateTimeToGoal,
  calculateDailyDecayAmount,
  calculateDecay,
  BASE_IU_PER_MINUTE,
} from '../../lib/dEngine';

const DEFAULT_EXPOSURE = 50;
const DEFAULT_SKIN_TYPE = 3 as const;
const DEFAULT_AGE = 30;

describe('vitaminDRatePerMinute (Shadow Rule)', () => {
  it('returns 0 for UV < 3 (the Shadow Rule)', () => {
    expect(vitaminDRatePerMinute(0, DEFAULT_EXPOSURE, DEFAULT_SKIN_TYPE, DEFAULT_AGE)).toBe(0);
    expect(vitaminDRatePerMinute(2, DEFAULT_EXPOSURE, DEFAULT_SKIN_TYPE, DEFAULT_AGE)).toBe(0);
    expect(vitaminDRatePerMinute(2.99, DEFAULT_EXPOSURE, DEFAULT_SKIN_TYPE, DEFAULT_AGE)).toBe(0);
  });

  it('returns positive rate for UV = 3.0 (synthesis just barely starts)', () => {
    const rate = vitaminDRatePerMinute(3.0, DEFAULT_EXPOSURE, DEFAULT_SKIN_TYPE, DEFAULT_AGE);
    expect(rate).toBeGreaterThan(0);
  });

  it('returns higher rate for higher UV at the same skin/exposure/age', () => {
    const rate3 = vitaminDRatePerMinute(3, DEFAULT_EXPOSURE, DEFAULT_SKIN_TYPE, DEFAULT_AGE);
    const rate7 = vitaminDRatePerMinute(7, DEFAULT_EXPOSURE, DEFAULT_SKIN_TYPE, DEFAULT_AGE);
    const rate11 = vitaminDRatePerMinute(11, DEFAULT_EXPOSURE, DEFAULT_SKIN_TYPE, DEFAULT_AGE);
    expect(rate3).toBeGreaterThan(0);
    expect(rate7).toBeGreaterThan(rate3);
    expect(rate11).toBeGreaterThan(rate7);
  });

  it('returns 0 when exposure is 0', () => {
    expect(vitaminDRatePerMinute(10, 0, DEFAULT_SKIN_TYPE, DEFAULT_AGE)).toBe(0);
    expect(vitaminDRatePerMinute(10, -5, DEFAULT_SKIN_TYPE, DEFAULT_AGE)).toBe(0);
  });

  it('scales inversely with skin multiplier (fair skin synthesizes faster)', () => {
    const uv = 8;
    const exp = DEFAULT_EXPOSURE;
    const age = DEFAULT_AGE;
    const rate1 = vitaminDRatePerMinute(uv, exp, 1, age);
    const rate3 = vitaminDRatePerMinute(uv, exp, 3, age);
    const rate6 = vitaminDRatePerMinute(uv, exp, 6, age);
    expect(rate1).toBeGreaterThan(rate3);
    expect(rate3).toBeGreaterThan(rate6);
  });

  it('scales down with age', () => {
    const uv = 8;
    const exp = DEFAULT_EXPOSURE;
    const rate25 = vitaminDRatePerMinute(uv, exp, DEFAULT_SKIN_TYPE, 25);
    const rate50 = vitaminDRatePerMinute(uv, exp, DEFAULT_SKIN_TYPE, 50);
    const rate70 = vitaminDRatePerMinute(uv, exp, DEFAULT_SKIN_TYPE, 70);
    expect(rate25).toBeGreaterThan(rate50);
    expect(rate50).toBeGreaterThan(rate70);
  });

  it('produces the exact formula output: (UV/10) * (exp/100) * (1/skin) * ageFactor * BASE_IU_PER_MINUTE', () => {
    const uv = 7;
    const exp = 60;
    const skin = 3;
    const age = 35;
    const expected = (7 / 10) * (60 / 100) * (1 / 3.0) * 0.8 * BASE_IU_PER_MINUTE;
    expect(vitaminDRatePerMinute(uv, exp, skin as 3, age)).toBeCloseTo(expected, 5);
  });
});

describe('calculateVitaminD', () => {
  it('returns 0 for UV < 3 (Shadow Rule)', () => {
    expect(calculateVitaminD(0, 60, DEFAULT_EXPOSURE, DEFAULT_SKIN_TYPE, DEFAULT_AGE)).toBe(0);
    expect(calculateVitaminD(2, 60, DEFAULT_EXPOSURE, DEFAULT_SKIN_TYPE, DEFAULT_AGE)).toBe(0);
    expect(calculateVitaminD(2.99, 60, DEFAULT_EXPOSURE, DEFAULT_SKIN_TYPE, DEFAULT_AGE)).toBe(0);
  });

  it('returns 0 for 0 minutes of exposure', () => {
    expect(calculateVitaminD(10, 0, DEFAULT_EXPOSURE, DEFAULT_SKIN_TYPE, DEFAULT_AGE)).toBe(0);
  });

  it('returns positive IU for UV >= 3 and positive minutes', () => {
    expect(calculateVitaminD(5, 15, DEFAULT_EXPOSURE, DEFAULT_SKIN_TYPE, DEFAULT_AGE)).toBeGreaterThan(0);
    expect(calculateVitaminD(10, 30, DEFAULT_EXPOSURE, DEFAULT_SKIN_TYPE, DEFAULT_AGE)).toBeGreaterThan(0);
  });

  it('produces more IU with longer exposure (up to saturation)', () => {
    const uv = 6;
    const iu15 = calculateVitaminD(uv, 15, DEFAULT_EXPOSURE, DEFAULT_SKIN_TYPE, DEFAULT_AGE);
    const iu30 = calculateVitaminD(uv, 30, DEFAULT_EXPOSURE, DEFAULT_SKIN_TYPE, DEFAULT_AGE);
    expect(iu30).toBeGreaterThan(iu15);
  });

  it('diminishing returns past burn threshold (saturation)', () => {
    const uv = 5;
    const skinType = 2 as const;
    const timeToBurn = Math.round(100 / 5); // 20 min for Type II at UV 5
    const iuAtBurn = calculateVitaminD(uv, timeToBurn, DEFAULT_EXPOSURE, skinType, DEFAULT_AGE);
    const iu2xBurn = calculateVitaminD(uv, timeToBurn * 2, DEFAULT_EXPOSURE, skinType, DEFAULT_AGE);
    const iu4xBurn = calculateVitaminD(uv, timeToBurn * 4, DEFAULT_EXPOSURE, skinType, DEFAULT_AGE);

    expect(iu2xBurn).toBeGreaterThan(iuAtBurn);
    expect(iu4xBurn).toBeGreaterThan(iu2xBurn);
    const extra2x = iu2xBurn - iuAtBurn;
    const extra4x = iu4xBurn - iu2xBurn;
    expect(extra4x).toBeLessThan(extra2x);
  });

  it('fair skin (Type I) produces more IU than dark skin (Type VI) at the same UV/time', () => {
    const uv = 7;
    const minutes = 20;
    const iuType1 = calculateVitaminD(uv, minutes, DEFAULT_EXPOSURE, 1, DEFAULT_AGE);
    const iuType6 = calculateVitaminD(uv, minutes, DEFAULT_EXPOSURE, 6, DEFAULT_AGE);
    expect(iuType1).toBeGreaterThan(iuType6);
  });

  it('young person produces more IU than older person at same UV/time', () => {
    const uv = 7;
    const minutes = 20;
    const iu25 = calculateVitaminD(uv, minutes, DEFAULT_EXPOSURE, DEFAULT_SKIN_TYPE, 25);
    const iu70 = calculateVitaminD(uv, minutes, DEFAULT_EXPOSURE, DEFAULT_SKIN_TYPE, 70);
    expect(iu25).toBeGreaterThan(iu70);
  });

  it('never returns negative IU', () => {
    expect(calculateVitaminD(10, 60, DEFAULT_EXPOSURE, DEFAULT_SKIN_TYPE, DEFAULT_AGE)).toBeGreaterThanOrEqual(0);
    expect(calculateVitaminD(10, 600, DEFAULT_EXPOSURE, DEFAULT_SKIN_TYPE, DEFAULT_AGE)).toBeGreaterThanOrEqual(0);
  });
});

describe('calculateTimeToGoal', () => {
  it('returns Infinity for UV < 3', () => {
    expect(calculateTimeToGoal(2000, 0, DEFAULT_EXPOSURE, DEFAULT_SKIN_TYPE, DEFAULT_AGE)).toBe(Infinity);
    expect(calculateTimeToGoal(2000, 2.9, DEFAULT_EXPOSURE, DEFAULT_SKIN_TYPE, DEFAULT_AGE)).toBe(Infinity);
  });

  it('returns Infinity for 0 exposure', () => {
    expect(calculateTimeToGoal(2000, 8, 0, DEFAULT_SKIN_TYPE, DEFAULT_AGE)).toBe(Infinity);
  });

  it('returns Infinity for target IU <= 0', () => {
    expect(calculateTimeToGoal(0, 8, DEFAULT_EXPOSURE, DEFAULT_SKIN_TYPE, DEFAULT_AGE)).toBe(Infinity);
    expect(calculateTimeToGoal(-100, 8, DEFAULT_EXPOSURE, DEFAULT_SKIN_TYPE, DEFAULT_AGE)).toBe(Infinity);
  });

  it('returns positive minutes for achievable goals', () => {
    const mins = calculateTimeToGoal(1000, 8, DEFAULT_EXPOSURE, DEFAULT_SKIN_TYPE, DEFAULT_AGE);
    expect(mins).toBeGreaterThan(0);
    expect(isFinite(mins)).toBe(true);
  });

  it('takes longer for higher goals at same UV', () => {
    const t500 = calculateTimeToGoal(500, 8, DEFAULT_EXPOSURE, DEFAULT_SKIN_TYPE, DEFAULT_AGE);
    const t2000 = calculateTimeToGoal(2000, 8, DEFAULT_EXPOSURE, DEFAULT_SKIN_TYPE, DEFAULT_AGE);
    expect(t2000).toBeGreaterThan(t500);
  });

  it('takes longer at lower UV for same goal', () => {
    const tAtHigh = calculateTimeToGoal(1000, 10, DEFAULT_EXPOSURE, DEFAULT_SKIN_TYPE, DEFAULT_AGE);
    const tAtLow = calculateTimeToGoal(1000, 4, DEFAULT_EXPOSURE, DEFAULT_SKIN_TYPE, DEFAULT_AGE);
    expect(tAtLow).toBeGreaterThan(tAtHigh);
  });

  it('takes longer for darker skin', () => {
    const tFair = calculateTimeToGoal(1000, 8, DEFAULT_EXPOSURE, 1, DEFAULT_AGE);
    const tDark = calculateTimeToGoal(1000, 8, DEFAULT_EXPOSURE, 6, DEFAULT_AGE);
    expect(tDark).toBeGreaterThan(tFair);
  });
});

describe('calculateDailyDecayAmount', () => {
  it('returns ~4.48% of current IU per day', () => {
    const amount = calculateDailyDecayAmount(10000);
    expect(amount).toBeGreaterThan(400);
    expect(amount).toBeLessThan(500);
  });

  it('returns 0 for 0 IU', () => {
    expect(calculateDailyDecayAmount(0)).toBe(0);
  });

  it('scales linearly with IU', () => {
    const small = calculateDailyDecayAmount(1000);
    const large = calculateDailyDecayAmount(10000);
    expect(large).toBeGreaterThan(small);
  });
});

describe('calculateDecay', () => {
  it('returns the initial IU at 0 days', () => {
    expect(calculateDecay(10000, 0)).toBe(10000);
  });

  it('halves approximately every 15 days (half-life)', () => {
    const initial = 10000;
    const at15 = calculateDecay(initial, 15);
    expect(at15).toBeCloseTo(5000, -2);
  });

  it('decays toward 0 over long periods', () => {
    const at60 = calculateDecay(10000, 60);
    expect(at60).toBeLessThan(1000);
  });
});
