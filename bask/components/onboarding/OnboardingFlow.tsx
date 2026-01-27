'use client';

import { useState, useCallback } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { OnboardingAnswers } from '../../types';
import {
  TOTAL_ONBOARDING_SCREENS,
  goalOptions,
  sunReactionOptions,
  outdoorTimeOptions,
  supplementationOptions,
  attireOptions,
} from '../../lib/onboardingData';
import { useOnboardingContext } from '../../contexts/OnboardingContext';
import ProgressBar from './ProgressBar';
import EmotionalHookScreen from './EmotionalHookScreen';
import SingleSelectScreen from './SingleSelectScreen';
import SkinEyeColorScreen from './SkinEyeColorScreen';
import ProcessingScreen from './ProcessingScreen';
import TypicalAttireScreen from './TypicalAttireScreen';
import BiologicalProfileScreen from './BiologicalProfileScreen';
import MedicalDisclaimerScreen from './MedicalDisclaimerScreen';
import LocationPermissionScreen from './LocationPermissionScreen';
import BloodTestScreen from './BloodTestScreen';

export default function OnboardingFlow() {
  const { completeOnboarding } = useOnboardingContext();
  const [currentScreen, setCurrentScreen] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswers>({
    primaryGoal: null,
    skinTone: null,
    eyeColor: null,
    sunReaction: null,
    outdoorTime: null,
    vitaminDSupplementation: null,
    typicalAttire: null,
    age: null,
    weight: null,
    weightUnit: 'lbs',
    medicalDisclaimerAccepted: false,
    locationPermissionGranted: false,
    hasBloodTest: false,
    bloodTestValue: null,
    bloodTestUnit: 'ng/mL',
    bloodTestDate: null,
  });

  const handleContinue = useCallback(async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      // Web fallback
    }
    setCurrentScreen((prev) => Math.min(prev + 1, TOTAL_ONBOARDING_SCREENS - 1));
  }, []);

  const handleBack = useCallback(async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      // Web fallback
    }
    setCurrentScreen((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleSingleSelect = useCallback(
    (field: keyof OnboardingAnswers, value: string) => {
      setAnswers((prev) => ({
        ...prev,
        [field]: value,
      }));
    },
    []
  );

  const handleMultipleUpdates = useCallback((updates: Partial<OnboardingAnswers>) => {
    setAnswers((prev) => ({
      ...prev,
      ...updates,
    }));
  }, []);

  const handleProcessingComplete = useCallback(async () => {
    await completeOnboarding(answers);
  }, [answers, completeOnboarding]);

  const renderScreen = () => {
    switch (currentScreen) {
      // Screen 0: Emotional Hook
      case 0:
        return <EmotionalHookScreen onContinue={handleContinue} />;

      // Screen 1: Goal Selection
      case 1:
        return (
          <SingleSelectScreen
            title="What is your primary focus with Bask?"
            options={goalOptions}
            selectedValue={answers.primaryGoal}
            onSelect={(value) => handleSingleSelect('primaryGoal', value)}
            onContinue={handleContinue}
          />
        );

      // Screen 2: Skin & Eye Color
      case 2:
        return (
          <SkinEyeColorScreen
            skinTone={answers.skinTone}
            eyeColor={answers.eyeColor}
            onSkinToneSelect={(value) => handleSingleSelect('skinTone', value)}
            onEyeColorSelect={(value) => handleSingleSelect('eyeColor', value)}
            onContinue={handleContinue}
          />
        );

      // Screen 3: Sun Reaction
      case 3:
        return (
          <SingleSelectScreen
            title="How does your skin typically react to 30 minutes of midday sun?"
            options={sunReactionOptions}
            selectedValue={answers.sunReaction}
            onSelect={(value) => handleSingleSelect('sunReaction', value)}
            onContinue={handleContinue}
          />
        );

      // Screen 4: Outdoor Time
      case 4:
        return (
          <SingleSelectScreen
            title="On a typical weekday, how much time do you spend outdoors?"
            options={outdoorTimeOptions}
            selectedValue={answers.outdoorTime}
            onSelect={(value) => handleSingleSelect('outdoorTime', value)}
            onContinue={handleContinue}
          />
        );

      // Screen 5: Supplementation
      case 5:
        return (
          <SingleSelectScreen
            title="Are you currently taking Vitamin D3 supplements?"
            options={supplementationOptions}
            selectedValue={answers.vitaminDSupplementation}
            onSelect={(value) => handleSingleSelect('vitaminDSupplementation', value)}
            onContinue={handleContinue}
          />
        );

      // Screen 6: Typical Attire
      case 6:
        return (
          <TypicalAttireScreen
            selectedValue={answers.typicalAttire}
            onSelect={(value) => handleSingleSelect('typicalAttire', value)}
            onContinue={handleContinue}
          />
        );

      // Screen 7: Biological Profile
      case 7:
        return (
          <BiologicalProfileScreen
            age={answers.age}
            weight={answers.weight}
            weightUnit={answers.weightUnit}
            onAgeChange={(age) => handleMultipleUpdates({ age })}
            onWeightChange={(weight) => handleMultipleUpdates({ weight })}
            onWeightUnitChange={(weightUnit) => handleMultipleUpdates({ weightUnit })}
            onContinue={handleContinue}
          />
        );

      // Screen 8: Blood Test Baseline
      case 8:
        return (
          <BloodTestScreen
            hasBloodTest={answers.hasBloodTest}
            bloodTestValue={answers.bloodTestValue}
            bloodTestUnit={answers.bloodTestUnit}
            bloodTestDate={answers.bloodTestDate}
            onUpdate={(data) => handleMultipleUpdates(data)}
            onContinue={handleContinue}
          />
        );

      // Screen 9: Medical Disclaimer
      case 9:
        return (
          <MedicalDisclaimerScreen
            onAccept={() => {
              handleMultipleUpdates({ medicalDisclaimerAccepted: true });
              handleContinue();
            }}
          />
        );

      // Screen 10: Location Permission
      case 10:
        return (
          <LocationPermissionScreen
            onPermissionGranted={() => {
              handleMultipleUpdates({ locationPermissionGranted: true });
              handleContinue();
            }}
            onSkip={() => {
              handleMultipleUpdates({ locationPermissionGranted: false });
              handleContinue();
            }}
          />
        );

      // Screen 11: Processing
      case 11:
        return <ProcessingScreen onComplete={handleProcessingComplete} />;

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-dark-bg via-dark-surface to-gradient-warm flex flex-col">
      {/* Progress bar (only show on screens 1-10, not on emotional hook or processing) */}
      {currentScreen > 0 && currentScreen < TOTAL_ONBOARDING_SCREENS - 1 && (
        <ProgressBar currentStep={currentScreen - 1} totalSteps={10} />
      )}

      {/* Back button (only show on screens 1-10) */}
      {currentScreen > 0 && currentScreen < TOTAL_ONBOARDING_SCREENS - 1 && (
        <div className="absolute top-safe left-4 z-10">
          <button
            onClick={handleBack}
            className="p-2 text-text-secondary active:scale-95 transition-transform duration-200"
            aria-label="Go back"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
      )}

      {/* Screen content */}
      <div className="flex-1 overflow-hidden">{renderScreen()}</div>
    </div>
  );
}
