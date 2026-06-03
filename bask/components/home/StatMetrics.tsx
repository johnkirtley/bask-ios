'use client';

import { useState } from 'react';
import GlassCardWrapper from './GlassCardWrapper';
import LockedSunburnValue from './LockedSunburnValue';

interface StatMetricsProps {
  timeToGoal: string;
  timeToGoalSubtext?: string;
  timeToGoalLabHint?: string | null;
  isLoading?: boolean;
  burnRisk: string;
  burnRiskSubtext?: string;
  canAccessSunburnRisk?: boolean;
  onUnlockSunburnRisk?: () => void;
  dailyDecay: number;
  decaySubtext: string;
  decayInfoText: string;
  decayCovered?: boolean; // Whether daily decay has been covered
}

/**
 * Compact metrics card displaying Time to Goal, Burn Risk, and Daily Decay
 * in a modern 2+1 grid layout - matches 2026 iOS grouped-metrics pattern
 */
export default function StatMetrics({
  timeToGoal,
  timeToGoalSubtext,
  timeToGoalLabHint,
  isLoading,
  burnRisk,
  burnRiskSubtext,
  canAccessSunburnRisk = true,
  onUnlockSunburnRisk,
  dailyDecay,
  decaySubtext,
  decayInfoText,
  decayCovered = false,
}: StatMetricsProps) {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <GlassCardWrapper>
      <div className='space-y-3'>
        {/* Time to Goal */}
        <div>
          <div className='text-[11px] font-extrabold text-text-secondary uppercase tracking-[0.12em] mb-1'>
            Time to Goal
          </div>
          {isLoading ? (
            <div className='flex items-center gap-2'>
              <div className='w-3 h-3 rounded-full bg-solar-flare animate-pulse-solar motion-reduce:hidden' />
              <span className='hidden motion-reduce:inline text-sm text-text-muted'>
                Checking sun...
              </span>
            </div>
          ) : (
            <>
              <div className='text-[24px] font-black text-text-primary tabular-nums tracking-[-0.02em]'>
                {timeToGoal}
              </div>
              {timeToGoalSubtext && (
                <div className='text-[11px] text-text-muted mt-0.5'>
                  {timeToGoalSubtext}
                </div>
              )}
              {timeToGoalLabHint && (
                <div className='text-[10px] text-text-muted/80 leading-snug mt-1.5 pl-2 border-l-2 border-black/[0.06]'>
                  {timeToGoalLabHint}
                </div>
              )}
            </>
          )}
        </div>

        {/* Divider */}
        <div className='border-t border-black/[0.12]' />

        {/* Sunburn Risk */}
        <div>
          <div className='text-[11px] font-extrabold text-text-secondary uppercase tracking-[0.12em] mb-1'>
            Sunburn Risk
          </div>
          {canAccessSunburnRisk ? (
            <>
              <div className='text-[24px] font-black text-text-primary tabular-nums tracking-[-0.02em]'>
                {burnRisk}
              </div>
              {burnRiskSubtext && (
                <div className='text-[11px] text-text-muted mt-0.5'>
                  {burnRiskSubtext}
                </div>
              )}
            </>
          ) : (
            <div className='max-w-[190px]'>
              <LockedSunburnValue
                label='Unlock Sunburn Risk'
                onUnlock={onUnlockSunburnRisk}
              />
            </div>
          )}
        </div>

        {/* Divider */}
        <div className='border-t border-black/[0.12]' />

        {/* Daily Decay */}
        <div>
          <div className='flex items-center gap-2 mb-1'>
            <div className='text-[11px] font-extrabold text-text-secondary uppercase tracking-[0.12em]'>
              Daily Decay
            </div>
            <button
              onClick={() => setShowInfo(!showInfo)}
              className='flex-shrink-0 min-w-[44px] min-h-[44px] rounded-full bg-black/[0.04] hover:bg-black/[0.08] active:scale-[0.98] transition-all duration-200 flex items-center justify-center'
              aria-label='More information'
              aria-expanded={showInfo}>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                fill='none'
                viewBox='0 0 24 24'
                strokeWidth={2.5}
                stroke='currentColor'
                className='w-[18px] h-[18px] text-text-secondary'
                aria-hidden='true'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z'
                />
              </svg>
            </button>
          </div>
          <div className='flex items-center gap-2'>
            {decayCovered && (
              <svg
                xmlns='http://www.w3.org/2000/svg'
                viewBox='0 0 24 24'
                fill='currentColor'
                className='w-5 h-5 text-grove-green'
                aria-hidden='true'>
                <path
                  fillRule='evenodd'
                  d='M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z'
                  clipRule='evenodd'
                />
              </svg>
            )}
            <div className='text-[24px] font-black text-text-primary tabular-nums tracking-[-0.02em]'>
              {dailyDecay === 0 ? '~0 IU' : `-${dailyDecay} IU`}
            </div>
          </div>
          <div
            className={`text-[11px] mt-1 ${
              decayCovered
                ? 'text-grove-green-dark font-medium'
                : 'text-text-muted'
            }`}>
            {decaySubtext}
          </div>
          {showInfo && (
            <div className='text-[11px] text-text-secondary leading-relaxed pt-2 mt-2 border-t border-black/[0.12] animate-in fade-in slide-in-from-top-1 duration-200'>
              {decayInfoText}
            </div>
          )}
        </div>
      </div>
    </GlassCardWrapper>
  );
}
