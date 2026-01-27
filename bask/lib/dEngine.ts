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
 * Calculate vitamin D (IU) generated from sun exposure
 * Based on Holick's research on vitamin D photobiology
 *
 * Formula: IU = (UVI/10) × Minutes × Exposure% × (1/SkinMultiplier) × BaseRate
 *
 * @param uvIndex - Current UV index (0-11+)
 * @param minutes - Duration of exposure in minutes
 * @param exposurePercent - Percentage of skin exposed (0-100, from clothing preset)
 * @param fitzpatrickType - Skin type (1-6)
 * @returns IU of vitamin D generated
 */
export function calculateVitaminD(
  uvIndex: number,
  minutes: number,
  exposurePercent: number,
  fitzpatrickType: FitzpatrickType
): number {
  // Base IU generation rate at UV 10, 100% exposure, Type I skin
  const BASE_IU_PER_MINUTE = 100;

  const skinMultiplier = SKIN_MULTIPLIERS[fitzpatrickType] ?? 1.6;
  const exposureFraction = exposurePercent / 100;
  const uvFactor = uvIndex / 10;

  // Formula: IU = (UVI/10) * Minutes * Exposure% * (1/SkinMultiplier) * BaseRate
  const iu = uvFactor * minutes * exposureFraction * (1 / skinMultiplier) * BASE_IU_PER_MINUTE;

  return Math.round(Math.max(0, iu));
}

/**
 * Calculate minutes needed to reach a target IU
 * @param targetIU - Goal vitamin D in IU
 * @param uvIndex - Current UV index
 * @param exposurePercent - Percentage of skin exposed (0-100)
 * @param fitzpatrickType - Skin type (1-6)
 * @returns Minutes needed, or Infinity if UV is too low
 */
export function calculateTimeToGoal(
  targetIU: number,
  uvIndex: number,
  exposurePercent: number,
  fitzpatrickType: FitzpatrickType
): number {
  if (uvIndex <= 0 || exposurePercent <= 0) return Infinity;

  const BASE_IU_PER_MINUTE = 100;
  const skinMultiplier = SKIN_MULTIPLIERS[fitzpatrickType] ?? 1.6;
  const exposureFraction = exposurePercent / 100;
  const uvFactor = uvIndex / 10;

  // Rearranged formula: Minutes = IU / (uvFactor * exposure * (1/skin) * base)
  const minutes = targetIU / (uvFactor * exposureFraction * (1 / skinMultiplier) * BASE_IU_PER_MINUTE);

  return Math.ceil(minutes);
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
 * Get clothing exposure percentage from coverage percentage
 * Note: Coverage percent is how much is COVERED, exposure is how much is EXPOSED
 * @param coveragePercent - Percentage of skin covered by clothing (0-100)
 * @returns Exposure percentage (0-100)
 */
export function getExposurePercent(coveragePercent: number): number {
  return 100 - coveragePercent;
}
