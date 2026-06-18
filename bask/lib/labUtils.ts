/**
 * Shared logic for vitamin D (25-OH-D) lab results: unit conversion, reference
 * ranges, classification, interpretation copy, and entry validation.
 *
 * ng/mL is the canonical internal unit (matching `bloodTestUtils.ts`). The
 * conversion factor is 1 ng/mL = 2.5 nmol/L.
 *
 * Reference-range thresholds and the status copy live here as the single source
 * of truth — both the trend chart bands and the interpretation text read from
 * `REFERENCE_BANDS`. Copy is intentionally hedged and non-diagnostic: it
 * describes where a value falls relative to common lab ranges, never diagnoses
 * or prescribes.
 */

export type LabUnit = 'ng/mL' | 'nmol/L';

export type LabStatus = 'deficient' | 'insufficient' | 'sufficient' | 'optimal';

export const NMOL_PER_NG = 2.5;

export interface ReferenceBand {
  status: LabStatus;
  /** Inclusive lower bound in ng/mL. */
  min: number;
  /** Exclusive upper bound in ng/mL (Infinity for the top band). */
  max: number;
  label: string;
  /** Hex color used for the chart band and status pill. */
  color: string;
}

/**
 * Thresholds in ng/mL. These mirror the bands already used elsewhere in the app
 * (see `bloodTestUtils.classifyNgMl`) so a value is labelled consistently
 * everywhere. Edit here to change ranges app-wide.
 */
export const REFERENCE_BANDS: ReferenceBand[] = [
  { status: 'deficient', min: 0, max: 20, label: 'Deficient', color: '#E5604D' },
  { status: 'insufficient', min: 20, max: 30, label: 'Insufficient', color: '#F4A536' },
  { status: 'sufficient', min: 30, max: 50, label: 'Sufficient', color: '#5BB47A' },
  { status: 'optimal', min: 50, max: Infinity, label: 'Optimal', color: '#1AA1A2' },
];

/** Upper value (ng/mL) the chart's reference bands render up to. */
export const CHART_MAX_NG_ML = 80;

/** Convert a value in the given unit to canonical ng/mL. */
export function toNgMl(value: number, unit: LabUnit): number {
  const ngMl = unit === 'nmol/L' ? value / NMOL_PER_NG : value;
  return Math.round(ngMl * 10) / 10;
}

/** Convert a canonical ng/mL value into the requested display unit. */
export function fromNgMl(ngMl: number, unit: LabUnit): number {
  const value = unit === 'nmol/L' ? ngMl * NMOL_PER_NG : ngMl;
  return Math.round(value * 10) / 10;
}

/** Classify a canonical ng/mL value into a reference band. */
export function classifyNgMl(ngMl: number): ReferenceBand {
  return (
    REFERENCE_BANDS.find((b) => ngMl >= b.min && ngMl < b.max) ??
    REFERENCE_BANDS[REFERENCE_BANDS.length - 1]
  );
}

/** Format a canonical value for display in the user's unit, e.g. "42 ng/mL". */
export function formatLabValue(ngMl: number, unit: LabUnit): string {
  return `${fromNgMl(ngMl, unit)} ${unit}`;
}

/**
 * Hedged, non-diagnostic interpretation for a value. The headline names the band
 * a clinician's report would typically use; the detail keeps the framing
 * informational and points back to a clinician for anything actionable.
 */
export function getLabInterpretation(ngMl: number): {
  band: ReferenceBand;
  headline: string;
  detail: string;
} {
  const band = classifyNgMl(ngMl);
  switch (band.status) {
    case 'deficient':
      return {
        band,
        headline: 'Below the common reference range',
        detail:
          'Many labs flag readings under 20 ng/mL as deficient. If this is recent, it may be worth talking through with your clinician.',
      };
    case 'insufficient':
      return {
        band,
        headline: 'Just under the typical target',
        detail:
          'This sits in the 20 to 30 ng/mL range that labs often call insufficient. Close, but a notch below where many people aim.',
      };
    case 'sufficient':
      return {
        band,
        headline: 'Within the usual healthy range',
        detail:
          'Readings from 30–50 ng/mL land in the range most labs consider sufficient. Steady sun and supplements help hold it there.',
      };
    case 'optimal':
      return {
        band,
        headline: 'In the range many aim for',
        detail:
          'At 50 ng/mL and up you are in the range a lot of people target. Worth keeping an eye on so it stays steady.',
      };
  }
}

export interface LabEntryInput {
  value: string;
  unit: LabUnit;
  testDate: string;
}

export interface LabValidationResult {
  ok: boolean;
  error?: string;
  ngMl?: number;
  value?: number;
}

/** Validate a manual entry. Bounds are generous sanity checks, not clinical limits. */
export function validateLabEntry({
  value,
  unit,
  testDate,
}: LabEntryInput): LabValidationResult {
  const numeric = parseFloat(value);
  if (!value.trim() || Number.isNaN(numeric)) {
    return { ok: false, error: 'Enter a number for your result.' };
  }
  if (numeric <= 0) {
    return { ok: false, error: 'That value needs to be greater than zero.' };
  }

  const ngMl = toNgMl(numeric, unit);
  // ~0–150 ng/mL spans deficient through the high end of supplementation.
  if (ngMl > 150) {
    return {
      ok: false,
      error: 'That looks high for a 25(OH)D result. Double-check the value and unit.',
    };
  }

  if (!testDate) {
    return { ok: false, error: 'Pick the date of your test.' };
  }
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (new Date(testDate) > today) {
    return { ok: false, error: 'The test date can’t be in the future.' };
  }

  return { ok: true, ngMl, value: numeric };
}
