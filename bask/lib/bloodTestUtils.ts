import { UserProfile } from './database/repositories/userProfileRepository';

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
 * Returns lab calibration when a recent blood test exists; null otherwise.
 */
export function getBloodTestCalibration(
  profile: UserProfile | null | undefined,
): BloodTestCalibration | null {
  if (
    profile?.blood_test_value == null ||
    !profile.blood_test_unit ||
    !profile.blood_test_date
  ) {
    return null;
  }

  const unit = profile.blood_test_unit as BloodTestUnit;
  if (unit !== 'ng/mL' && unit !== 'nmol/L') return null;

  const ngMl = normalizeToNgMl(profile.blood_test_value, unit);
  const recent = isRecentTest(profile.blood_test_date);

  if (!recent) return null;

  return {
    ngMl,
    status: classifyNgMl(ngMl),
    isRecent: true,
    originalValue: profile.blood_test_value,
    originalUnit: unit,
    testDate: profile.blood_test_date,
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
