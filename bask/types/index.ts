// Subscription state
export interface SubscriptionState {
  isInitialized: boolean;
  isLoading: boolean;
  isPremium: boolean;
  error: string | null;
}

// Onboarding types
export interface OnboardingAnswers {
  // Screen 1: Symptoms (multi-select)
  symptoms: string[];

  // Fitzpatrick Part 1
  skinTone: string | null;
  eyeColor: string | null;

  // Fitzpatrick Part 2
  sunReaction: string | null;

  // Lifestyle
  outdoorTime: string | null;
  sunscreenFrequency: string | null;

  // Supplementation
  vitaminDSupplementation: string | null;
  dailyGoalIU: number | null;

  // Screen 7: Biological Profile
  age: number | null;
  weight: number | null;
  weightUnit: 'lbs' | 'kg';

  // Screen 8: Medical Disclaimer
  medicalDisclaimerAccepted: boolean;

  // Screen 9: Location Permission
  locationPermissionGranted: boolean;

  // Screen 10: Notification Permission
  notificationPermissionGranted: boolean;

  // Screen 11: HealthKit Permission
  healthKitPermissionGranted: boolean;

  // Blood Test Baseline (optional)
  hasBloodTest: boolean;
  bloodTestValue: number | null; // ng/mL or nmol/L
  bloodTestUnit: 'ng/mL' | 'nmol/L';
  bloodTestDate: string | null; // ISO date
}

export interface OnboardingState {
  isComplete: boolean;
  completedAt: string | null;
  agreedToTermsAt: string | null;
  answers: OnboardingAnswers;
  paywallShown: boolean;
}

// Bask session tracking types
export type PermissionResult = 'granted' | 'denied' | 'skipped';
export type BaskSessionStatus = 'idle' | 'active' | 'paused' | 'completed';
