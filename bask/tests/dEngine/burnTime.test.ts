import { describe, it, expect } from 'vitest';
import { calculateTimeToBurn, getBurnRiskLevel } from '../../lib/dEngine';

describe('calculateTimeToBurn', () => {
  it('higher UV → shorter burn time', () => {
    const skinType = 2 as const;
    expect(calculateTimeToBurn(11, skinType)).toBeLessThan(calculateTimeToBurn(5, skinType));
    expect(calculateTimeToBurn(5, skinType)).toBeLessThan(calculateTimeToBurn(3, skinType));
  });

  it('dark skin (Type VI) burns much slower than fair skin (Type I)', () => {
    const uv = 8;
    const fairBurn = calculateTimeToBurn(uv, 1);
    const darkBurn = calculateTimeToBurn(uv, 6);
    expect(darkBurn).toBeGreaterThan(fairBurn);
    expect(darkBurn / fairBurn).toBeGreaterThan(5);
  });

  it('matches the MED table: Type I at UV 1 = 67 min', () => {
    expect(calculateTimeToBurn(1, 1)).toBe(67);
  });

  it('matches the MED table: Type VI at UV 1 = 500 min', () => {
    expect(calculateTimeToBurn(1, 6)).toBe(500);
  });

  it('Type I at UV 5 is ~13-14 min (67/5)', () => {
    expect(calculateTimeToBurn(5, 1)).toBe(13);
  });

  it('Type III at UV 5 is ~40 min (200/5)', () => {
    expect(calculateTimeToBurn(5, 3)).toBe(40);
  });

  it('handles UV = 0 by treating it as max(1, uv) = 1 (does not divide by zero)', () => {
    const result = calculateTimeToBurn(0, 2);
    expect(result).toBe(100);
    expect(isFinite(result)).toBe(true);
  });

  it('all skin types produce increasing burn times from I to VI at same UV', () => {
    const uv = 6;
    const t1 = calculateTimeToBurn(uv, 1);
    const t2 = calculateTimeToBurn(uv, 2);
    const t3 = calculateTimeToBurn(uv, 3);
    const t4 = calculateTimeToBurn(uv, 4);
    const t5 = calculateTimeToBurn(uv, 5);
    const t6 = calculateTimeToBurn(uv, 6);
    expect(t1).toBeLessThan(t2);
    expect(t2).toBeLessThan(t3);
    expect(t3).toBeLessThan(t4);
    expect(t4).toBeLessThan(t5);
    expect(t5).toBeLessThan(t6);
  });
});

describe('getBurnRiskLevel', () => {
  it('returns "Low" for UV < 3', () => {
    expect(getBurnRiskLevel(0)).toBe('Low');
    expect(getBurnRiskLevel(2)).toBe('Low');
    expect(getBurnRiskLevel(2.99)).toBe('Low');
  });

  it('returns "Moderate" for 3 <= UV < 6', () => {
    expect(getBurnRiskLevel(3)).toBe('Moderate');
    expect(getBurnRiskLevel(5)).toBe('Moderate');
    expect(getBurnRiskLevel(5.99)).toBe('Moderate');
  });

  it('returns "High" for 6 <= UV < 8', () => {
    expect(getBurnRiskLevel(6)).toBe('High');
    expect(getBurnRiskLevel(7)).toBe('High');
    expect(getBurnRiskLevel(7.99)).toBe('High');
  });

  it('returns "Very High" for 8 <= UV < 11', () => {
    expect(getBurnRiskLevel(8)).toBe('Very High');
    expect(getBurnRiskLevel(10)).toBe('Very High');
    expect(getBurnRiskLevel(10.99)).toBe('Very High');
  });

  it('returns "Extreme" for UV >= 11', () => {
    expect(getBurnRiskLevel(11)).toBe('Extreme');
    expect(getBurnRiskLevel(15)).toBe('Extreme');
  });

  it('boundary: UV exactly 3 is Moderate (not Low)', () => {
    expect(getBurnRiskLevel(3)).toBe('Moderate');
  });

  it('boundary: UV exactly 6 is High (not Moderate)', () => {
    expect(getBurnRiskLevel(6)).toBe('High');
  });

  it('boundary: UV exactly 8 is Very High (not High)', () => {
    expect(getBurnRiskLevel(8)).toBe('Very High');
  });

  it('boundary: UV exactly 11 is Extreme (not Very High)', () => {
    expect(getBurnRiskLevel(11)).toBe('Extreme');
  });
});
