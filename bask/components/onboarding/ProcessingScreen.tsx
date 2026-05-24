'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { OnboardingAnswers } from '../../types';
import { deriveFitzpatrickType, FitzpatrickType } from '../../lib/dEngine';
import { generateMockSunData } from '../../lib/sunDataUtils';
import { BaskWeather } from '../../lib/plugins';
import { requestOnboardingReview } from '../../lib/services/inAppReviewService';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'] as const;

type ProcessingRow = {
  icon: string;
  pendingLabel: string;
  getDoneLabel: (ctx: { fitzpatrickType: FitzpatrickType }) => string;
  isDone: (ctx: { isReady: boolean }) => boolean;
};

const PROCESSING_ROWS: ProcessingRow[] = [
  {
    icon: '👤',
    pendingLabel: 'Analyzing your skin type...',
    getDoneLabel: ({ fitzpatrickType }) =>
      `${formatSkinTypeLabel(fitzpatrickType)} identified`,
    isDone: () => true,
  },
  {
    icon: '☀️',
    pendingLabel: 'Checking local UV conditions...',
    getDoneLabel: () => 'Local UV conditions synced',
    isDone: ({ isReady }) => isReady,
  },
  {
    icon: '⏱️',
    pendingLabel: 'Calculating sunburn threshold...',
    getDoneLabel: () => 'Sunburn threshold calculated',
    isDone: ({ isReady }) => isReady,
  },
  {
    icon: '⏰',
    pendingLabel: 'Estimating daily Vitamin D window...',
    getDoneLabel: () => 'Daily Vitamin D plan ready',
    isDone: ({ isReady }) => isReady,
  },
];

function formatSkinTypeLabel(type: FitzpatrickType): string {
  return `Skin Type ${ROMAN[type - 1]}`;
}

function resolveFitzpatrickFromAnswers(answers: OnboardingAnswers): FitzpatrickType {
  if (answers.skinTone && answers.sunReaction) {
    return deriveFitzpatrickType(answers.skinTone, answers.sunReaction);
  }
  return 2;
}

interface ProcessingScreenProps {
  answers: OnboardingAnswers;
  onComplete: () => void;
}

export default function ProcessingScreen({
  answers,
  onComplete,
}: ProcessingScreenProps) {
  const [isReady, setIsReady] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [reviewRequested, setReviewRequested] = useState(false);
  const reviewTriggeredRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchUv() {
      const isNative = Capacitor.isNativePlatform();

      if (!isNative) {
        generateMockSunData();
        if (!cancelled) setIsReady(true);
        return;
      }

      try {
        await BaskWeather.getCurrentWeather();
        if (!cancelled) setIsReady(true);
      } catch {
        generateMockSunData();
        if (!cancelled) setIsReady(true);
      }
    }

    fetchUv();

    return () => {
      cancelled = true;
    };
  }, []);

  const fitzpatrickType = useMemo(
    () => resolveFitzpatrickFromAnswers(answers),
    [answers],
  );

  useEffect(() => {
    if (currentStep < PROCESSING_ROWS.length) {
      const timer = setTimeout(() => {
        setCurrentStep((prev) => prev + 1);
      }, 800);

      return () => clearTimeout(timer);
    }

    if (!showResults && isReady) {
      const resultTimer = setTimeout(() => {
        setShowResults(true);
      }, 500);

      return () => clearTimeout(resultTimer);
    }
  }, [currentStep, showResults, isReady]);

  useEffect(() => {
    if (!showResults || reviewTriggeredRef.current) return;
    reviewTriggeredRef.current = true;

    requestOnboardingReview().finally(() => setReviewRequested(true));
  }, [showResults]);

  const handleContinue = async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      // Web fallback
    }
    onComplete();
  };

  const progressPercent = Math.min(
    Math.round((currentStep / PROCESSING_ROWS.length) * 100),
    100,
  );

  return (
    <div className='flex flex-col flex-1 items-center justify-center px-6 relative overflow-hidden'>
      {/* Atmospheric gradient background */}
      <div
        className='fixed inset-0 pointer-events-none'
        style={{
          background:
            'linear-gradient(180deg, #F5F5F5 0%, #FAFAFA 50%, #FFFFFF 100%)',
        }}
      />

      <div className='relative z-10 w-full max-w-md'>
        {/* Title */}
        <h2 className='text-2xl font-bold text-center text-gray-900 mb-4 mt-[5rem]'>
          Personalizing your sun safety experience...
        </h2>

        {/* Results list */}
        <div className='space-y-4 mb-8'>
          {PROCESSING_ROWS.map((row, index) => {
            const isRevealed = currentStep > index;
            const isDone = isRevealed && row.isDone({ isReady });
            const label = isDone
              ? row.getDoneLabel({ fitzpatrickType })
              : row.pendingLabel;

            return (
              <div
                key={index}
                className={`
                  flex items-center gap-4 py-4 px-5 rounded-xl border-b border-gray-200
                  transition-all duration-500
                  ${
                    isRevealed
                      ? 'opacity-100 translate-y-0'
                      : 'opacity-0 translate-y-4'
                  }
                `}>
                <span className='text-2xl'>{row.icon}</span>
                <span
                  className={`flex-1 text-base font-medium transition-colors duration-300 ${
                    isDone
                      ? 'text-gray-900'
                      : isRevealed
                        ? 'text-gray-500 animate-pulse'
                        : 'text-gray-500'
                  }`}>
                  {label}
                </span>
                {isDone && (
                  <div className='w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center animate-in fade-in zoom-in duration-300'>
                    <svg
                      className='w-4 h-4 text-white'
                      fill='none'
                      viewBox='0 0 24 24'
                      stroke='currentColor'
                      strokeWidth={3}>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        d='M5 13l4 4L19 7'
                      />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Progress indicator */}
        {!showResults && (
          <div className='flex items-center justify-center gap-2 mb-8'>
            <div className='text-sm text-gray-600'>
              {currentStep === 0 && 'Analyzing your skin type...'}
              {currentStep === 1 && 'Calculating Vitamin D absorption...'}
              {currentStep === 2 && 'Checking UV conditions...'}
              {currentStep === 3 && 'Finalizing your plan...'}
            </div>
            <div className='text-sm font-semibold text-gray-900'>
              {progressPercent}%
            </div>
          </div>
        )}

        {/* Continue button (only show when complete) */}
        {showResults && reviewRequested && (
          <div className='mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500'>
            <button
              onClick={handleContinue}
              className='w-full py-4 rounded-full bg-black text-white text-[17px] font-semibold active:scale-[0.98] transition-all duration-200 shadow-lg'>
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
