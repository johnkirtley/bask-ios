/**
 * D-Engine: Vitamin D Calculation Engine
 * Based on Holick's Formula for vitamin D photobiology
 */

export type FitzpatrickType = 1 | 2 | 3 | 4 | 5 | 6;
export type BurnRiskLevel = 'Low' | 'Moderate' | 'High' | 'Very High' | 'Extreme';

/**
 * Skin multipliers for vitamin D synthesis
 * Higher Fitzpatrick types require more sun exposure to produce the same vitamin D
 */
export const SKIN_MULTIPLIERS: Record<FitzpatrickType, number> = {
  1: 1.0,   // Type I - Very fair, always burns, never tans
  2: 1.3,   // Type II - Fair, burns easily, tans minimally
  3: 1.6,   // Type III - Medium, sometimes burns, tans gradually
  4: 2.5,   // Type IV - Olive, rarely burns, tans easily
  5: 4.0,   // Type V - Brown, very rarely burns, tans very easily
  6: 5.0,   // Type VI - Dark brown to black, never burns, tans very easily
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
 * Calculate vitamin D (IU) generated from sun exposure
 * Based on Holick's research on vitamin D photobiology
 *
 * Formula: IU = (UVI/10) × Minutes × Exposure% × (1/SkinMultiplier) × AgeFactor × BaseRate
 *
 * Biological Saturation: Vitamin D synthesis is self-limiting. Once you reach ~1 MED
 * (Minimum Erythemal Dose, aka time to burn), pre-vitamin D3 begins converting to
 * inert isomers (lumisterol/tachysterol) instead of active vitamin D3. Therefore,
 * extended sun exposure beyond the burn threshold does not produce additional vitamin D.
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

  // Base IU generation rate at UV 10, 100% exposure, Type I skin, peak age
  const BASE_IU_PER_MINUTE = 100;

  // Cap synthesis at the burn threshold (biological saturation)
  const timeToBurn = calculateTimeToBurn(uvIndex, fitzpatrickType);
  const effectiveMinutes = Math.min(minutes, timeToBurn);

  const skinMultiplier = SKIN_MULTIPLIERS[fitzpatrickType] ?? 1.6;
  const exposureFraction = exposurePercent / 100;
  const uvFactor = uvIndex / 10;
  const ageFactor = getAgeMultiplier(age ?? null);

  // Formula: IU = (UVI/10) * Minutes * Exposure% * (1/SkinMultiplier) * AgeFactor * BaseRate
  const iu = uvFactor * effectiveMinutes * exposureFraction * (1 / skinMultiplier) * ageFactor * BASE_IU_PER_MINUTE;

  return Math.round(Math.max(0, iu));
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
  // Shadow Rule: UV must be >= 3 for vitamin D synthesis
  if (uvIndex < 3 || exposurePercent <= 0 || targetIU <= 0) return Infinity;

  const BASE_IU_PER_MINUTE = 100;
  const skinMultiplier = SKIN_MULTIPLIERS[fitzpatrickType] ?? 1.6;
  const exposureFraction = exposurePercent / 100;
  const uvFactor = uvIndex / 10;
  const ageFactor = getAgeMultiplier(age ?? null);

  const ratePerMinute =
    uvFactor * exposureFraction * (1 / skinMultiplier) * ageFactor * BASE_IU_PER_MINUTE;
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
 * Format live sunburn countdown for active sessions (M:SS or H:MM:SS).
 */
export function formatSunburnCountdown(remainingSeconds: number): string {
  if (remainingSeconds <= 0) return 'Now';

  const hours = Math.floor(remainingSeconds / 3600);
  const mins = Math.floor((remainingSeconds % 3600) / 60);
  const secs = remainingSeconds % 60;

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
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
