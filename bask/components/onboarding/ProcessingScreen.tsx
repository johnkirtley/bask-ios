'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { IonAlert } from '@ionic/react';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { OnboardingAnswers } from '../../types';
import { deriveFitzpatrickType, FitzpatrickType } from '../../lib/dEngine';
import { generateMockSunData } from '../../lib/sunDataUtils';
import { BaskWeather } from '../../lib/plugins';
import { REVIEW_FEEDBACK_FORM_URL } from '../../lib/constants';
import { capture, ANALYTICS_EVENTS } from '../../lib/analytics';
import {
  markNativeReviewRequested,
  markNegativeReviewFeedback,
  markReviewPromptShown,
  requestAppReview,
  shouldSuppressReviewPrompts,
} from '../../lib/services/inAppReviewService';
import Mascot from '../ui/Mascot';
import ReviewPromptModal from '../ui/ReviewPromptModal';
import {
  WARM,
  WarmBody,
  WarmCTA,
  WarmHeadline,
} from './warm/atoms';
import { CheckIcon } from './warm/icons';
import { Confetti } from './warm/Confetti';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'] as const;

type ProcessingRow = {
  pendingLabel: string;
  processingMs: number;
  getDoneLabel: (ctx: { fitzpatrickType: FitzpatrickType; usedFallback: boolean }) => string;
  isDone: (ctx: { isReady: boolean }) => boolean;
};

const PROCESSING_ROWS: ProcessingRow[] = [
  {
    pendingLabel: 'Calibrating your skin type…',
    processingMs: 650,
    getDoneLabel: ({ fitzpatrickType }) => `${formatSkinTypeLabel(fitzpatrickType)} calibrated`,
    isDone: () => true,
  },
  {
    pendingLabel: 'Syncing local UV…',
    processingMs: 1500,
    getDoneLabel: ({ usedFallback }) =>
      usedFallback ? 'Estimated UV synced' : 'Local UV synced',
    isDone: ({ isReady }) => isReady,
  },
  {
    pendingLabel: 'Calculating your burn limit…',
    processingMs: 900,
    getDoneLabel: () => 'Burn limit calculated',
    isDone: ({ isReady }) => isReady,
  },
  {
    pendingLabel: 'Mapping your D-Window…',
    processingMs: 1200,
    getDoneLabel: () => 'Your D-Window mapped',
    isDone: ({ isReady }) => isReady,
  },
  {
    pendingLabel: 'Finalizing your daily plan…',
    processingMs: 700,
    getDoneLabel: () => 'Daily plan ready',
    isDone: ({ isReady }) => isReady,
  },
];

const POLL_INTERVAL_MS = 50;
const RESULTS_DELAY_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

export default function ProcessingScreen({ answers, onComplete }: ProcessingScreenProps) {
  const [isReady, setIsReady] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [doneStep, setDoneStep] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [showReviewPrompt, setShowReviewPrompt] = useState(false);
  const [showFeedbackPrompt, setShowFeedbackPrompt] = useState(false);
  const reviewPromptCheckedRef = useRef(false);
  const usedFallbackRef = useRef(false);
  const isReadyRef = useRef(isReady);

  isReadyRef.current = isReady;

  useEffect(() => {
    let cancelled = false;

    async function fetchUv() {
      const isNative = Capacitor.isNativePlatform();

      if (!isNative) {
        generateMockSunData();
        usedFallbackRef.current = true;
        if (!cancelled) setIsReady(true);
        return;
      }

      try {
        await BaskWeather.getCurrentWeather();
        if (!cancelled) setIsReady(true);
      } catch {
        generateMockSunData();
        usedFallbackRef.current = true;
        if (!cancelled) setIsReady(true);
      }
    }

    fetchUv();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!showResults || reviewPromptCheckedRef.current) return;
    reviewPromptCheckedRef.current = true;

    let cancelled = false;

    async function maybeShowReviewPrompt() {
      const shouldSuppress = await shouldSuppressReviewPrompts();
      if (cancelled || shouldSuppress) return;

      await markReviewPromptShown();
      if (cancelled) return;

      capture(ANALYTICS_EVENTS.reviewPromptShown, {
        app_open_count: 0,
        value_event_count: 0,
      });
      setShowReviewPrompt(true);
    }

    maybeShowReviewPrompt().catch((error) => {
      console.warn('Failed to show onboarding review prompt:', error);
    });

    return () => {
      cancelled = true;
    };
  }, [showResults]);

  const fitzpatrickType = useMemo(
    () => resolveFitzpatrickFromAnswers(answers),
    [answers],
  );

  useEffect(() => {
    let cancelled = false;

    async function runSequence() {
      for (let i = 0; i < PROCESSING_ROWS.length; i++) {
        if (cancelled) return;

        const row = PROCESSING_ROWS[i];
        setCurrentStep(i + 1);
        const start = Date.now();

        while (!cancelled) {
          const elapsed = Date.now() - start;
          if (elapsed >= row.processingMs && row.isDone({ isReady: isReadyRef.current })) {
            setDoneStep(i + 1);
            break;
          }
          await sleep(POLL_INTERVAL_MS);
        }
      }

      if (cancelled) return;
      await sleep(RESULTS_DELAY_MS);
      if (!cancelled) setShowResults(true);
    }

    runSequence();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleContinue = async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      // Web fallback
    }
    onComplete();
  };

  const handlePositiveReviewFeedback = async () => {
    capture(ANALYTICS_EVENTS.reviewPositiveResponse, {
      app_open_count: 0,
      value_event_count: 0,
    });
    setShowReviewPrompt(false);
    await requestAppReview();
    await markNativeReviewRequested();
    capture(ANALYTICS_EVENTS.reviewNativePromptRequested, {
      source: 'onboarding',
    });
  };

  const handleNegativeReviewFeedback = async () => {
    capture(ANALYTICS_EVENTS.reviewNegativeResponse, {
      app_open_count: 0,
      value_event_count: 0,
    });
    await markNegativeReviewFeedback();
    setShowReviewPrompt(false);
    setShowFeedbackPrompt(true);
  };

  const handleOpenFeedbackForm = async () => {
    setShowFeedbackPrompt(false);
    capture(ANALYTICS_EVENTS.reviewFeedbackOpened, {
      source: 'onboarding',
    });
    try {
      if (Capacitor.isNativePlatform()) {
        await Browser.open({ url: REVIEW_FEEDBACK_FORM_URL });
      } else {
        window.open(REVIEW_FEEDBACK_FORM_URL, '_blank');
      }
    } catch {
      window.open(REVIEW_FEEDBACK_FORM_URL, '_blank');
    }
  };

  const allDone = showResults;

  return (
    <WarmBody
      footer={
        <WarmCTA onClick={handleContinue} disabled={!allDone}>
          {allDone ? 'See my plan' : 'One sec…'}
        </WarmCTA>
      }
    >
      {showResults && <Confetti />}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Mascot size={92} mood={allDone ? 'excited' : 'happy'} floating />
        <div style={{ marginTop: 14, textAlign: 'center' }}>
          <WarmHeadline size={25}>
            {allDone ? 'All set! Your plan is ready' : 'Building your sun-safety plan…'}
          </WarmHeadline>
        </div>

        <div
          style={{
            marginTop: 22,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {PROCESSING_ROWS.map((row, index) => {
            const isRevealed = currentStep > index;
            const isDone = doneStep > index;
            const label = isDone
              ? row.getDoneLabel({ fitzpatrickType, usedFallback: usedFallbackRef.current })
              : row.pendingLabel;

            return (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 13,
                  padding: '14px 16px',
                  borderRadius: 18,
                  background: WARM.card,
                  boxShadow: '0 4px 16px rgba(40,30,10,0.06)',
                  opacity: isRevealed ? 1 : 0.45,
                  transition: 'opacity .4s',
                }}
              >
                <span
                  className={isDone ? 'check-animation' : undefined}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    flexShrink: 0,
                    background: isDone ? WARM.good : 'transparent',
                    border: isDone ? 'none' : `2px solid ${WARM.ink}22`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isDone && <CheckIcon color="#fff" size={15} />}
                </span>
                <span style={{ flex: 1, fontWeight: 800, fontSize: 15, color: WARM.ink }}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <ReviewPromptModal
        isOpen={showReviewPrompt}
        onPositive={() => void handlePositiveReviewFeedback()}
        onNegative={() => void handleNegativeReviewFeedback()}
      />

      <IonAlert
        isOpen={showFeedbackPrompt}
        header='Want to tell us what happened?'
        message='You can send feedback, or keep going with your plan.'
        buttons={[
          {
            text: 'No thanks',
            role: 'cancel',
          },
          {
            text: 'Send feedback',
            handler: () => {
              void handleOpenFeedbackForm();
            },
          },
        ]}
        onDidDismiss={() => setShowFeedbackPrompt(false)}
      />
    </WarmBody>
  );
}
