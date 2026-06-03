'use client';

import type { UserProfile } from './database/repositories/userProfileRepository';

// Update this to the App Store release timestamp for the version that gates
// sunburn-risk timing for new users.
export const SUNBURN_RISK_PRO_GATE_CUTOFF_ISO = '2026-06-03T00:00:00.000Z';

export function canAccessSunburnRisk(options: {
  isPremium: boolean;
  userProfile: Pick<UserProfile, 'created_at'> | null | undefined;
}): boolean {
  if (options.isPremium) return true;

  const createdAt = options.userProfile?.created_at;
  if (!createdAt) return false;

  const createdAtMs = Date.parse(createdAt);
  const cutoffMs = Date.parse(SUNBURN_RISK_PRO_GATE_CUTOFF_ISO);

  if (!Number.isFinite(createdAtMs) || !Number.isFinite(cutoffMs)) {
    return false;
  }

  return createdAtMs < cutoffMs;
}
