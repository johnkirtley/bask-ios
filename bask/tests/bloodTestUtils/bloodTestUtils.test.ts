import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  normalizeToNgMl,
  getCalibrationFromLab,
  getBloodTestGuidanceHint,
  type BloodTestCalibration,
} from '../../lib/bloodTestUtils';

describe('normalizeToNgMl', () => {
  it('passes through ng/mL unchanged', () => {
    expect(normalizeToNgMl(42, 'ng/mL')).toBe(42);
    expect(normalizeToNgMl(0, 'ng/mL')).toBe(0);
  });

  it('converts nmol/L to ng/mL by dividing by 2.5', () => {
    expect(normalizeToNgMl(50, 'nmol/L')).toBe(20);
    expect(normalizeToNgMl(100, 'nmol/L')).toBe(40);
  });

  it('rounds to 1 decimal place', () => {
    expect(normalizeToNgMl(51, 'nmol/L')).toBe(20.4);
  });
});

describe('getCalibrationFromLab', () => {
  function recentDate(): string {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString();
  }

  function oldDate(): string {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 2);
    return d.toISOString();
  }

  it('returns null for null lab', () => {
    expect(getCalibrationFromLab(null)).toBeNull();
  });

  it('returns null for undefined lab', () => {
    expect(getCalibrationFromLab(undefined)).toBeNull();
  });

  it('returns null for invalid unit', () => {
    expect(
      getCalibrationFromLab({
        value_ng_ml: 30,
        entered_value: 30,
        entered_unit: 'mg/dL',
        test_date: recentDate(),
      }),
    ).toBeNull();
  });

  it('returns null for a test older than 6 months', () => {
    expect(
      getCalibrationFromLab({
        value_ng_ml: 30,
        entered_value: 30,
        entered_unit: 'ng/mL',
        test_date: oldDate(),
      }),
    ).toBeNull();
  });

  it('returns calibration for a valid recent ng/mL lab', () => {
    const result = getCalibrationFromLab({
      value_ng_ml: 35,
      entered_value: 35,
      entered_unit: 'ng/mL',
      test_date: recentDate(),
    });
    expect(result).not.toBeNull();
    expect(result!.ngMl).toBe(35);
    expect(result!.status).toBe('sufficient');
    expect(result!.isRecent).toBe(true);
    expect(result!.originalUnit).toBe('ng/mL');
  });

  it('correctly classifies each status', () => {
    const cases = [
      { ngMl: 15, status: 'deficient' },
      { ngMl: 25, status: 'insufficient' },
      { ngMl: 35, status: 'sufficient' },
      { ngMl: 60, status: 'optimal' },
    ];
    for (const { ngMl, status } of cases) {
      const result = getCalibrationFromLab({
        value_ng_ml: ngMl,
        entered_value: ngMl,
        entered_unit: 'ng/mL',
        test_date: recentDate(),
      });
      expect(result!.status).toBe(status);
    }
  });
});

describe('getBloodTestGuidanceHint', () => {
  function calibration(status: string, ngMl: number = 30): BloodTestCalibration {
    return {
      ngMl,
      status: status as BloodTestCalibration['status'],
      isRecent: true,
      originalValue: ngMl,
      originalUnit: 'ng/mL',
      testDate: new Date().toISOString(),
    };
  }

  it('returns null for null calibration', () => {
    expect(getBloodTestGuidanceHint(null)).toBeNull();
  });

  it('returns guidance for deficient status', () => {
    const hint = getBloodTestGuidanceHint(calibration('deficient', 15));
    expect(hint).toBeTruthy();
    expect(hint).toContain('15');
    expect(hint!.toLowerCase()).toContain('low');
  });

  it('returns guidance for insufficient status', () => {
    const hint = getBloodTestGuidanceHint(calibration('insufficient', 25));
    expect(hint).toBeTruthy();
    expect(hint).toContain('25');
  });

  it('returns guidance for sufficient status', () => {
    const hint = getBloodTestGuidanceHint(calibration('sufficient', 35));
    expect(hint).toBeTruthy();
    expect(hint).toContain('35');
  });

  it('returns guidance for optimal status', () => {
    const hint = getBloodTestGuidanceHint(calibration('optimal', 60));
    expect(hint).toBeTruthy();
    expect(hint).toContain('60');
  });

  it('includes the ng/mL value in every hint', () => {
    for (const status of ['deficient', 'insufficient', 'sufficient', 'optimal']) {
      const hint = getBloodTestGuidanceHint(calibration(status, 42));
      expect(hint).toContain('42 ng/mL');
    }
  });
});
