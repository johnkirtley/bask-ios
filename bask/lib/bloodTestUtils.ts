export type BloodTestStatus =
  | 'deficient'
  | 'insufficient'
  | 'sufficient'
  | 'optimal';

export type BloodTestUnit = 'ng/mL' | 'nmol/L';

export interface BloodTestCalibration {
  ngMl: number;
  status: BloodTestStatus;
  isRecent: boolean;
  originalValue: number;
  originalUnit: BloodTestUnit;
  testDate: string;
}

const RECENT_MONTHS = 6;

/** Convert 25(OH)D to ng/mL (standard internal unit). */
export function normalizeToNgMl(
  value: number,
  unit: BloodTestUnit,
): number {
  if (unit === 'nmol/L') {
    return Math.round((value / 2.5) * 10) / 10;
  }
  return value;
}

function classifyNgMl(ngMl: number): BloodTestStatus {
  if (ngMl < 20) return 'deficient';
  if (ngMl < 30) return 'insufficient';
  if (ngMl < 50) return 'sufficient';
  return 'optimal';
}

function isRecentTest(dateStr: string): boolean {
  const testDate = new Date(dateStr);
  if (Number.isNaN(testDate.getTime())) return false;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - RECENT_MONTHS);
  return testDate >= cutoff;
}

/**
 * Build calibration from the latest logged lab result (`bask_lab_results`), the
 * single source of truth for blood values. Mirrors `getBloodTestCalibration` but
 * reads a lab row instead of the legacy profile fields. Accepts a minimal shape
 * to avoid a circular import on the repository type.
 */
export function getCalibrationFromLab(
  lab:
    | {
        value_ng_ml: number;
        entered_value: number;
        entered_unit: string;
        test_date: string;
      }
    | null
    | undefined,
): BloodTestCalibration | null {
  if (!lab) return null;

  const unit = lab.entered_unit as BloodTestUnit;
  if (unit !== 'ng/mL' && unit !== 'nmol/L') return null;

  if (!isRecentTest(lab.test_date)) return null;

  return {
    ngMl: lab.value_ng_ml,
    status: classifyNgMl(lab.value_ng_ml),
    isRecent: true,
    originalValue: lab.entered_value,
    originalUnit: unit,
    testDate: lab.test_date,
  };
}

export function getBloodTestGuidanceHint(
  calibration: BloodTestCalibration | null,
): string | null {
  if (!calibration) return null;

  switch (calibration.status) {
    case 'deficient':
      return `Your recent lab (${calibration.ngMl} ng/mL) suggests levels may be low. Sun and supplements may both help.`;
    case 'insufficient':
      return `Your recent lab (${calibration.ngMl} ng/mL) is below optimal. Consistent sun or supplementation may help.`;
    case 'sufficient':
      return `Your recent lab (${calibration.ngMl} ng/mL) looks adequate. Maintenance exposure may be enough.`;
    case 'optimal':
      return `Your recent lab (${calibration.ngMl} ng/mL) looks strong. Focus on maintaining levels.`;
    default:
      return null;
  }
}
