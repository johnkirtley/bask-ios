import { OnboardingAnswers } from '../types';
import { UserProfile } from './database/repositories/userProfileRepository';
import { DEFAULT_DAILY_GOAL_IU } from './constants';
import { deriveFitzpatrickType, FitzpatrickType } from './dEngine';

/**
 * Resolve a profile field using: DB profile → onboarding answers → default.
 */
export function resolveProfileField<T>(
  profile: UserProfile | null | undefined,
  onboarding: OnboardingAnswers | null | undefined,
  profileKey: keyof UserProfile,
  onboardingKey: keyof OnboardingAnswers,
  defaultValue: T,
): T {
  const profileValue = profile?.[profileKey];
  if (profileValue !== undefined && profileValue !== null) {
    return profileValue as T;
  }
  const onboardingValue = onboarding?.[onboardingKey];
  if (onboardingValue !== undefined && onboardingValue !== null) {
    return onboardingValue as T;
  }
  return defaultValue;
}

export function resolveFitzpatrickType(
  profile: UserProfile | null | undefined,
  onboarding: OnboardingAnswers | null | undefined,
): FitzpatrickType {
  if (profile?.fitzpatrick_type) {
    return profile.fitzpatrick_type as FitzpatrickType;
  }
  if (onboarding?.skinTone && onboarding?.sunReaction) {
    return deriveFitzpatrickType(onboarding.skinTone, onboarding.sunReaction);
  }
  return 2;
}

export function resolveDailyGoal(
  profile: UserProfile | null | undefined,
): number {
  return profile?.daily_goal ?? DEFAULT_DAILY_GOAL_IU;
}

export function resolveAge(
  profile: UserProfile | null | undefined,
  onboarding: OnboardingAnswers | null | undefined,
): number | null {
  return profile?.age ?? onboarding?.age ?? null;
}

export function resolveWeight(
  profile: UserProfile | null | undefined,
  onboarding: OnboardingAnswers | null | undefined,
): { weight: number | null; unit: string | null } {
  return {
    weight: profile?.weight ?? onboarding?.weight ?? null,
    unit: profile?.weight_unit ?? onboarding?.weightUnit ?? null,
  };
}
