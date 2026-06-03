'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import {
  capture,
  ANALYTICS_EVENTS,
  getOnboardingStepName,
} from '../../lib/analytics';
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
import { DEFAULT_DAILY_GOAL_IU } from '../../lib/constants';
import {
  getSkinReflection,
  getOutdoorReflection,
  getSunscreenReflection,
} from '../../lib/onboarding/scienceFacts';
import { useOnboardingContext } from '../../contexts/OnboardingContext';
import { WarmBackground, WarmTopBar } from './warm/atoms';
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
import PlanReadyScreen from './PlanReadyScreen';
import VitaminDGoalScreen from './VitaminDGoalScreen';

const DEFAULT_ANSWERS: OnboardingAnswers = {
  symptoms: [],
  skinTone: null,
  eyeColor: null,
  sunReaction: null,
  outdoorTime: null,
  sunscreenFrequency: null,
  vitaminDSupplementation: null,
  dailyGoalIU: DEFAULT_DAILY_GOAL_IU,
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

  // Emit a step-view event whenever the visible onboarding screen changes
  // (including the initial screen). Powers the PostHog drop-off funnel.
  const prevScreenRef = useRef<number | null>(null);
  useEffect(() => {
    const prev = prevScreenRef.current;
    const direction = prev === null || currentScreen >= prev ? 'forward' : 'back';
    capture(ANALYTICS_EVENTS.onboardingStepViewed, {
      step_index: currentScreen,
      step_name: getOnboardingStepName(currentScreen),
      direction,
    });
    prevScreenRef.current = currentScreen;
  }, [currentScreen]);

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
            subtitle="Pick anything that resonates. We'll tailor your plan."
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
            variant="bubble"
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
            subtitle="Short outdoor time is one of the strongest predictors of low vitamin D."
            options={outdoorTimeOptions}
            selectedValue={answers.outdoorTime}
            onSelect={(value) => handleSingleSelect('outdoorTime', value)}
            onContinue={handleContinue}
            citationId="deficient"
          />
        );

      // Screen 6: Outdoor Reflection
      case 6: {
        const reflection = getOutdoorReflection(answers.outdoorTime);
        return (
          <ReflectionScreen
            variant="insight"
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
            variant="spf"
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

      // Screen 10: Daily Goal
      case 10:
        return (
          <VitaminDGoalScreen
            selectedGoal={answers.dailyGoalIU ?? DEFAULT_DAILY_GOAL_IU}
            onSelect={(dailyGoalIU) => handleMultipleUpdates({ dailyGoalIU })}
            onContinue={handleContinue}
          />
        );

      // Screen 11: Biological Profile
      case 11:
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

      // Screen 12: Medical Disclaimer
      case 12:
        return (
          <MedicalDisclaimerScreen
            onAccept={() => {
              handleMultipleUpdates({ medicalDisclaimerAccepted: true });
              handleContinue();
            }}
          />
        );

      // Screen 13: Location Permission
      case 13:
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

      // Screen 14: Notification Permission
      case 14:
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

      // Screen 15: HealthKit Permission
      case 15:
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

      // Screen 16: Generating
      case 16:
        return (
          <ProcessingScreen
            answers={answers}
            onComplete={handleContinue}
          />
        );

      // Screen 17: Plan ready
      case 17:
        return <PlanReadyScreen onComplete={handleProcessingComplete} />;

      default:
        return null;
    }
  };

  // Chrome (back + progress) shows only on the question screens.
  const showChrome = currentScreen >= 1 && currentScreen <= 15;
  const heroBg = currentScreen === 0 || currentScreen >= TOTAL_ONBOARDING_SCREENS - 2;
  const frac = currentScreen / 15;

  return (
    <div className="fixed inset-0 flex flex-col pt-safe pb-safe">
      <WarmBackground variant={heroBg ? 'hero' : 'default'} />

      {showChrome && (
        <div className="relative z-20">
          <WarmTopBar frac={frac} onBack={handleBack} show />
        </div>
      )}

      <div className="relative z-10 flex-1 flex flex-col min-h-0">{renderScreen()}</div>
    </div>
  );
}
