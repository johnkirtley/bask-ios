import { OnboardingAnswers } from '../types';

export interface OnboardingQuestion {
  id: keyof OnboardingAnswers;
  title: string;
  subtitle?: string;
  multiSelect?: boolean;
  options: {
    value: string;
    label: string;
    description?: string;
  }[];
}

// Template onboarding questions - customize for your app
export const onboardingQuestions: OnboardingQuestion[] = [
  {
    id: 'interest',
    title: 'What brings you here today?',
    options: [
      { value: 'option1', label: 'Option 1' },
      { value: 'option2', label: 'Option 2' },
      { value: 'option3', label: 'Option 3' },
      { value: 'option4', label: 'Option 4' },
    ],
  },
];

export const legalContent = {
  title: 'Terms of Use',
  subtitle: 'Please review and agree to our terms.',
  sections: [
    {
      title: '1. General Disclaimer',
      content:
        'This app provides information and features for general use. The content is not a substitute for professional advice.',
    },
    {
      title: '2. User Responsibility',
      content:
        'By using this app, you agree that you are using it at your own risk. Always exercise caution and common sense.',
    },
    {
      title: '3. Data & Privacy',
      content:
        'Your data is stored locally on your device. We use third-party services for subscriptions and analytics.',
    },
    {
      title: '4. Agreement',
      content:
        'By tapping "I Agree," you confirm you have read and accepted our Privacy Policy and Terms of Service.',
    },
  ],
  links: {
    privacyPolicy: 'https://www.example.com/privacy',
    termsOfService: 'https://www.example.com/terms',
  },
};
