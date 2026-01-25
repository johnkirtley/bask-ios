'use client';

import { useState, useCallback } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { OnboardingAnswers } from '../../types';
import { onboardingQuestions } from '../../lib/onboardingData';
import { useOnboardingContext } from '../../contexts/OnboardingContext';
import PageIndicator from './PageIndicator';
import WelcomeScreen from './WelcomeScreen';
import QuestionScreen from './QuestionScreen';
import LegalScreen from './LegalScreen';

const TOTAL_SCREENS = 3; // 1 welcome + 1 question + 1 legal

export default function OnboardingFlow() {
  const { completeOnboarding } = useOnboardingContext();
  const [currentScreen, setCurrentScreen] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswers>({
    interest: [],
  });

  const handleToggleAnswer = useCallback(
    (questionId: keyof OnboardingAnswers, value: string) => {
      setAnswers((prev) => {
        const currentValues = prev[questionId];
        const isSelected = currentValues.includes(value);
        return {
          ...prev,
          [questionId]: isSelected
            ? currentValues.filter((v) => v !== value)
            : [...currentValues, value],
        };
      });
    },
    []
  );

  const handleSingleSelect = useCallback(
    (questionId: keyof OnboardingAnswers, value: string) => {
      setAnswers((prev) => ({
        ...prev,
        [questionId]: [value],
      }));
    },
    []
  );

  const handleContinue = useCallback(async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      // Web fallback
    }
    setCurrentScreen((prev) => Math.min(prev + 1, TOTAL_SCREENS - 1));
  }, []);

  const handleBack = useCallback(async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      // Web fallback
    }
    setCurrentScreen((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleLegalAgree = useCallback(async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      // Web fallback
    }
    await completeOnboarding(answers);
  }, [answers, completeOnboarding]);

  const renderScreen = () => {
    // Screen 0: Welcome
    if (currentScreen === 0) {
      return <WelcomeScreen onGetStarted={handleContinue} />;
    }

    // Screen 1: Question
    if (currentScreen === 1) {
      const question = onboardingQuestions[0];
      const isMultiSelect = question.multiSelect !== false;
      const answerValues = answers[question.id];
      return (
        <QuestionScreen
          question={question}
          selectedValues={answerValues}
          onToggle={(value) =>
            isMultiSelect
              ? handleToggleAnswer(question.id, value)
              : handleSingleSelect(question.id, value)
          }
          onContinue={handleContinue}
        />
      );
    }

    // Screen 2: Legal
    return <LegalScreen onAgree={handleLegalAgree} />;
  };

  return (
    <div className="fixed inset-0 bg-limestone flex flex-col">
      {/* Header with back button and page indicator */}
      <div className="flex items-center justify-between px-4 pt-safe pb-2">
        <div className="w-16">
          {currentScreen > 0 && currentScreen < TOTAL_SCREENS - 1 && (
            <button
              onClick={handleBack}
              className="p-2 -ml-2 text-umber-muted active:scale-95"
              aria-label="Go back"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          )}
        </div>

        {currentScreen < TOTAL_SCREENS - 1 && (
          <PageIndicator totalPages={TOTAL_SCREENS - 1} currentPage={currentScreen} />
        )}

        <div className="w-16" />
      </div>

      {/* Screen content */}
      <div className="flex-1 overflow-hidden">{renderScreen()}</div>
    </div>
  );
}
