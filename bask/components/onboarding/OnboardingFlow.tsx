'use client';

import { useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { OnboardingAnswers, PermissionResult } from '../../types';
import { databaseService } from '../../lib/database/connection';
import {
  TOTAL_ONBOARDING_SCREENS,
  symptomOptions,
  sunReactionOptions,
  outdoorTimeOptions,
  sunscreenFrequencyOptions,
  supplementationOptions,
} from '../../lib/onboardingData';
import {
  getSkinReflection,
  getOutdoorReflection,
  getSunscreenReflection,
} from '../../lib/onboarding/scienceFacts';
import { useOnboardingContext } from '../../contexts/OnboardingContext';
import ProgressBar from './ProgressBar';
import EmotionalHookScreen from './EmotionalHookScreen';
import SingleSelectScreen from './SingleSelectScreen';
import MultiSelectScreen from './MultiSelectScreen';
import SkinEyeColorScreen from './SkinEyeColorScreen';
import ReflectionScreen from './ReflectionScreen';
import ProcessingScreen from './ProcessingScreen';
import BiologicalProfileScreen from './BiologicalProfileScreen';
import MedicalDisclaimerScreen from './MedicalDisclaimerScreen';
import LocationPermissionScreen from './LocationPermissionScreen';
import NotificationPermissionScreen from './NotificationPermissionScreen';
import HealthKitPermissionScreen from './HealthKitPermissionScreen';

const DEFAULT_ANSWERS: OnboardingAnswers = {
  symptoms: [],
  skinTone: null,
  eyeColor: null,
  sunReaction: null,
  outdoorTime: null,
  sunscreenFrequency: null,
  vitaminDSupplementation: null,
  age: null,
  weight: null,
  weightUnit: 'lbs',
  medicalDisclaimerAccepted: false,
  locationPermissionGranted: false,
  notificationPermissionGranted: false,
  healthKitPermissionGranted: false,
  hasBloodTest: false,
  bloodTestValue: null,
  bloodTestUnit: 'ng/mL',
  bloodTestDate: null,
};

export default function OnboardingFlow() {
  const { completeOnboarding } = useOnboardingContext();
  const [currentScreen, setCurrentScreen] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswers>(DEFAULT_ANSWERS);

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

  const handleMultiSelectToggle = useCallback((field: 'symptoms', value: string) => {
    setAnswers((prev) => {
      const currentValues = prev[field];
      const newValues = currentValues.includes(value)
        ? currentValues.filter((v) => v !== value)
        : [...currentValues, value];
      return {
        ...prev,
        [field]: newValues,
      };
    });
  }, []);

  const handleProcessingComplete = useCallback(async () => {
    await completeOnboarding(answers);
  }, [answers, completeOnboarding]);

  const renderScreen = () => {
    switch (currentScreen) {
      // Screen 0: Emotional Hook
      case 0:
        return <EmotionalHookScreen onContinue={handleContinue} />;

      // Screen 1: Symptoms (multi-select)
      case 1:
        return (
          <MultiSelectScreen
            title="What brought you to Bask?"
            subtitle="Pick anything that resonates — we'll tailor your plan."
            options={symptomOptions}
            selectedValues={answers.symptoms}
            onToggle={(value) => handleMultiSelectToggle('symptoms', value)}
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

      // Screen 3: Skin Reflection
      case 3: {
        const reflection = getSkinReflection(answers.skinTone);
        return (
          <ReflectionScreen
            label={reflection?.label}
            body={reflection?.body ?? 'Your skin type helps Bask personalize your vitamin D plan.'}
            onContinue={handleContinue}
          />
        );
      }

      // Screen 4: Sun Reaction
      case 4:
        return (
          <SingleSelectScreen
            title="How does your skin typically react to 30 minutes of midday sun?"
            options={sunReactionOptions}
            selectedValue={answers.sunReaction}
            onSelect={(value) => handleSingleSelect('sunReaction', value)}
            onContinue={handleContinue}
          />
        );

      // Screen 5: Outdoor Time
      case 5:
        return (
          <SingleSelectScreen
            title="On a typical weekday, how much time do you spend outdoors?"
            options={outdoorTimeOptions}
            selectedValue={answers.outdoorTime}
            onSelect={(value) => handleSingleSelect('outdoorTime', value)}
            onContinue={handleContinue}
          />
        );

      // Screen 6: Outdoor Reflection
      case 6: {
        const reflection = getOutdoorReflection(answers.outdoorTime);
        return (
          <ReflectionScreen
            headline={reflection?.headline}
            body={reflection?.body ?? 'Your outdoor habits help Bask build a plan that fits your lifestyle.'}
            onContinue={handleContinue}
          />
        );
      }

      // Screen 7: Sunscreen Frequency
      case 7:
        return (
          <SingleSelectScreen
            title="How often do you wear sunscreen?"
            options={sunscreenFrequencyOptions}
            selectedValue={answers.sunscreenFrequency}
            onSelect={(value) => handleSingleSelect('sunscreenFrequency', value)}
            onContinue={handleContinue}
          />
        );

      // Screen 8: Sunscreen Reflection
      case 8: {
        const reflection = getSunscreenReflection(answers.sunscreenFrequency);
        return (
          <ReflectionScreen
            label={reflection?.label}
            body={reflection?.body ?? 'Your SPF routine helps Bask time your sun exposure correctly.'}
            onContinue={handleContinue}
          />
        );
      }

      // Screen 9: Supplementation
      case 9:
        return (
          <SingleSelectScreen
            title="Are you currently taking Vitamin D3 supplements?"
            options={supplementationOptions}
            selectedValue={answers.vitaminDSupplementation}
            onSelect={(value) => handleSingleSelect('vitaminDSupplementation', value)}
            onContinue={handleContinue}
          />
        );

      // Screen 10: Biological Profile
      case 10:
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

      // Screen 11: Medical Disclaimer
      case 11:
        return (
          <MedicalDisclaimerScreen
            onAccept={() => {
              handleMultipleUpdates({ medicalDisclaimerAccepted: true });
              handleContinue();
            }}
          />
        );

      // Screen 12: Location Permission
      case 12:
        return (
          <LocationPermissionScreen
            onPermissionResult={(result: PermissionResult) => {
              handleMultipleUpdates({
                locationPermissionGranted: result === 'granted',
              });
              handleContinue();
            }}
          />
        );

      // Screen 13: Notification Permission
      case 13:
        return (
          <NotificationPermissionScreen
            onPermissionResult={(result: PermissionResult) => {
              handleMultipleUpdates({
                notificationPermissionGranted: result === 'granted',
              });
              handleContinue();
            }}
          />
        );

      // Screen 14: HealthKit Permission
      case 14:
        return (
          <HealthKitPermissionScreen
            onPermissionResult={async (result: PermissionResult) => {
              handleMultipleUpdates({
                healthKitPermissionGranted: result === 'granted',
              });

              if (result === 'granted' && Capacitor.isNativePlatform()) {
                try {
                  const db = await databaseService.getConnection();
                  await db.run(
                    `INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)`,
                    ['healthkit_enabled', 'true', new Date().toISOString()],
                  );
                } catch (err) {
                  console.error('Failed to persist healthkit_enabled to SQLite:', err);
                }
              }

              handleContinue();
            }}
          />
        );

      // Screen 15: Processing
      case 15:
        return (
          <ProcessingScreen
            answers={answers}
            onComplete={handleProcessingComplete}
          />
        );

      default:
        return null;
    }
  };

  const showChrome = currentScreen > 0 && currentScreen < TOTAL_ONBOARDING_SCREENS - 1;

  return (
    <div className={`fixed inset-0 flex flex-col ${showChrome ? 'pt-safe pb-safe' : ''}`}>
      {showChrome && (
        <div className="relative z-20">
          <ProgressBar currentStep={currentScreen - 1} totalSteps={14} />
        </div>
      )}

      {showChrome && (
        <div className="px-4 py-2 relative z-20">
          <button
            onClick={handleBack}
            className="p-3 rounded-full bg-white/80 backdrop-blur-sm text-gray-900 active:scale-95 transition-transform duration-200 shadow-sm"
            aria-label="Go back"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto relative">{renderScreen()}</div>
    </div>
  );
}
