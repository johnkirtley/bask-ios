import { describe, it, expect } from 'vitest';
import { effectiveUv } from '../../lib/dEngine';

describe('effectiveUv', () => {
  describe('no cloud cover', () => {
    it('returns raw UV unchanged when cloudCover is 0', () => {
      expect(effectiveUv(10, 0)).toBe(10);
      expect(effectiveUv(3, 0)).toBe(3);
      expect(effectiveUv(0, 0)).toBe(0);
    });

    it('returns raw UV unchanged when cloudCover is undefined', () => {
      expect(effectiveUv(10)).toBe(10);
      expect(effectiveUv(7)).toBe(7);
      expect(effectiveUv(0)).toBe(0);
    });
  });

  describe('partial cloud cover', () => {
    it('attenuates UV by the formula raw * (1 - cloudCover * 0.7)', () => {
      expect(effectiveUv(10, 0.5)).toBeCloseTo(6.5, 10);
      expect(effectiveUv(10, 0.3)).toBeCloseTo(7.9, 10);
      expect(effectiveUv(8, 0.4)).toBeCloseTo(5.76, 10);
    });

    it('can drop UV below the synthesis threshold (3) with enough cloud cover', () => {
      expect(effectiveUv(3, 0.5)).toBeCloseTo(1.95, 10);
      expect(effectiveUv(4, 0.6)).toBeCloseTo(2.32, 10);
    });
  });

  describe('full cloud cover (overcast)', () => {
    it('blocks at most 70% of UV, never 100%', () => {
      expect(effectiveUv(10, 1.0)).toBeCloseTo(3.0, 10);
      expect(effectiveUv(7, 1.0)).toBeCloseTo(2.1, 10);
      expect(effectiveUv(3, 1.0)).toBeCloseTo(0.9, 10);
    });

    it('still allows some UV through at maximum cloud cover', () => {
      expect(effectiveUv(11, 1.0)).toBeCloseTo(3.3, 10);
      expect(effectiveUv(11, 1.0)).toBeGreaterThan(3);
    });
  });

  describe('edge cases', () => {
    it('handles UV of 0 regardless of cloud cover', () => {
      expect(effectiveUv(0, 0.5)).toBe(0);
      expect(effectiveUv(0, 1.0)).toBe(0);
      expect(effectiveUv(0)).toBe(0);
    });

    it('handles extreme UV values', () => {
      expect(effectiveUv(15, 0)).toBe(15);
      expect(effectiveUv(15, 0.5)).toBeCloseTo(9.75, 10);
      expect(effectiveUv(15, 1.0)).toBeCloseTo(4.5, 10);
    });

    it('handles very low UV below synthesis threshold', () => {
      expect(effectiveUv(1, 0.5)).toBeCloseTo(0.65, 10);
      expect(effectiveUv(2, 0)).toBe(2);
      expect(effectiveUv(2.9, 0.5)).toBeCloseTo(1.885, 10);
    });
  });

  describe('synthesis threshold boundary', () => {
    it('UV 3 at 0 cloud → 3.0 (synthesis possible)', () => {
      expect(effectiveUv(3, 0)).toBe(3);
    });

    it('UV 3 at any cloud cover > 0 drops below 3 (synthesis blocked)', () => {
      expect(effectiveUv(3, 0.01)).toBeLessThan(3);
      expect(effectiveUv(3, 0.5)).toBeLessThan(3);
    });

    it('UV 10 at 1.0 cloud → exactly 3.0 (synthesis barely possible at max cloud + high UV)', () => {
      expect(effectiveUv(10, 1.0)).toBeCloseTo(3.0, 10);
    });
  });
});
