import { describe, it, expect } from 'vitest';
import {
  toNgMl,
  fromNgMl,
  classifyNgMl,
  formatLabValue,
  getLabInterpretation,
  validateLabEntry,
  NMOL_PER_NG,
  REFERENCE_BANDS,
  type LabUnit,
} from '../../lib/labUtils';

describe('toNgMl — unit conversion', () => {
  it('passes through ng/mL unchanged', () => {
    expect(toNgMl(42, 'ng/mL')).toBe(42);
    expect(toNgMl(0, 'ng/mL')).toBe(0);
  });

  it('converts nmol/L to ng/mL by dividing by 2.5', () => {
    expect(toNgMl(50, 'nmol/L')).toBe(20);
    expect(toNgMl(75, 'nmol/L')).toBe(30);
    expect(toNgMl(100, 'nmol/L')).toBe(40);
  });

  it('rounds to 1 decimal place', () => {
    expect(toNgMl(51, 'nmol/L')).toBe(20.4);
    expect(toNgMl(63, 'nmol/L')).toBe(25.2);
  });
});

describe('fromNgMl — reverse conversion', () => {
  it('passes through ng/mL unchanged', () => {
    expect(fromNgMl(42, 'ng/mL')).toBe(42);
  });

  it('converts ng/mL to nmol/L by multiplying by 2.5', () => {
    expect(fromNgMl(20, 'nmol/L')).toBe(50);
    expect(fromNgMl(40, 'nmol/L')).toBe(100);
  });

  it('rounds to 1 decimal place', () => {
    expect(fromNgMl(25.2, 'nmol/L')).toBe(63);
  });

  it('toNgMl and fromNgMl are inverses', () => {
    for (const val of [10, 25, 50, 75, 100]) {
      const ngMl = toNgMl(val, 'nmol/L');
      const back = fromNgMl(ngMl, 'nmol/L');
      expect(back).toBeCloseTo(val, 1);
    }
  });
});

describe('classifyNgMl — 4 reference bands', () => {
  it('classifies < 20 ng/mL as deficient', () => {
    expect(classifyNgMl(0).status).toBe('deficient');
    expect(classifyNgMl(10).status).toBe('deficient');
    expect(classifyNgMl(19.9).status).toBe('deficient');
  });

  it('classifies 20-29.9 ng/mL as insufficient', () => {
    expect(classifyNgMl(20).status).toBe('insufficient');
    expect(classifyNgMl(25).status).toBe('insufficient');
    expect(classifyNgMl(29.9).status).toBe('insufficient');
  });

  it('classifies 30-49.9 ng/mL as sufficient', () => {
    expect(classifyNgMl(30).status).toBe('sufficient');
    expect(classifyNgMl(40).status).toBe('sufficient');
    expect(classifyNgMl(49.9).status).toBe('sufficient');
  });

  it('classifies >= 50 ng/mL as optimal', () => {
    expect(classifyNgMl(50).status).toBe('optimal');
    expect(classifyNgMl(80).status).toBe('optimal');
    expect(classifyNgMl(150).status).toBe('optimal');
  });

  it('boundary: 20 is insufficient (not deficient)', () => {
    expect(classifyNgMl(20).status).toBe('insufficient');
  });

  it('boundary: 30 is sufficient (not insufficient)', () => {
    expect(classifyNgMl(30).status).toBe('sufficient');
  });

  it('boundary: 50 is optimal (not sufficient)', () => {
    expect(classifyNgMl(50).status).toBe('optimal');
  });

  it('returns the full ReferenceBand object with label and color', () => {
    const band = classifyNgMl(35);
    expect(band.status).toBe('sufficient');
    expect(band.label).toBe('Sufficient');
    expect(band.color).toBeTruthy();
    expect(band.min).toBe(30);
    expect(band.max).toBe(50);
  });
});

describe('formatLabValue', () => {
  it('formats with the correct unit', () => {
    expect(formatLabValue(42, 'ng/mL')).toBe('42 ng/mL');
    expect(formatLabValue(42, 'nmol/L')).toBe('105 nmol/L');
  });

  it('formats with 1 decimal precision', () => {
    expect(formatLabValue(42.5, 'ng/mL')).toBe('42.5 ng/mL');
  });
});

describe('getLabInterpretation', () => {
  it('returns deficient headline and detail for < 20 ng/mL', () => {
    const result = getLabInterpretation(15);
    expect(result.band.status).toBe('deficient');
    expect(result.headline).toBeTruthy();
    expect(result.detail).toBeTruthy();
    expect(result.detail.length).toBeGreaterThan(20);
  });

  it('returns insufficient interpretation for 20-30', () => {
    const result = getLabInterpretation(25);
    expect(result.band.status).toBe('insufficient');
    expect(result.headline).toBeTruthy();
  });

  it('returns sufficient interpretation for 30-50', () => {
    const result = getLabInterpretation(40);
    expect(result.band.status).toBe('sufficient');
    expect(result.headline).toBeTruthy();
  });

  it('returns optimal interpretation for >= 50', () => {
    const result = getLabInterpretation(60);
    expect(result.band.status).toBe('optimal');
    expect(result.headline).toBeTruthy();
  });

  it('all interpretations have non-empty headline and detail', () => {
    for (const ngMl of [5, 15, 25, 40, 60, 80]) {
      const result = getLabInterpretation(ngMl);
      expect(result.headline.length).toBeGreaterThan(5);
      expect(result.detail.length).toBeGreaterThan(10);
    }
  });
});

describe('validateLabEntry', () => {
  const validDate = new Date();
  validDate.setMonth(validDate.getMonth() - 1);
  const dateStr = validDate.toISOString().split('T')[0];

  it('accepts a valid entry', () => {
    const result = validateLabEntry({
      value: '35',
      unit: 'ng/mL',
      testDate: dateStr,
    });
    expect(result.ok).toBe(true);
    expect(result.ngMl).toBe(35);
    expect(result.value).toBe(35);
  });

  it('rejects empty value', () => {
    const result = validateLabEntry({ value: '', unit: 'ng/mL', testDate: dateStr });
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('rejects non-numeric value', () => {
    const result = validateLabEntry({ value: 'abc', unit: 'ng/mL', testDate: dateStr });
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('rejects zero or negative values', () => {
    expect(validateLabEntry({ value: '0', unit: 'ng/mL', testDate: dateStr }).ok).toBe(false);
    expect(validateLabEntry({ value: '-5', unit: 'ng/mL', testDate: dateStr }).ok).toBe(false);
  });

  it('rejects unreasonably high values (> 150 ng/mL)', () => {
    const result = validateLabEntry({ value: '400', unit: 'ng/mL', testDate: dateStr });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('high');
  });

  it('rejects missing test date', () => {
    const result = validateLabEntry({ value: '35', unit: 'ng/mL', testDate: '' });
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('rejects future test dates', () => {
    const future = new Date();
    future.setDate(future.getDate() + 30);
    const result = validateLabEntry({
      value: '35',
      unit: 'ng/mL',
      testDate: future.toISOString().split('T')[0],
    });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('future');
  });

  it('accepts nmol/L and converts correctly', () => {
    const result = validateLabEntry({
      value: '75',
      unit: 'nmol/L',
      testDate: dateStr,
    });
    expect(result.ok).toBe(true);
    expect(result.ngMl).toBe(30);
  });
});

describe('NMOL_PER_NG constant', () => {
  it('equals 2.5', () => {
    expect(NMOL_PER_NG).toBe(2.5);
  });
});

describe('REFERENCE_BANDS', () => {
  it('has exactly 4 bands', () => {
    expect(REFERENCE_BANDS.length).toBe(4);
  });

  it('bands are contiguous (no gaps)', () => {
    for (let i = 1; i < REFERENCE_BANDS.length; i++) {
      expect(REFERENCE_BANDS[i].min).toBe(REFERENCE_BANDS[i - 1].max);
    }
  });
});
