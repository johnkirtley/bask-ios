// Subscription state
export interface SubscriptionState {
  isInitialized: boolean;
  isLoading: boolean;
  isPremium: boolean;
  error: string | null;
}

// Onboarding types
export interface OnboardingAnswers {
  interest: string[];
}

export interface OnboardingState {
  isComplete: boolean;
  completedAt: string | null;
  agreedToTermsAt: string | null;
  answers: OnboardingAnswers;
  paywallShown: boolean;
}
