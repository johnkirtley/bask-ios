import { OnboardingAnswers } from '../types';
import {
  UserProfile,
  userProfileRepository,
} from './database/repositories/userProfileRepository';
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
  // Onboarding answers are authoritative — the DB row defaults to Type II
  // and must not mask updated skin type after redo onboarding.
  if (onboarding?.skinTone && onboarding?.sunReaction) {
    return deriveFitzpatrickType(onboarding.skinTone, onboarding.sunReaction);
  }
  if (profile?.fitzpatrick_type) {
    return profile.fitzpatrick_type as FitzpatrickType;
  }
  return 2;
}

/**
 * Build a user-profile update from onboarding answers.
 */
export function buildProfileUpdateFromOnboarding(
  answers: OnboardingAnswers,
  agreedToTermsAt?: string | null,
): Partial<Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>> {
  const update: Partial<
    Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>
  > = {};

  if (answers.skinTone && answers.sunReaction) {
    update.fitzpatrick_type = deriveFitzpatrickType(
      answers.skinTone,
      answers.sunReaction,
    );
  }

  update.age = answers.age;
  update.weight = answers.weight;
  update.weight_unit = answers.weightUnit;

  if (agreedToTermsAt) {
    update.disclaimer_accepted_at = agreedToTermsAt;
  }

  if (answers.hasBloodTest && answers.bloodTestValue != null) {
    update.blood_test_value = answers.bloodTestValue;
    update.blood_test_unit = answers.bloodTestUnit;
    update.blood_test_date = answers.bloodTestDate ?? undefined;
    update.blood_test_source = 'onboarding';
  }

  return update;
}

/**
 * Persist onboarding-derived profile fields to SQLite (native only).
 */
export async function syncProfileFromOnboarding(
  answers: OnboardingAnswers,
  agreedToTermsAt?: string | null,
): Promise<void> {
  const update = buildProfileUpdateFromOnboarding(answers, agreedToTermsAt);
  if (Object.keys(update).length === 0) return;
  await userProfileRepository.update(update);
}

/**
 * Reset biological profile fields collected during onboarding.
 * Called when the user redoes onboarding so stale values do not persist.
 */
export async function resetOnboardingProfileFields(): Promise<void> {
  await userProfileRepository.resetBiologicalFields();
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
