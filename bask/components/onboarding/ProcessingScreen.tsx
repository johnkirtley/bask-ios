'use client';

import { useState, useEffect } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { processingSteps } from '../../lib/onboardingData';

interface ProcessingScreenProps {
  onComplete: () => void;
}

export default function ProcessingScreen({ onComplete }: ProcessingScreenProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);

  useEffect(() => {
    if (currentStep < processingSteps.length) {
      const timer = setTimeout(() => {
        setCurrentStep((prev) => prev + 1);
      }, 2000); // 2 seconds per step

      return () => clearTimeout(timer);
    } else if (!showCompletion) {
      // All steps complete - show completion screen after small delay
      const completionTimer = setTimeout(() => {
        setShowCompletion(true);
      }, 500);

      return () => clearTimeout(completionTimer);
    }
  }, [currentStep, showCompletion]);

  const handleContinue = async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      // Web fallback
    }
    onComplete();
  };

  if (showCompletion) {
    // Completion state
    return (
      <div className="flex flex-col items-center justify-center flex-1 px-6 pb-safe">
        {/* Success checkmark */}
        <div className="mb-8">
          <div className="w-20 h-20 rounded-full bg-golden-glow/20 border-2 border-golden-glow flex items-center justify-center">
            <svg
              className="w-12 h-12 text-golden-glow"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>

        {/* Success message */}
        <h2 className="font-title text-[32px] text-center text-white mb-3">
          We&apos;ve saved your profile
        </h2>
        <p className="text-[15px] text-center text-text-secondary mb-12 max-w-sm">
          (Don&apos;t worry, we store it all on your device)
        </p>

        {/* Continue button */}
        <button
          onClick={handleContinue}
          className="
            w-full max-w-sm py-4 rounded-full
            bg-golden-glow text-dark-bg text-[17px] font-semibold
            active:scale-[0.98] transition-all duration-200
          "
        >
          Continue
        </button>
      </div>
    );
  }

  // Processing animation
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 pb-safe">
      {/* Processing orb container */}
      <div className="relative w-[200px] h-[200px] mb-16">
        {/* Main pulsing orb */}
        <div className="processing-orb absolute inset-0 m-auto" />

        {/* Orbiting particles */}
        {[0, 120, 240].map((rotation) => (
          <div
            key={rotation}
            className="orbit-particle absolute inset-0 m-auto"
            style={{
              animationDelay: `${rotation / 120}s`,
            }}
          />
        ))}
      </div>

      {/* Processing text with fade transition */}
      <div className="min-h-[60px] flex items-center justify-center">
        {currentStep < processingSteps.length && (
          <p
            className="text-[17px] text-center text-text-secondary processing-text-enter"
            key={currentStep}
          >
            {processingSteps[currentStep]}
          </p>
        )}
      </div>
    </div>
  );
}
