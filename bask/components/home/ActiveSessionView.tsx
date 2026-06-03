'use client';

import { useState, useEffect, useRef } from 'react';
import { Haptics, NotificationType } from '@capacitor/haptics';
import AtmosphericBackground from './AtmosphericBackground';
import WhyZeroIUTooltip from './WhyZeroIUTooltip';
import Mascot from '../ui/Mascot';
import LockedSunburnValue from './LockedSunburnValue';
import { effectiveUv, formatEstimatedIU } from '../../lib/dEngine';
import type { SunData } from '../../lib/sunDataUtils';

interface ActiveSessionViewProps {
  formattedTime: string;
  currentIU: number;
  sunburnCountdown: string;
  remainingSunburnSeconds: number;
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  onEnd: () => void;
  onCancel: () => void;
  uvIndex: number;
  cloudCover?: number;
  exposurePercent: number;
  canAccessSunburnRisk?: boolean;
  onUnlockSunburnRisk?: () => void;
  dailyGoalIU: number;
  baselineTodayIU: number;
}

/**
 * Active session view showing real-time timer and vitamin D tracking
 */
export default function ActiveSessionView({
  formattedTime,
  currentIU,
  sunburnCountdown,
  remainingSunburnSeconds,
  isPaused,
  onPause,
  onResume,
  onEnd,
  onCancel,
  uvIndex,
  cloudCover,
  exposurePercent,
  canAccessSunburnRisk = true,
  onUnlockSunburnRisk,
  dailyGoalIU,
  baselineTodayIU,
}: ActiveSessionViewProps) {
  const [isWhyZeroTooltipOpen, setIsWhyZeroTooltipOpen] = useState(false);
  const [showZeroIUHint, setShowZeroIUHint] = useState(false);
  const isCloudBlockingVitaminD =
    uvIndex >= 3 && effectiveUv(uvIndex, cloudCover) < 3;

  // Daily goal: projected total = already-banked today + this session
  const projectedTodayIU = baselineTodayIU + currentIU;
  const goalReached = dailyGoalIU > 0 && projectedTodayIU >= dailyGoalIU;

  // Fire a success haptic the first time the goal is crossed *during* the session.
  // If the user was already at/over goal when the session started, don't celebrate on mount.
  const goalHapticFiredRef = useRef(false);
  const startedAtOrOverGoalRef = useRef(
    dailyGoalIU > 0 && baselineTodayIU >= dailyGoalIU,
  );
  useEffect(() => {
    if (
      goalReached &&
      !goalHapticFiredRef.current &&
      !startedAtOrOverGoalRef.current
    ) {
      goalHapticFiredRef.current = true;
      Haptics.notification({ type: NotificationType.Success }).catch(() => {});
    }
  }, [goalReached]);

  // Track accumulated time at zero IU across pause/resume cycles
  const accumulatedZeroTimeRef = useRef(0);
  const zeroIUPeriodStartRef = useRef<number | null>(null);

  // Show tooltip trigger after 60s if IU is still at 0
  useEffect(() => {
    if (currentIU === 0 && !isPaused) {
      // Calculate remaining time needed
      const remainingTime = 60000 - accumulatedZeroTimeRef.current;

      if (remainingTime <= 0) {
        // Already waited long enough
        setShowZeroIUHint(true);
        return;
      }

      // Record when this zero-IU period started
      zeroIUPeriodStartRef.current = Date.now();

      const timeout = setTimeout(() => {
        setShowZeroIUHint(true);
      }, remainingTime);

      return () => {
        clearTimeout(timeout);
        // On pause: accumulate the elapsed time from this period
        if (zeroIUPeriodStartRef.current !== null) {
          const elapsed = Date.now() - zeroIUPeriodStartRef.current;
          accumulatedZeroTimeRef.current += elapsed;
          zeroIUPeriodStartRef.current = null;
        }
      };
    } else if (currentIU > 0) {
      // Reset accumulated time when IU goes above 0
      accumulatedZeroTimeRef.current = 0;
      zeroIUPeriodStartRef.current = null;
      setShowZeroIUHint(false);
    }
  }, [currentIU, isPaused]);
  return (
    <AtmosphericBackground>
      <div className='min-h-screen pb-24 pt-safe overflow-x-hidden overflow-hidden overscroll-contain'>
        {/* LIVE SESSION pill */}
        <div className='flex justify-center px-6 pt-6 pb-2'>
          <div className='bg-white/78 backdrop-blur-xl rounded-full px-4 py-2 shadow-sm flex items-center gap-2'>
            <div
              className={`w-2 h-2 rounded-full bg-coral-accent ${
                isPaused ? '' : 'animate-pulse'
              }`}
            />
            <span className='text-[11px] font-extrabold uppercase tracking-[0.12em] text-text-primary'>
              {isPaused ? 'Paused' : 'Live Session'}
            </span>
          </div>
        </div>

        {/* Mascot + IU Hero */}
        <div className='flex flex-col items-center py-8'>
          {/* Mascot with pulsing halo */}
          <div className='relative mb-6'>
            <div
              className='absolute inset-0 mascot-halo-pulse rounded-full'
              style={{
                width: 280,
                height: 280,
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                background:
                  'radial-gradient(circle, rgba(255,201,60,0.3) 0%, transparent 70%)',
              }}
            />
            <Mascot
              size={200}
              mood={isPaused ? 'sleepy' : 'excited'}
              floating={false}
            />
          </div>

          {/* Hero IU counter */}
          <div
            className='text-[88px] font-black text-text-primary tracking-[-0.04em] tabular-nums leading-none'
            aria-live='polite'
            aria-atomic='true'>
            +{currentIU}
          </div>
          <div className='text-[11px] font-extrabold uppercase tracking-[0.12em] text-text-secondary mt-2'>
            IU Gained This Session
          </div>

          {/* Timer */}
          <div
            className='text-2xl font-black text-text-primary tabular-nums mt-4'
            aria-live='polite'
            aria-atomic='true'>
            {formattedTime}
          </div>

          {/* Daily goal reached celebration */}
          {goalReached && (
            <div
              className='mt-5 flex flex-col items-center gap-1 rounded-full bg-gradient-to-r from-solar-flare to-solar-warm px-5 py-2.5 text-center shadow-[0_8px_24px_rgba(244,165,54,0.33)] animate-fade-in motion-safe:flame-pulse'
              role='status'
              aria-live='polite'>
              <span className='text-sm font-black tracking-[0.01em] text-[#2A2419]'>
                🎉 Daily goal reached
              </span>
              <span className='text-[11px] font-bold uppercase tracking-[0.1em] text-[#2A2419]/70'>
                {formatEstimatedIU(projectedTodayIU)} IU banked today
              </span>
            </div>
          )}
        </div>

        {/* Session Stats */}
        <div className='px-6'>
          {isCloudBlockingVitaminD && (
            <div
              className='mb-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 shadow-[0_8px_24px_rgba(120,82,20,0.08)]'
              role='status'
              aria-live='polite'>
              <div className='flex items-start gap-3'>
                <div className='mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-700'>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    fill='none'
                    viewBox='0 0 24 24'
                    strokeWidth={2}
                    stroke='currentColor'
                    className='h-4 w-4'
                    aria-hidden='true'>
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      d='M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z'
                    />
                  </svg>
                </div>
                <div>
                  <p className='text-sm font-extrabold text-text-primary'>
                    Clouds are blocking vitamin D right now
                  </p>
                  <p className='mt-0.5 text-xs font-medium leading-snug text-text-secondary'>
                    Your timer can keep running, but IU will stay at 0 until
                    effective UV rises.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Stat row */}
          <div className='grid grid-cols-2 gap-3'>
            <div className='bg-white rounded-card px-4 py-2.5 shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_6px_24px_rgba(40,30,10,0.06)] border-l-4 border-[#FFC93C]'>
              <span className='text-[11px] font-extrabold text-text-secondary uppercase tracking-[0.12em]'>
                UV Now
              </span>
              <div className='text-[24px] font-black text-text-primary tabular-nums tracking-[-0.02em] mt-1'>
                {uvIndex.toFixed(1)}
              </div>
              {isCloudBlockingVitaminD && (
                <div className='text-[10px] font-semibold text-amber-600 leading-tight mt-0.5'>
                  Vitamin D blocked by clouds
                </div>
              )}
            </div>
            <div className='bg-white rounded-card px-4 py-2.5 shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_6px_24px_rgba(40,30,10,0.06)] border-l-4 border-[#F8A3A1]'>
              <span className='text-[11px] font-extrabold text-text-secondary uppercase tracking-[0.12em]'>
                Sunburn Risk In
              </span>
              {canAccessSunburnRisk ? (
                <div
                  className={`text-[24px] font-black tabular-nums tracking-[-0.02em] mt-1 ${
                    remainingSunburnSeconds <= 120
                      ? 'text-ember-alert'
                      : 'text-text-primary'
                  }`}>
                  {sunburnCountdown}
                </div>
              ) : (
                <LockedSunburnValue
                  label='Unlock burn timing'
                  onUnlock={onUnlockSunburnRisk}
                  className='mt-1'
                />
              )}
            </div>
          </div>

          {/* Why Zero IU Info Button - Shows after 60s at 0 IU */}
          {showZeroIUHint && (
            <button
              onClick={() => setIsWhyZeroTooltipOpen(true)}
              className='mt-3 w-full backdrop-blur-xl bg-amber-500/10 rounded-xl p-3 border border-amber-500/20 hover:bg-amber-500/15 active:scale-[0.98] transition-all flex items-center gap-3 group animate-fade-in'>
              <div className='w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-500/30 transition-colors'>
                <svg
                  className='w-4 h-4 text-amber-600'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                  />
                </svg>
              </div>
              <div className='flex-1 text-left'>
                <p className='text-sm font-semibold text-text-primary'>
                  Why is my IU staying at 0?
                </p>
                <p className='text-xs text-text-secondary'>
                  Tap to learn about sun angle, clothing, and conditions
                </p>
              </div>
              <svg
                className='w-5 h-5 text-text-secondary group-hover:text-text-primary transition-colors'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M9 5l7 7-7 7'
                />
              </svg>
            </button>
          )}
        </div>

        {/* Control Buttons */}
        <div className='px-6 mt-8 flex flex-col items-center gap-3'>
          {isPaused ? (
            <div className='flex gap-3 w-full'>
              <button
                onClick={onResume}
                className='flex-1 py-4 bg-gradient-to-r from-[#FFC93C] to-[#F4A536] rounded-full text-lg font-black text-[#2A2419] shadow-[0_12px_30px_rgba(244,165,54,0.33)] active:scale-[0.98] transition-transform'>
                Resume
              </button>
              <button
                onClick={onEnd}
                className='flex-1 py-4 bg-white rounded-full text-lg font-black text-[#2A2419] shadow-[0_4px_14px_rgba(40,30,10,0.07)] active:scale-[0.98] transition-transform flex items-center justify-center gap-2'>
                <span className='w-3 h-3 rounded-sm bg-ember-alert' />
                Stop
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={onEnd}
                className='w-full py-4 bg-white rounded-full text-lg font-black text-[#2A2419] shadow-[0_4px_14px_rgba(40,30,10,0.07)] active:scale-[0.98] transition-transform flex items-center justify-center gap-2'>
                <span className='w-3 h-3 rounded-sm bg-ember-alert' />
                Stop Session
              </button>
              <button
                onClick={onPause}
                className='py-2 text-sm font-semibold text-text-secondary active:opacity-60 transition-opacity'>
                Pause
              </button>
            </>
          )}
          <p className='text-sm text-text-secondary mt-1 text-center'>
            Pocket your phone — I&apos;ll keep counting for you
          </p>
        </div>
      </div>

      {/* Why Zero IU Educational Tooltip */}
      <WhyZeroIUTooltip
        isOpen={isWhyZeroTooltipOpen}
        onClose={() => setIsWhyZeroTooltipOpen(false)}
        uvIndex={uvIndex}
        cloudCover={cloudCover}
        exposurePercent={exposurePercent}
      />
    </AtmosphericBackground>
  );
}
