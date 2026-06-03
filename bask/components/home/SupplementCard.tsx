'use client';

import { useState, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { App } from '@capacitor/app';
import { supplementsRepository, cofactorsRepository } from '../../lib/database';
import { BaskHealth } from '../../lib/plugins/baskHealth';
import { capture, ANALYTICS_EVENTS } from '../../lib/analytics';
import { recordReviewValueEvent } from '../../lib/services/inAppReviewService';
import { DEFAULT_DAILY_GOAL_IU } from '../../lib/constants';
import GlassCardWrapper from './GlassCardWrapper';
import { BloodTestCalibration } from '../../lib/bloodTestUtils';

interface SupplementCardProps {
  onSupplementLogged?: () => void;
  todaySunIU?: number;
  uvIndex?: number;
  /**
   * Whether the D-Window forecast says synthesis is possible right now.
   * Source of truth so this card stays consistent with the forecast card.
   */
  synthesisActiveNow?: boolean;
  vitaminDGoal?: number;
  bloodTestCalibration?: BloodTestCalibration | null;
}

const PRESET_DOSAGES = [1000, 2000, 5000]; // IU

/**
 * Card for quick-logging supplement intake
 * Shows checkmark animation on completion
 * Integrates with database for persistent storage
 * Features preset dosage buttons (1000, 2000, 5000 IU)
 * MOAT FEATURE: Weather-adjusted supplement recommendations
 */
export default function SupplementCard({
  onSupplementLogged,
  todaySunIU = 0,
  uvIndex,
  synthesisActiveNow,
  vitaminDGoal = DEFAULT_DAILY_GOAL_IU,
  bloodTestCalibration = null,
}: SupplementCardProps) {
  const [todayTotalIU, setTodayTotalIU] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [daysSinceMagnesium, setDaysSinceMagnesium] = useState<number>(0);
  const [showFatPrompt, setShowFatPrompt] = useState(false);
  const [fatPromptResponse, setFatPromptResponse] = useState<
    'yes' | 'no' | null
  >(null);
  const lastLoadDateRef = useRef<string>(new Date().toDateString());

  // Calculate weather-adjusted recommendation
  const totalToday = todaySunIU + todayTotalIU;
  const remaining = Math.max(0, vitaminDGoal - totalToday);

  // Determine recommendation based on sun exposure and UV conditions
  const getRecommendation = (): {
    message: string;
    type: 'success' | 'warning' | 'info';
  } | null => {
    // Don't show recommendation if UV data hasn't loaded yet
    if (uvIndex === undefined) {
      return null;
    }

    if (totalToday >= vitaminDGoal) {
      return {
        message: `You've reached your daily target (${totalToday.toLocaleString()} IU).`,
        type: 'success',
      };
    }

    // Defer to the D-Window forecast for whether synthesis is possible right now.
    // Only flag "too weak" when the forecast agrees (or hasn't loaded yet).
    if (uvIndex < 3 && synthesisActiveNow !== true) {
      if (
        bloodTestCalibration?.status === 'deficient' ||
        bloodTestCalibration?.status === 'insufficient'
      ) {
        return {
          message: `Sun is too weak for vitamin D right now (UV ${uvIndex.toFixed(
            1,
          )}). With your recent lab at ${bloodTestCalibration.ngMl} ng/mL, you might consider logging a supplement.`,
          type: 'warning',
        };
      }
      return {
        message: `Sun is too weak for vitamin D right now (UV ${uvIndex.toFixed(
          1,
        )}). Log any supplement you take.`,
        type: 'info',
      };
    }

    if (todaySunIU > 0 && remaining < 2000) {
      return {
        message: `You've almost reached your goal from sun exposure! ${remaining.toLocaleString()} IU more would complete it.`,
        type: 'success',
      };
    }

    if (todaySunIU === 0 && uvIndex >= 3) {
      if (bloodTestCalibration?.status === 'optimal') {
        return {
          message: `UV is ${uvIndex.toFixed(
            1,
          )} outside! Your recent lab looks strong — sun exposure may be enough today.`,
          type: 'success',
        };
      }
      return {
        message: `UV is ${uvIndex.toFixed(
          1,
        )} outside! If you supplement today, log it here.`,
        type: 'warning',
      };
    }

    return {
      message: `You have ${remaining.toLocaleString()} IU remaining toward your target. Log any supplement you take.`,
      type: 'info',
    };
  };

  const recommendation = getRecommendation();

  // Intelligent cofactor tip: Show if high D intake but no magnesium in 3+ days
  const shouldShowCofactorWarning =
    totalToday >= 5000 && daysSinceMagnesium >= 3;

  // Load today's supplement total and cofactor status
  useEffect(() => {
    loadTodayTotal();
    loadCofactorStatus();

    // Listen for app resume to detect day changes
    const listener = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        const today = new Date().toDateString();
        if (today !== lastLoadDateRef.current) {
          lastLoadDateRef.current = today;
          loadTodayTotal();
          loadCofactorStatus();
        }
      }
    });

    // Also check on visibility change (for web/PWA)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const today = new Date().toDateString();
        if (today !== lastLoadDateRef.current) {
          lastLoadDateRef.current = today;
          loadTodayTotal();
          loadCofactorStatus();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      listener.then((l) => l.remove());
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const loadCofactorStatus = async () => {
    try {
      const days = await cofactorsRepository.getDaysSinceLastLogged(
        'magnesium',
      );
      setDaysSinceMagnesium(days);
    } catch (error) {
      console.error('Failed to load cofactor status:', error);
    }
  };

  const loadTodayTotal = async () => {
    try {
      const total = await supplementsRepository.getTodayTotalIU();
      setTodayTotalIU(total);
    } catch (error) {
      console.error('Failed to load today total:', error);
    }
  };

  const handleLog = async (dosage: number) => {
    if (isLoading) return;

    setIsLoading(true);

    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      // Haptics not available
    }

    try {
      // Log the supplement to database
      await supplementsRepository.create(dosage);
      try {
        await recordReviewValueEvent();
      } catch {
        // Review eligibility should never block supplement logging.
      }

      capture(ANALYTICS_EVENTS.supplementLogged, {
        dosage_iu: dosage,
        total_iu_today: todayTotalIU + dosage,
      });

      // Write to HealthKit when user enabled Apple Health sync (iOS only)
      if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
        try {
          const { isHealthKitSyncEnabled } = await import('../../lib/healthKitSettings');
          if (await isHealthKitSyncEnabled()) {
            await BaskHealth.writeDietaryVitaminD({ dosageIU: dosage });
          }
        } catch (healthKitError) {
          // Don't block supplement logging if HealthKit write fails
          console.warn('Failed to write to HealthKit:', healthKitError);
        }
      }

      // Trigger animation
      setIsAnimating(true);

      // Update state
      setTodayTotalIU((prev) => prev + dosage);

      // Show fat prompt instead of immediately hiding presets
      setShowFatPrompt(true);
      setFatPromptResponse(null);

      // Notify parent component
      if (onSupplementLogged) {
        onSupplementLogged();
      }

      // Reset animation after it completes
      setTimeout(() => setIsAnimating(false), 300);
    } catch (error) {
      console.error('Failed to log supplement:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const hasLoggedToday = todayTotalIU > 0;

  return (
    <div className='w-full'>
      <GlassCardWrapper>
        {/* Header with status */}
        <div className='mb-4'>
          <h3 className='text-[11px] font-extrabold uppercase tracking-[0.12em] text-text-secondary mb-2'>
            Vitamin D Supplement
          </h3>
          <div className='flex items-center justify-between'>
            <div className='flex-1'>
              <p className='text-sm font-medium text-text-primary'>
                {hasLoggedToday
                  ? `Logged ${todayTotalIU} IU today!`
                  : 'Select Your Dosage'}
              </p>
              {hasLoggedToday && (
                <p className='text-xs text-text-secondary mt-0.5'>
                  Add another dose if needed
                </p>
              )}
            </div>

            {/* Expand/Collapse indicator */}
            <button
              onClick={() => setShowPresets(!showPresets)}
              className='p-2 rounded-full hover:bg-black/5 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center'
              aria-label={
                showPresets
                  ? 'Collapse dosage options'
                  : 'Expand dosage options'
              }
              aria-expanded={showPresets}
              disabled={isLoading}>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                fill='none'
                viewBox='0 0 24 24'
                strokeWidth={2}
                stroke='currentColor'
                className={`w-5 h-5 text-text-primary transition-transform ${
                  showPresets ? 'rotate-180' : ''
                }`}
                aria-hidden='true'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M19.5 8.25l-7.5 7.5-7.5-7.5'
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Preset dosage buttons */}
        {showPresets && (
          <div className='grid grid-cols-3 gap-2 pt-2 border-t border-black/5'>
            {PRESET_DOSAGES.map((dosage) => (
              <button
                key={dosage}
                onClick={() => handleLog(dosage)}
                disabled={isLoading}
                className={`py-3 px-4 rounded-xl font-medium text-sm transition-all ${
                  isLoading
                    ? 'bg-black/5 text-text-muted cursor-not-allowed'
                    : 'bg-black/5 text-text-primary hover:bg-black/10 active:scale-[0.98]'
                } ${isAnimating ? 'scale-95' : ''}`}>
                {dosage.toLocaleString()} IU
              </button>
            ))}
          </div>
        )}

        {/* Fat Solubility Prompt (Interactive Coaching) */}
        {showFatPrompt && !fatPromptResponse && (
          <div className='mt-3 p-3 rounded-xl bg-solar-flare/15 border border-solar-warm/30'>
            <p className='text-sm text-text-primary font-medium mb-3'>
              Did you take this with a meal containing fat?
            </p>
            <div className='grid grid-cols-2 gap-2'>
              <button
                onClick={() => {
                  setFatPromptResponse('yes');
                  setTimeout(() => {
                    setShowFatPrompt(false);
                    setShowPresets(false);
                  }, 3000);
                }}
                className='py-2 px-4 rounded-lg bg-grove-green/30 border border-grove-green/50 text-grove-green-dark text-sm font-medium hover:bg-grove-green/40 active:scale-[0.98] transition-all'>
                Yes
              </button>
              <button
                onClick={() => {
                  setFatPromptResponse('no');
                  setTimeout(() => {
                    setShowFatPrompt(false);
                    setShowPresets(false);
                  }, 3000);
                }}
                className='py-2 px-4 rounded-lg bg-black/5 border border-black/10 text-text-secondary text-sm font-medium hover:bg-black/10 active:scale-[0.98] transition-all'>
                No
              </button>
            </div>
          </div>
        )}

        {/* Fat Response Messages */}
        {showFatPrompt && fatPromptResponse === 'yes' && (
          <div className='mt-3 p-3 rounded-xl bg-grove-green/20 border border-grove-green/30'>
            <p className='text-xs text-grove-green-dark'>
              ✓ Great! Some research suggests fat may support vitamin D
              absorption.
            </p>
          </div>
        )}
        {showFatPrompt && fatPromptResponse === 'no' && (
          <div className='mt-3 p-3 rounded-xl bg-solar-flare/15 border border-solar-warm/30'>
            <p className='text-xs text-[#8A5A00] font-medium'>
              💡 Taking vitamin D with food that contains fat may aid
              absorption.
            </p>
            <p className='text-xs text-[#8A5A00]/90 mt-1'>
              Next time, you might consider pairing it with nuts, eggs, avocado,
              or a meal with fat.
            </p>
          </div>
        )}

        {/* Weather-Adjusted Recommendation (MOAT FEATURE) */}
        {showPresets && !showFatPrompt && recommendation && (
          <div
            className={`mt-3 p-3 rounded-xl ${
              recommendation.type === 'success'
                ? 'bg-grove-green/20 border border-grove-green/30'
                : recommendation.type === 'warning'
                ? 'bg-amber-500/20 border border-amber-500/30'
                : 'bg-bask-teal/15 border border-bask-teal/25'
            }`}>
            <div className='flex gap-2 items-start'>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                fill='none'
                viewBox='0 0 24 24'
                strokeWidth={2}
                stroke='currentColor'
                className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                  recommendation.type === 'success'
                    ? 'text-grove-green-dark'
                    : recommendation.type === 'warning'
                    ? 'text-amber-600'
                    : 'text-bask-teal'
                }`}>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18'
                />
              </svg>
              <p className='text-xs text-text-primary leading-relaxed'>
                {recommendation.message}
              </p>
            </div>
          </div>
        )}

        {/* Intelligent Cofactor Warning (MOAT FEATURE) */}
        {showPresets && shouldShowCofactorWarning && (
          <div className='mt-3 p-3 rounded-xl bg-bask-teal/15 border border-bask-teal/25'>
            <div className='flex gap-2 items-start'>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                fill='none'
                viewBox='0 0 24 24'
                strokeWidth={2}
                stroke='currentColor'
                className='w-4 h-4 mt-0.5 flex-shrink-0 text-bask-teal'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z'
                />
              </svg>
              <div className='flex-1'>
                <p className='text-xs text-text-primary leading-relaxed font-medium'>
                  High vitamin D intake ({totalToday.toLocaleString()} IU) may
                  work best with cofactors.
                </p>
                <p className='text-xs text-text-secondary leading-relaxed mt-1'>
                  Some research suggests these cofactors may support vitamin D
                  utilization: <strong>Magnesium</strong> and{' '}
                  <strong>Vitamin K2</strong>.
                </p>
              </div>
            </div>
          </div>
        )}
      </GlassCardWrapper>
    </div>
  );
}
