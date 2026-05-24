'use client';

import { useState, useEffect, useRef } from 'react';
import AtmosphericBackground from './AtmosphericBackground';
import WhyZeroIUTooltip from './WhyZeroIUTooltip';
import type { SunData } from '../../lib/sunDataUtils';

interface ActiveSessionViewProps {
  formattedTime: string;
  currentIU: number;
  projectedTimeToBurn: number;
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  onEnd: () => void;
  onCancel: () => void;
  uvIndex: number;
  cloudCover?: number;
  exposurePercent: number;
}

/**
 * Active session view showing real-time timer and vitamin D tracking
 */
export default function ActiveSessionView({
  formattedTime,
  currentIU,
  projectedTimeToBurn,
  isPaused,
  onPause,
  onResume,
  onEnd,
  onCancel,
  uvIndex,
  cloudCover,
  exposurePercent,
}: ActiveSessionViewProps) {
  const [isWhyZeroTooltipOpen, setIsWhyZeroTooltipOpen] = useState(false);
  const [showZeroIUHint, setShowZeroIUHint] = useState(false);

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
      <div className='pb-24 pt-safe'>
        {/* Header */}
        <div className='px-6 py-6'>
          <h1 className='text-3xl font-semibold text-text-primary text-center'>
            {isPaused ? 'Paused' : 'Basking...'}
          </h1>
        </div>

        {/* Timer Ring */}
        <div className='flex flex-col items-center py-12'>
          <div className='relative' style={{ width: 300, height: 300 }}>
            {/* Ambient glow effect behind ring */}
            <div
              className='absolute inset-0 rounded-full'
              style={{
                background:
                  'radial-gradient(circle, rgba(255, 179, 71, 0.25) 0%, rgba(255, 179, 71, 0.12) 40%, transparent 70%)',
              }}
            />

            {/* Animated ring */}
            <svg
              width={300}
              height={300}
              className='transform -rotate-90 relative z-10'
              role='img'
              aria-label='Session timer progress'>
              {/* Background track */}
              <circle
                cx={150}
                cy={150}
                r={130}
                fill='none'
                stroke='rgba(255, 179, 71, 0.12)'
                strokeWidth={16}
              />

              {/* Animated progress ring */}
              <defs>
                <linearGradient
                  id='sessionGradient'
                  x1='0%'
                  y1='0%'
                  x2='100%'
                  y2='100%'>
                  <stop offset='0%' stopColor='#FFB347' />
                  <stop offset='50%' stopColor='#FF9F1C' />
                  <stop offset='100%' stopColor='#E86F1B' />
                </linearGradient>
                <filter
                  id='sessionGlowFilter'
                  x='-50%'
                  y='-50%'
                  width='200%'
                  height='200%'>
                  <feGaussianBlur stdDeviation='8' result='blur' />
                  <feColorMatrix
                    in='blur'
                    type='matrix'
                    values='1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1.5 0'
                    result='intensifiedBlur'
                  />
                  <feMerge>
                    <feMergeNode in='intensifiedBlur' />
                    <feMergeNode in='SourceGraphic' />
                  </feMerge>
                </filter>
              </defs>

              <circle
                cx={150}
                cy={150}
                r={130}
                fill='none'
                stroke='url(#sessionGradient)'
                strokeWidth={16}
                strokeLinecap='round'
                filter='url(#sessionGlowFilter)'
                className={`bask-ring-progress ${isPaused ? 'opacity-50' : ''}`}
              />
            </svg>

            {/* Center content */}
            <div className='absolute inset-0 flex flex-col items-center justify-center text-center'>
              <div
                className='text-6xl font-bold text-text-primary tracking-tight tabular-nums'
                aria-live='polite'
                aria-atomic='true'>
                {formattedTime}
              </div>
              <div
                className='text-lg font-semibold text-solar-warm mt-3'
                aria-live='polite'
                aria-atomic='true'>
                +{currentIU} IU
              </div>
              {isPaused && (
                <div className='text-xs text-text-muted mt-2'>
                  Session paused
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Session Stats */}
        <div className='px-6'>
          <div className='relative backdrop-blur-xl bg-white/70 rounded-2xl px-5 py-4 border border-black/[0.04] shadow-[0_2px_12px_rgba(0,0,0,0.04)]'>
            {/* Luminous gradient overlay */}
            <div className='absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-white/10 rounded-2xl pointer-events-none' />

            {/* Subtle inner glow for depth */}
            <div className='absolute inset-0 rounded-2xl pointer-events-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)]' />

            <div className='relative z-10 flex items-center justify-between gap-3'>
              {/* Session IU */}
              <div className='flex flex-col flex-shrink-0'>
                <span className='text-[11px] font-semibold text-text-secondary uppercase tracking-[0.08em] whitespace-nowrap'>
                  Session IU
                </span>
                <span className='text-2xl font-bold text-text-primary tabular-nums mt-1'>
                  +{currentIU}
                </span>
              </div>

              {/* Divider */}
              <div className='w-px h-12 bg-black/10 flex-shrink-0' />

              {/* Time Before Burn */}
              <div className='flex flex-col items-end min-w-0'>
                <span className='text-[9px] font-semibold text-text-secondary uppercase tracking-tight text-right leading-tight'>
                  Est. Time Before Sunburn
                </span>
                <span className='text-2xl font-bold text-ember-alert tabular-nums mt-1'>
                  {projectedTimeToBurn >= 60
                    ? `${Math.floor(projectedTimeToBurn / 60)}h ${
                        projectedTimeToBurn % 60
                      }m`
                    : `${projectedTimeToBurn}m`}
                </span>
              </div>
            </div>
          </div>

          {/* Why Zero IU Info Button - Shows after 60s at 0 IU */}
          {showZeroIUHint && (
            <button
              onClick={() => setIsWhyZeroTooltipOpen(true)}
              className='mt-3 w-full backdrop-blur-xl bg-amber-500/10 rounded-xl p-3 border border-amber-500/20 hover:bg-amber-500/15 active:scale-[0.99] transition-all flex items-center gap-3 group animate-fade-in'>
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
        <div className='px-6 mt-8 flex gap-4'>
          {isPaused ? (
            <button
              onClick={onResume}
              className='flex-1 py-4 bg-solar-flare hover:bg-solar-warm rounded-full text-lg font-bold text-[#4A2800] transition-colors active:scale-98'>
              Resume
            </button>
          ) : (
            <button
              onClick={onPause}
              className='flex-1 py-4 bg-black/10 hover:bg-black/15 rounded-full text-lg font-bold text-text-primary transition-colors active:scale-98'>
              Pause
            </button>
          )}
          <button
            onClick={onEnd}
            className='flex-1 py-4 bg-solar-flare hover:bg-solar-warm rounded-full text-lg font-bold text-[#4A2800] transition-colors active:scale-98'>
            End Session
          </button>
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
