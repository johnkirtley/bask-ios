// Subscription state
export interface SubscriptionState {
  isInitialized: boolean;
  isLoading: boolean;
  isPremium: boolean;
  error: string | null;
}

// Onboarding types
export interface OnboardingAnswers {
  // Screen 2: Goal Selection
  primaryGoal: string | null;

  // Screen 3: Fitzpatrick Part 1
  skinTone: string | null;
  eyeColor: string | null;

  // Screen 4: Fitzpatrick Part 2
  sunReaction: string | null;

  // Screen 5: Lifestyle
  outdoorTime: string | null;

  // Screen 6: Supplementation
  vitaminDSupplementation: string | null;

  // Screen 7: Typical Attire
  typicalAttire: string | null;

  // Screen 8: Biological Profile
  age: number | null;
  weight: number | null;
  weightUnit: 'lbs' | 'kg';

  // Screen 9: Medical Disclaimer
  medicalDisclaimerAccepted: boolean;

  // Screen 10: Location Permission
  locationPermissionGranted: boolean;
}

export interface OnboardingState {
  isComplete: boolean;
  completedAt: string | null;
  agreedToTermsAt: string | null;
  answers: OnboardingAnswers;
  paywallShown: boolean;
}

// Bask session tracking types
export type BaskSessionStatus = 'idle' | 'active' | 'paused' | 'completed';
