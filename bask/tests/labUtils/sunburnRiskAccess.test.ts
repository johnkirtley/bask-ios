import { describe, it, expect } from 'vitest';
import { canAccessSunburnRisk, SUNBURN_RISK_PRO_GATE_CUTOFF_ISO } from '../../lib/sunburnRiskAccess';

describe('canAccessSunburnRisk', () => {
  it('returns true for premium users regardless of account date', () => {
    expect(canAccessSunburnRisk({ isPremium: true, userProfile: null })).toBe(true);
    expect(
      canAccessSunburnRisk({
        isPremium: true,
        userProfile: { created_at: '2030-01-01T00:00:00.000Z' },
      }),
    ).toBe(true);
  });

  it('returns false for non-premium with no profile', () => {
    expect(canAccessSunburnRisk({ isPremium: false, userProfile: null })).toBe(false);
    expect(canAccessSunburnRisk({ isPremium: false, userProfile: undefined })).toBe(false);
  });

  it('returns false for non-premium with no created_at', () => {
    expect(
      canAccessSunburnRisk({ isPremium: false, userProfile: { created_at: undefined as any } }),
    ).toBe(false);
  });

  it('returns true for non-premium created BEFORE the cutoff (grandfathered)', () => {
    expect(
      canAccessSunburnRisk({
        isPremium: false,
        userProfile: { created_at: '2025-01-01T00:00:00.000Z' },
      }),
    ).toBe(true);
  });

  it('returns false for non-premium created AFTER the cutoff', () => {
    expect(
      canAccessSunburnRisk({
        isPremium: false,
        userProfile: { created_at: '2030-01-01T00:00:00.000Z' },
      }),
    ).toBe(false);
  });

  it('returns false for non-premium created exactly at the cutoff (boundary is <)', () => {
    expect(
      canAccessSunburnRisk({
        isPremium: false,
        userProfile: { created_at: SUNBURN_RISK_PRO_GATE_CUTOFF_ISO },
      }),
    ).toBe(false);
  });

  it('returns true for non-premium created 1ms before the cutoff', () => {
    const justBefore = new Date(SUNBURN_RISK_PRO_GATE_CUTOFF_ISO).getTime() - 1;
    expect(
      canAccessSunburnRisk({
        isPremium: false,
        userProfile: { created_at: new Date(justBefore).toISOString() },
      }),
    ).toBe(true);
  });

  it('handles invalid created_at gracefully (returns false)', () => {
    expect(
      canAccessSunburnRisk({
        isPremium: false,
        userProfile: { created_at: 'not-a-date' },
      }),
    ).toBe(false);
  });
});
