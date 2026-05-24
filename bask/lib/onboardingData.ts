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

// Screen 1: Symptoms (multi-select)
export const symptomOptions: OnboardingOption[] = [
  { value: 'low-energy', label: 'Low energy / fatigue' },
  { value: 'poor-sleep', label: 'Poor sleep' },
  { value: 'mood-dips', label: 'Mood dips' },
  { value: 'frequent-illness', label: 'Frequent colds or illness' },
  { value: 'brain-fog', label: 'Brain fog' },
  { value: 'joint-bone', label: 'Joint or bone discomfort' },
  { value: 'hormonal', label: 'Hormonal concerns' },
  { value: 'low-blood-test', label: 'Recent blood test flagged low' },
];

// Skin & Eye Color (Fitzpatrick Assessment Part 1)
export const skinToneOptions: OnboardingOption[] = [
  { value: 'very-fair', label: 'Very Fair', colorHex: '#F9EBDD' },
  { value: 'fair', label: 'Fair', colorHex: '#EFD3B1' },
  { value: 'medium', label: 'Medium', colorHex: '#D5A77F' },
  { value: 'olive', label: 'Olive', colorHex: '#9B6338' },
  { value: 'brown', label: 'Brown', colorHex: '#6B3E26' },
  { value: 'dark-brown', label: 'Dark Brown', colorHex: '#3C2016' },
];

export const eyeColorOptions: OnboardingOption[] = [
  { value: 'blue', label: 'Blue', colorHex: '#6CA0DC' },
  { value: 'green', label: 'Green', colorHex: '#7BA05B' },
  { value: 'hazel', label: 'Hazel', colorHex: '#A67B5B' },
  { value: 'brown', label: 'Brown', colorHex: '#8B4513' },
  { value: 'dark-brown', label: 'Dark Brown', colorHex: '#3D2314' },
];

// Sun Reaction (Fitzpatrick Assessment Part 2)
export const sunReactionOptions: OnboardingOption[] = [
  { value: 'always-burns', label: 'Always burns, never tans' },
  { value: 'burns-then-tans', label: 'Burns first, then tans lightly' },
  { value: 'rarely-burns', label: 'Rarely burns, tans easily' },
];

// Outdoor Time (Lifestyle)
export const outdoorTimeOptions: OnboardingOption[] = [
  { value: 'under-15', label: 'Less than 15 minutes' },
  { value: '15-60', label: '15-60 minutes' },
  { value: '1-3-hours', label: '1-3 hours' },
  { value: '3-plus', label: '3+ hours' },
];

// Sunscreen Frequency
export const sunscreenFrequencyOptions: OnboardingOption[] = [
  { value: 'never', label: 'Never', description: 'Maximum UVB exposure' },
  { value: 'beach-only', label: 'Only at the beach', description: 'Most days unprotected' },
  { value: 'when-i-remember', label: 'When I remember', description: 'Inconsistent SPF' },
  { value: 'daily-spf', label: 'Daily SPF', description: 'Skin protected most of the day' },
];

// Vitamin D Supplementation
export const supplementationOptions: OnboardingOption[] = [
  { value: 'no', label: 'No' },
  { value: 'daily', label: 'Daily' },
  { value: 'occasionally', label: 'Occasionally' },
];

// Processing Screen Text Sequence
export const processingSteps: string[] = [
  'Calculating your optimal solar windows...',
  'Syncing with local UV data...',
  `Building your ${new Date().getFullYear()} Vitamin D plan.`,
];

// Total number of onboarding screens
export const TOTAL_ONBOARDING_SCREENS = 16;

// Legal links (used by settings page)
export const legalContent = {
  links: {
    privacyPolicy: 'https://www.getbask.app/privacy',
    termsOfService: 'https://www.getbask.app/terms',
  },
};
