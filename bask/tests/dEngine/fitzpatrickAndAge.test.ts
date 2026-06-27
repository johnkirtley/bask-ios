import { describe, it, expect } from 'vitest';
import { deriveFitzpatrickType, getAgeMultiplier, getExposurePercent } from '../../lib/dEngine';

describe('deriveFitzpatrickType', () => {
  describe('base skin tone mapping', () => {
    it('very-fair skin tone → Type 1 (with neutral sun reaction)', () => {
      expect(deriveFitzpatrickType('very-fair', 'burns-then-tans')).toBe(1);
    });

    it('fair skin tone → Type 2 (with neutral sun reaction)', () => {
      expect(deriveFitzpatrickType('fair', 'burns-then-tans')).toBe(2);
    });

    it('medium skin tone → Type 3 (with neutral sun reaction)', () => {
      expect(deriveFitzpatrickType('medium', 'burns-then-tans')).toBe(3);
    });

    it('olive skin tone → Type 4 (with neutral sun reaction)', () => {
      expect(deriveFitzpatrickType('olive', 'burns-then-tans')).toBe(4);
    });

    it('brown skin tone → Type 5 (with neutral sun reaction)', () => {
      expect(deriveFitzpatrickType('brown', 'burns-then-tans')).toBe(5);
    });

    it('dark-brown skin tone → Type 6 (with neutral sun reaction)', () => {
      expect(deriveFitzpatrickType('dark-brown', 'burns-then-tans')).toBe(6);
    });
  });

  describe('sun reaction modifiers', () => {
    it('"always-burns" lowers the type by 0.5 (rounds down)', () => {
      const neutral = deriveFitzpatrickType('medium', 'burns-then-tans');
      const burns = deriveFitzpatrickType('medium', 'always-burns');
      expect(burns).toBeLessThanOrEqual(neutral);
    });

    it('"rarely-burns" raises the type by 0.5 (rounds up)', () => {
      const neutral = deriveFitzpatrickType('medium', 'burns-then-tans');
      const rarelyBurns = deriveFitzpatrickType('medium', 'rarely-burns');
      expect(rarelyBurns).toBeGreaterThanOrEqual(neutral);
    });
  });

  describe('clamping', () => {
    it('very-fair + always-burns stays at 1 (not 0 or negative)', () => {
      expect(deriveFitzpatrickType('very-fair', 'always-burns')).toBe(1);
    });

    it('dark-brown + rarely-burns stays at 6 (not 7+)', () => {
      expect(deriveFitzpatrickType('dark-brown', 'rarely-burns')).toBe(6);
    });
  });

  describe('unknown inputs default to Type 3', () => {
    it('unknown skin tone defaults to base 3', () => {
      expect(deriveFitzpatrickType('unknown-tone', 'burns-then-tans')).toBe(3);
    });

    it('null/empty skin tone defaults to base 3', () => {
      expect(deriveFitzpatrickType('', 'burns-then-tans')).toBe(3);
    });
  });

  it('always returns a valid Fitzpatrick type (1-6)', () => {
    const tones = ['very-fair', 'fair', 'medium', 'olive', 'brown', 'dark-brown', 'unknown'];
    const reactions = ['always-burns', 'burns-then-tans', 'rarely-burns', 'unknown'];
    for (const tone of tones) {
      for (const reaction of reactions) {
        const result = deriveFitzpatrickType(tone, reaction);
        expect(result).toBeGreaterThanOrEqual(1);
        expect(result).toBeLessThanOrEqual(6);
        expect(Number.isInteger(result)).toBe(true);
      }
    }
  });
});

describe('getAgeMultiplier', () => {
  it('returns 1.0 for age < 30', () => {
    expect(getAgeMultiplier(18)).toBe(1.0);
    expect(getAgeMultiplier(25)).toBe(1.0);
    expect(getAgeMultiplier(29)).toBe(1.0);
  });

  it('returns 0.8 for 30 <= age < 50', () => {
    expect(getAgeMultiplier(30)).toBe(0.8);
    expect(getAgeMultiplier(40)).toBe(0.8);
    expect(getAgeMultiplier(49)).toBe(0.8);
  });

  it('returns 0.5 for 50 <= age < 70', () => {
    expect(getAgeMultiplier(50)).toBe(0.5);
    expect(getAgeMultiplier(60)).toBe(0.5);
    expect(getAgeMultiplier(69)).toBe(0.5);
  });

  it('returns 0.3 for age >= 70', () => {
    expect(getAgeMultiplier(70)).toBe(0.3);
    expect(getAgeMultiplier(85)).toBe(0.3);
  });

  it('returns 1.0 for null (conservative: assumes peak synthesis)', () => {
    expect(getAgeMultiplier(null)).toBe(1.0);
  });

  it('boundary: age exactly 30 is 0.8 (not 1.0)', () => {
    expect(getAgeMultiplier(30)).toBe(0.8);
  });

  it('boundary: age exactly 50 is 0.5 (not 0.8)', () => {
    expect(getAgeMultiplier(50)).toBe(0.5);
  });

  it('boundary: age exactly 70 is 0.3 (not 0.5)', () => {
    expect(getAgeMultiplier(70)).toBe(0.3);
  });

  it('monotonically non-increasing as age increases', () => {
    const ages = [20, 30, 40, 50, 60, 70, 80];
    const multipliers = ages.map((a) => getAgeMultiplier(a));
    for (let i = 1; i < multipliers.length; i++) {
      expect(multipliers[i]).toBeLessThanOrEqual(multipliers[i - 1]);
    }
  });
});

describe('getExposurePercent', () => {
  it('returns the inverse of coverage', () => {
    expect(getExposurePercent(0)).toBe(100);
    expect(getExposurePercent(50)).toBe(50);
    expect(getExposurePercent(100)).toBe(0);
  });

  it('full coverage = 0 exposure', () => {
    expect(getExposurePercent(100)).toBe(0);
  });

  it('no coverage = full exposure', () => {
    expect(getExposurePercent(0)).toBe(100);
  });
});
