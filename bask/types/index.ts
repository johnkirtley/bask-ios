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
