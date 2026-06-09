/**
 * D-Engine: Vitamin D Calculation Engine
 * Based on Holick's Formula for vitamin D photobiology
 */

export type FitzpatrickType = 1 | 2 | 3 | 4 | 5 | 6;
export type BurnRiskLevel = 'Low' | 'Moderate' | 'High' | 'Very High' | 'Extreme';

/**
 * Base IU generation rate at UV 10, 100% exposure, Type I skin, peak age.
 * Calibrated so a fair-skin (Type I) full-body 1-MED summer session lands at
 * ~10,000-15,000 IU, matching published vitamin D photobiology (Holick).
 * Single source of truth — shared with dWindowForecast to prevent drift.
 */
export const BASE_IU_PER_MINUTE = 1500;

/**
 * Skin multipliers for vitamin D synthesis (higher = slower per-minute synthesis).
 *
 * These scale ~proportionally with the MED (burn-time) table in calculateTimeToBurn
 * so that the burn-capped saturation yield (∝ MED_minutes / skinMultiplier) is roughly
 * equal across skin types — everyone reaches a similar photochemical pre-D3 limit — while
 * fair skin still synthesizes *fastest* (lowest multiplier → highest rate). Keeping the two
 * tables proportional avoids an inversion where darker skin out-produces fair skin at the cap.
 * IMPORTANT: if you change MED_MINUTES_AT_UV1, re-derive these to stay proportional.
 */
export const SKIN_MULTIPLIERS: Record<FitzpatrickType, number> = {
  1: 1.0,   // Type I - Very fair, always burns, never tans
  2: 1.5,   // Type II - Fair, burns easily, tans minimally
  3: 3.0,   // Type III - Medium, sometimes burns, tans gradually
  4: 4.5,   // Type IV - Olive, rarely burns, tans easily
  5: 6.0,   // Type V - Brown, very rarely burns, tans very easily
  6: 7.5,   // Type VI - Dark brown to black, never burns, tans very easily
};

/**
 * Mapping of onboarding answers to Fitzpatrick skin types
 */
const skinToneScores: Record<string, number> = {
  'very-fair': 1,
  'fair': 2,
  'medium': 3,
  'olive': 4,
  'brown': 5,
  'dark-brown': 6,
};

const sunReactionModifiers: Record<string, number> = {
  'always-burns': -0.5,      // Burns easily -> lower type
  'burns-then-tans': 0,      // Neutral
  'rarely-burns': 0.5,       // Tans easily -> higher type
};

/**
 * Derive Fitzpatrick skin type from onboarding answers
 * @param skinTone - User's skin tone from onboarding
 * @param sunReaction - How user's skin reacts to sun
 * @returns Fitzpatrick type (1-6)
 */
export function deriveFitzpatrickType(skinTone: string, sunReaction: string): FitzpatrickType {
  const baseScore = skinToneScores[skinTone] ?? 3;
  const modifier = sunReactionModifiers[sunReaction] ?? 0;
  const calculatedType = Math.max(1, Math.min(6, Math.round(baseScore + modifier)));
  return calculatedType as FitzpatrickType;
}

/**
 * Get age-based multiplier for vitamin D synthesis
 * As we age, concentration of 7-dehydrocholesterol (vitamin D precursor) drops
 * A 70-year-old produces ~25-30% of the vitamin D that a 20-year-old does
 *
 * @param age - User's age (or null if not provided)
 * @returns Multiplier from 0.3 to 1.0
 */
export function getAgeMultiplier(age: number | null): number {
  if (age === null) return 1.0; // Conservative: assume peak synthesis if age unknown
  if (age < 30) return 1.0;      // Peak synthesis
  if (age < 50) return 0.8;      // 20% reduction
  if (age < 70) return 0.5;      // 50% reduction
  return 0.3;                    // 70% reduction for seniors
}

/**
 * Cloud-cover attenuation of UV for vitamin D synthesis.
 * Single source of truth for the `raw × (1 - cloudCover × 0.7)` heuristic used across the app.
 * cloudCover is a 0-1 fraction (WeatherKit). Returns rawUv unchanged when cloudCover is undefined.
 */
export function effectiveUv(rawUv: number, cloudCover?: number): number {
  if (cloudCover === undefined) return rawUv;
  return rawUv * (1 - cloudCover * 0.7);
}

/**
 * Round an IU figure to the nearest 50 so it reads as an estimate, not a false-precision number.
 */
export function formatEstimatedIU(iu: number): string {
  return (Math.round(iu / 50) * 50).toLocaleString();
}

/**
 * Calculate vitamin D (IU) generated from sun exposure
 * Based on Holick's research on vitamin D photobiology
 *
 * Formula: IU = (UVI/10) × Minutes × Exposure% × (1/SkinMultiplier) × AgeFactor × BaseRate
 *
 * Biological Saturation: Vitamin D synthesis is self-limiting. As you approach ~1 MED
 * (Minimum Erythemal Dose, aka time to burn), pre-vitamin D3 begins converting to
 * inert isomers (lumisterol/tachysterol) instead of active vitamin D3. Rather than a hard
 * stop at the burn threshold, this is modeled as diminishing returns: minutes up to ~1 MED
 * count fully, and exposure beyond it asymptotically approaches a small ceiling. This keeps
 * the live counter inching upward (never frozen) while staying honest that extra sun yields
 * little additional vitamin D.
 *
 * @param uvIndex - Current UV index (0-11+)
 * @param minutes - Duration of exposure in minutes
 * @param exposurePercent - Percentage of skin exposed (0-100, from clothing preset)
 * @param fitzpatrickType - Skin type (1-6)
 * @param age - User's age (optional, for age-based synthesis reduction)
 * @returns IU of vitamin D generated
 */
export function calculateVitaminD(
  uvIndex: number,
  minutes: number,
  exposurePercent: number,
  fitzpatrickType: FitzpatrickType,
  age?: number | null
): number {
  // Shadow Rule: UVB is fully scattered by atmosphere when sun angle < ~45° (UV < 3)
  // Below UV 3, users get UVA (skin damage) but zero vitamin D synthesis
  if (uvIndex < 3) return 0;

  // Biological saturation as diminishing returns (not a hard stop): minutes up to ~1 MED
  // (burn threshold) count fully; beyond it, extra exposure asymptotically approaches a
  // small ceiling instead of freezing the counter.
  const timeToBurn = calculateTimeToBurn(uvIndex, fitzpatrickType);
  const baseMinutes = Math.min(minutes, timeToBurn);
  const overMinutes = Math.max(0, minutes - timeToBurn);
  const POST_BURN_CEILING = 0.25; // up to +25% of the 1-MED yield past saturation
  const taperMinutes =
    timeToBurn * POST_BURN_CEILING * (1 - Math.exp(-overMinutes / Math.max(1, timeToBurn)));
  const effectiveMinutes = baseMinutes + taperMinutes;

  const skinMultiplier = SKIN_MULTIPLIERS[fitzpatrickType] ?? 3.0;
  const exposureFraction = exposurePercent / 100;
  const uvFactor = uvIndex / 10;
  const ageFactor = getAgeMultiplier(age ?? null);

  // Formula: IU = (UVI/10) * Minutes * Exposure% * (1/SkinMultiplier) * AgeFactor * BaseRate
  const iu = uvFactor * effectiveMinutes * exposureFraction * (1 / skinMultiplier) * ageFactor * BASE_IU_PER_MINUTE;

  return Math.round(Math.max(0, iu));
}

/**
 * Marginal vitamin D synthesis rate in IU per minute at a given UV/exposure.
 *
 * This is the pre-saturation rate (the linear term of `calculateVitaminD`), used
 * both to estimate time-to-goal and to *integrate* IU incrementally during a live
 * session off the current (cloud-adjusted) UV. Returns 0 below the UV-3 shadow-rule
 * threshold, so integrating this rate naturally accrues nothing during morning light
 * and starts the moment effective UV crosses 3 — never crediting pre-threshold minutes.
 *
 * Note (v1): this omits the post-burn diminishing-returns taper that `calculateVitaminD`
 * applies past ~1 MED. For any session shorter than time-to-burn the two agree exactly;
 * past the burn threshold the integrated value runs slightly higher. Acceptable for v1 —
 * the sunburn-risk UI already discourages exposure that long. (Follow-up: fold the taper
 * into the integrator using accumulated synthesis minutes.)
 *
 * @param uvIndex - Current (effective) UV index
 * @param exposurePercent - Percentage of skin exposed (0-100)
 * @param fitzpatrickType - Skin type (1-6)
 * @param age - User's age (optional)
 * @returns IU synthesized per minute (0 when UV < 3 or no skin exposed)
 */
export function vitaminDRatePerMinute(
  uvIndex: number,
  exposurePercent: number,
  fitzpatrickType: FitzpatrickType,
  age?: number | null
): number {
  // Shadow Rule: no UVB-driven synthesis below UV 3
  if (uvIndex < 3 || exposurePercent <= 0) return 0;

  const skinMultiplier = SKIN_MULTIPLIERS[fitzpatrickType] ?? 3.0;
  const exposureFraction = exposurePercent / 100;
  const uvFactor = uvIndex / 10;
  const ageFactor = getAgeMultiplier(age ?? null);

  return uvFactor * exposureFraction * (1 / skinMultiplier) * ageFactor * BASE_IU_PER_MINUTE;
}

/**
 * Calculate minutes needed to reach a target IU
 * @param targetIU - Goal vitamin D in IU
 * @param uvIndex - Current UV index
 * @param exposurePercent - Percentage of skin exposed (0-100)
 * @param fitzpatrickType - Skin type (1-6)
 * @param age - User's age (optional, increases time needed for older users)
 * @returns Uncapped minutes needed, or Infinity if UV is too low
 */
export function calculateTimeToGoal(
  targetIU: number,
  uvIndex: number,
  exposurePercent: number,
  fitzpatrickType: FitzpatrickType,
  age?: number | null
): number {
  if (targetIU <= 0) return Infinity;

  const ratePerMinute = vitaminDRatePerMinute(uvIndex, exposurePercent, fitzpatrickType, age);
  if (ratePerMinute <= 0) return Infinity;

  // Uncapped — callers compare against timeToBurn for safety-aware UI
  return Math.ceil(targetIU / ratePerMinute);
}

/**
 * Calculate time to burn based on UV index and skin type
 * Uses standard Minimum Erythemal Dose (MED) values
 * @param uvIndex - Current UV index
 * @param fitzpatrickType - Skin type (1-6)
 * @returns Minutes until sunburn risk
 */
export function calculateTimeToBurn(uvIndex: number, fitzpatrickType: FitzpatrickType): number {
  // Standard Erythemal Dose (SED) units vary by skin type
  // These are minutes at UV index 1 - scale inversely with UV
  const MED_MINUTES_AT_UV1: Record<FitzpatrickType, number> = {
    1: 67,    // ~10-15 min at UV 5
    2: 100,   // ~15-20 min at UV 5
    3: 200,   // ~30-40 min at UV 5
    4: 300,   // ~45-60 min at UV 5
    5: 400,   // ~60-80 min at UV 5
    6: 500,   // ~80-100 min at UV 5
  };

  const baseMinutes = MED_MINUTES_AT_UV1[fitzpatrickType] ?? 100;
  return Math.round(baseMinutes / Math.max(1, uvIndex));
}

/**
 * Get burn risk level from UV index
 * @param uvIndex - Current UV index
 * @returns Risk level description
 */
export function getBurnRiskLevel(uvIndex: number): BurnRiskLevel {
  if (uvIndex < 3) return 'Low';
  if (uvIndex < 6) return 'Moderate';
  if (uvIndex < 8) return 'High';
  if (uvIndex < 11) return 'Very High';
  return 'Extreme';
}

/**
 * Format minutes as a human-readable duration (no upper cap).
 */
export function formatDurationMinutes(minutes: number): string {
  if (!isFinite(minutes) || minutes <= 0) return '—';
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${Math.round(minutes)}m`;
}

/**
 * Format minutes-until-burn for display (matches ActiveSessionView).
 */
export function formatTimeToBurn(minutes: number): string {
  const formatted = formatDurationMinutes(minutes);
  return formatted === '—' ? formatted : `~${formatted}`;
}

/**
 * Format live sunburn countdown for active sessions.
 *
 * Shows whole minutes only (no per-second ticking) to keep the live session
 * screen calm. Minutes are floored — never rounded up — so a burn warning never
 * overstates how much safe time remains. The "<1m" / "Now" steps keep the final
 * stretch legible while the screen's red urgency styling (driven separately by
 * remaining seconds) still kicks in.
 */
export function formatSunburnCountdown(remainingSeconds: number): string {
  if (remainingSeconds <= 0) return 'Now';
  if (remainingSeconds < 60) return '<1m';

  const hours = Math.floor(remainingSeconds / 3600);
  const mins = Math.floor((remainingSeconds % 3600) / 60);

  if (hours > 0) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${mins}m`;
}

/**
 * Calculate vitamin D decay over time
 * Vitamin D has a half-life of approximately 15 days
 *
 * Formula: Remaining_IU = Initial_IU * (0.5 ^ (days_elapsed / 15))
 *
 * @param initialIU - Starting vitamin D level in IU
 * @param daysElapsed - Number of days since initial measurement
 * @returns Remaining IU after decay
 */
export function calculateDecay(initialIU: number, daysElapsed: number): number {
  const HALF_LIFE_DAYS = 15;
  const decayFactor = Math.pow(0.5, daysElapsed / HALF_LIFE_DAYS);
  return Math.round(initialIU * decayFactor);
}

/**
 * Calculate daily decay amount (IU lost per day)
 * Uses the half-life formula to determine average daily loss
 *
 * @param currentIU - Current vitamin D level in IU
 * @returns IU lost per day
 */
export function calculateDailyDecayAmount(currentIU: number): number {
  const HALF_LIFE_DAYS = 15;
  // Daily decay rate = 1 - (0.5 ^ (1/15)) ≈ 0.0448 or 4.48% per day
  const dailyDecayRate = 1 - Math.pow(0.5, 1 / HALF_LIFE_DAYS);
  return Math.round(currentIU * dailyDecayRate);
}

/**
 * Get clothing exposure percentage from coverage percentage
 * Note: Coverage percent is how much is COVERED, exposure is how much is EXPOSED
 * @param coveragePercent - Percentage of skin covered by clothing (0-100)
 * @returns Exposure percentage (0-100)
 */
export function getExposurePercent(coveragePercent: number): number {
  return 100 - coveragePercent;
}
