import { describe, it, expect } from 'vitest';
import {
  resolveProfileField,
  resolveFitzpatrickType,
  resolveDailyGoal,
  resolveAge,
  resolveWeight,
  buildProfileUpdateFromOnboarding,
} from '../../lib/profileUtils';
import type { OnboardingAnswers } from '../../types';

function onboarding(overrides: Partial<OnboardingAnswers> = {}): OnboardingAnswers {
  return {
    symptoms: [],
    skinTone: null,
    eyeColor: null,
    sunReaction: null,
    outdoorTime: null,
    sunscreenFrequency: null,
    vitaminDSupplementation: null,
    dailyGoalIU: null,
    age: null,
    weight: null,
    weightUnit: 'lbs',
    medicalDisclaimerAccepted: false,
    locationPermissionGranted: false,
    notificationPermissionGranted: false,
    hasBloodTest: false,
    bloodTestValue: null,
    bloodTestUnit: 'ng/mL',
    bloodTestDate: null,
    ...overrides,
  };
}

describe('resolveProfileField', () => {
  it('returns the profile value when present', () => {
    const result = resolveProfileField(
      { age: 35 } as any,
      null,
      'age',
      'age',
      30,
    );
    expect(result).toBe(35);
  });

  it('falls back to onboarding when profile value is null', () => {
    const result = resolveProfileField(
      { age: null } as any,
      { age: 28 } as any,
      'age',
      'age',
      30,
    );
    expect(result).toBe(28);
  });

  it('falls back to onboarding when profile value is undefined', () => {
    const result = resolveProfileField(
      {} as any,
      { age: 40 } as any,
      'age',
      'age',
      30,
    );
    expect(result).toBe(40);
  });

  it('falls back to default when both are null/undefined', () => {
    const result = resolveProfileField(null, null, 'age', 'age', 25);
    expect(result).toBe(25);
  });

  it('profile takes precedence over onboarding', () => {
    const result = resolveProfileField(
      { age: 50 } as any,
      { age: 30 } as any,
      'age',
      'age',
      25,
    );
    expect(result).toBe(50);
  });
});

describe('resolveFitzpatrickType', () => {
  it('onboarding answers are authoritative (over profile)', () => {
    const result = resolveFitzpatrickType(
      { fitzpatrick_type: 1 } as any,
      onboarding({ skinTone: 'dark-brown', sunReaction: 'rarely-burns' }),
    );
    expect(result).toBe(6);
  });

  it('falls back to profile when onboarding is incomplete (no skinTone)', () => {
    const result = resolveFitzpatrickType(
      { fitzpatrick_type: 4 } as any,
      onboarding({ skinTone: null, sunReaction: 'burns-then-tans' }),
    );
    expect(result).toBe(4);
  });

  it('falls back to profile when onboarding is incomplete (no sunReaction)', () => {
    const result = resolveFitzpatrickType(
      { fitzpatrick_type: 3 } as any,
      onboarding({ skinTone: 'medium', sunReaction: null }),
    );
    expect(result).toBe(3);
  });

  it('defaults to Type II (2) when nothing is available', () => {
    expect(resolveFitzpatrickType(null, null)).toBe(2);
    expect(resolveFitzpatrickType(undefined, undefined)).toBe(2);
  });

  it('defaults to Type II when profile has no fitzpatrick_type', () => {
    expect(resolveFitzpatrickType({} as any, null)).toBe(2);
  });
});

describe('resolveDailyGoal', () => {
  it('returns the profile daily goal when set', () => {
    expect(resolveDailyGoal({ daily_goal: 5000 } as any)).toBe(5000);
  });

  it('returns default (2000) when profile is null', () => {
    expect(resolveDailyGoal(null)).toBe(2000);
  });

  it('returns default (2000) when profile has no daily_goal', () => {
    expect(resolveDailyGoal({} as any)).toBe(2000);
  });
});

describe('resolveAge', () => {
  it('returns the profile age when set', () => {
    expect(resolveAge({ age: 45 } as any, null)).toBe(45);
  });

  it('falls back to onboarding age', () => {
    expect(resolveAge(null, onboarding({ age: 28 }))).toBe(28);
  });

  it('returns null when neither is available', () => {
    expect(resolveAge(null, null)).toBeNull();
    expect(resolveAge({} as any, onboarding({ age: null }))).toBeNull();
  });

  it('profile takes precedence over onboarding', () => {
    expect(resolveAge({ age: 50 } as any, onboarding({ age: 30 }))).toBe(50);
  });
});

describe('resolveWeight', () => {
  it('returns profile weight and unit', () => {
    expect(resolveWeight({ weight: 160, weight_unit: 'lbs' } as any, null)).toEqual({
      weight: 160,
      unit: 'lbs',
    });
  });

  it('falls back to onboarding weight/unit', () => {
    expect(resolveWeight(null, onboarding({ weight: 72, weightUnit: 'kg' }))).toEqual({
      weight: 72,
      unit: 'kg',
    });
  });

  it('returns null weight when nothing available', () => {
    expect(resolveWeight(null, null)).toEqual({ weight: null, unit: null });
  });

  it('profile takes precedence over onboarding', () => {
    expect(
      resolveWeight(
        { weight: 180, weight_unit: 'lbs' } as any,
        onboarding({ weight: 80, weightUnit: 'kg' }),
      ),
    ).toEqual({ weight: 180, unit: 'lbs' });
  });
});

describe('buildProfileUpdateFromOnboarding', () => {
  it('derives fitzpatrick_type from skinTone + sunReaction', () => {
    const update = buildProfileUpdateFromOnboarding(
      onboarding({ skinTone: 'very-fair', sunReaction: 'always-burns' }),
    );
    expect(update.fitzpatrick_type).toBe(1);
  });

  it('sets age, weight, weight_unit from answers', () => {
    const update = buildProfileUpdateFromOnboarding(
      onboarding({ age: 35, weight: 160, weightUnit: 'lbs' }),
    );
    expect(update.age).toBe(35);
    expect(update.weight).toBe(160);
    expect(update.weight_unit).toBe('lbs');
  });

  it('sets daily_goal when provided and > 0', () => {
    const update = buildProfileUpdateFromOnboarding(
      onboarding({ dailyGoalIU: 3000 }),
    );
    expect(update.daily_goal).toBe(3000);
  });

  it('does NOT set daily_goal when null or <= 0', () => {
    expect(buildProfileUpdateFromOnboarding(onboarding({ dailyGoalIU: null })).daily_goal).toBeUndefined();
    expect(buildProfileUpdateFromOnboarding(onboarding({ dailyGoalIU: 0 })).daily_goal).toBeUndefined();
    expect(buildProfileUpdateFromOnboarding(onboarding({ dailyGoalIU: -100 })).daily_goal).toBeUndefined();
  });

  it('sets disclaimer_accepted_at when provided', () => {
    const update = buildProfileUpdateFromOnboarding(
      onboarding(),
      '2024-06-15T10:00:00.000Z',
    );
    expect(update.disclaimer_accepted_at).toBe('2024-06-15T10:00:00.000Z');
  });

  it('does NOT set disclaimer_accepted_at when not provided', () => {
    const update = buildProfileUpdateFromOnboarding(onboarding());
    expect(update.disclaimer_accepted_at).toBeUndefined();
  });

  it('does not set fitzpatrick_type when skinTone or sunReaction missing', () => {
    expect(
      buildProfileUpdateFromOnboarding(onboarding({ skinTone: null, sunReaction: 'burns-then-tans' }))
        .fitzpatrick_type,
    ).toBeUndefined();
    expect(
      buildProfileUpdateFromOnboarding(onboarding({ skinTone: 'medium', sunReaction: null }))
        .fitzpatrick_type,
    ).toBeUndefined();
  });
});
