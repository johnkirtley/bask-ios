import { OnboardingAnswers } from '../types';

// Option structure for onboarding questions
export interface OnboardingOption {
  value: string;
  label: string;
  description?: string;
  colorHex?: string; // For color swatches
}

// Dual-select section (for skin/eye color screen)
export interface DualSelectSection {
  id: keyof OnboardingAnswers;
  title: string;
  options: OnboardingOption[];
}

// Screen 2: Goal Selection
export const goalOptions: OnboardingOption[] = [
  { value: 'vitamin-d', label: 'Optimizing Vitamin D Levels' },
  { value: 'tanning', label: 'Safe Tanning & Burn Prevention' },
  { value: 'circadian', label: 'Circadian Rhythm & Better Sleep' },
  { value: 'longevity', label: 'Longevity & Natural Immunity' },
];

// Screen 3: Skin & Eye Color (Fitzpatrick Assessment Part 1)
export const skinToneOptions: OnboardingOption[] = [
  { value: 'very-fair', label: 'Very Fair', colorHex: '#FFE4D1' },
  { value: 'fair', label: 'Fair', colorHex: '#F5D0B5' },
  { value: 'medium', label: 'Medium', colorHex: '#D4A574' },
  { value: 'olive', label: 'Olive', colorHex: '#B8936A' },
  { value: 'brown', label: 'Brown', colorHex: '#8B6914' },
  { value: 'dark-brown', label: 'Dark Brown', colorHex: '#5C4033' },
];

export const eyeColorOptions: OnboardingOption[] = [
  { value: 'blue', label: 'Blue', colorHex: '#6CA0DC' },
  { value: 'green', label: 'Green', colorHex: '#7BA05B' },
  { value: 'hazel', label: 'Hazel', colorHex: '#A67B5B' },
  { value: 'brown', label: 'Brown', colorHex: '#8B4513' },
  { value: 'dark-brown', label: 'Dark Brown', colorHex: '#3D2314' },
];

// Screen 4: Sun Reaction (Fitzpatrick Assessment Part 2)
export const sunReactionOptions: OnboardingOption[] = [
  { value: 'always-burns', label: 'Always burns, never tans' },
  { value: 'burns-then-tans', label: 'Burns first, then tans lightly' },
  { value: 'rarely-burns', label: 'Rarely burns, tans easily' },
];

// Screen 5: Outdoor Time (Lifestyle)
export const outdoorTimeOptions: OnboardingOption[] = [
  { value: 'under-15', label: 'Less than 15 minutes' },
  { value: '15-60', label: '15-60 minutes' },
  { value: '1-3-hours', label: '1-3 hours' },
  { value: '3-plus', label: '3+ hours' },
];

// Screen 6: Vitamin D Supplementation
export const supplementationOptions: OnboardingOption[] = [
  { value: 'no', label: 'No' },
  { value: 'daily', label: 'Daily' },
  { value: 'occasionally', label: 'Occasionally' },
];

// Screen 7: Typical Attire (Body Surface Area)
export const attireOptions: OnboardingOption[] = [
  { value: 'face-hands', label: 'Face & Hands Only', description: '~10% exposed' },
  { value: 't-shirt-shorts', label: 'T-Shirt & Shorts', description: '~50% exposed' },
  { value: 'swimwear', label: 'Swimwear/Tank Top', description: '~80% exposed' },
];

// Screen 11: Processing Screen Text Sequence
export const processingSteps: string[] = [
  'Calculating your optimal solar windows...',
  'Syncing with local UV data...',
  'Building your 2026 Vitamin D plan.',
];

// Total number of onboarding screens
export const TOTAL_ONBOARDING_SCREENS = 11;

// Legal links (used by settings page)
export const legalContent = {
  links: {
    privacyPolicy: 'https://www.bask.io/privacy',
    termsOfService: 'https://www.bask.io/terms',
  },
};
