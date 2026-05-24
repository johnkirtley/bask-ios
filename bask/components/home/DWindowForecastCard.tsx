'use client';

import { useEffect, useState } from 'react';
import {
  OptimalWindow,
  SynthesisWindow,
  DWindowForecast,
  Recommendation,
  getSynthesisSecondaryMessage,
  isInSynthesisWindow,
} from '../../lib/dWindowForecast';
import GlassCardWrapper from './GlassCardWrapper';
import ProBadge from '../ui/ProBadge';
import { useSubscription } from '../../hooks/useSubscription';

interface DWindowForecastCardProps {
  forecast: DWindowForecast;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  isPremium?: boolean;
}

/** Re-render every minute so synthesis countdown stays current. */
function useMinuteTick(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function RecommendationCard({ rec }: { rec: Recommendation }) {
  const { headline, details, items } = rec.content;
  const styles = {
    window: {
      bg: 'bg-amber-500/15',
      border: 'border-amber-500/25',
      icon: 'text-amber-600',
      iconBg: 'bg-amber-500/20',
      badge: 'WINDOW',
      badgeBg: 'bg-amber-500/30 text-amber-700',
      borderClass: '',
      special: false,
    },
    tip: {
      bg: 'bg-blue-500/15',
      border: 'border-blue-500/25',
      icon: 'text-blue-600',
      iconBg: 'bg-blue-500/20',
      badge: 'TIP',
      badgeBg: 'bg-blue-500/30 text-blue-700',
      borderClass: '',
      special: false,
    },
    action: {
      bg: 'bg-gradient-to-br from-cyan-500/20 to-teal-500/10',
      border: 'border-2 border-cyan-500/30',
      icon: 'text-cyan-600',
      iconBg: 'bg-cyan-500/30',
      badge: 'ACTION',
      badgeBg: 'bg-cyan-500/30 text-cyan-700',
      borderClass: 'shadow-[0_4px_20px_rgba(6,182,212,0.15)]',
      special: true,
    },
    alert: {
      bg: 'bg-red-500/10',
      border: 'border border-red-500/20',
      icon: 'text-red-600',
      iconBg: 'bg-red-500/20',
      badge: 'ALERT',
      badgeBg: 'bg-red-500/30 text-red-700',
      borderClass: 'border-l-4 border-l-red-500',
      special: false,
    },
  };

  const style = styles[rec.type];

  const getIcon = () => {
    switch (rec.type) {
      case 'window':
        return (
          <svg
            xmlns='http://www.w3.org/2000/svg'
            fill='none'
            viewBox='0 0 24 24'
            strokeWidth={2}
            stroke='currentColor'
            className={`w-4 h-4 ${style.icon} flex-shrink-0`}>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              d='M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z'
            />
          </svg>
        );
      case 'tip':
        return (
          <svg
            xmlns='http://www.w3.org/2000/svg'
            fill='none'
            viewBox='0 0 24 24'
            strokeWidth={2}
            stroke='currentColor'
            className={`w-4 h-4 ${style.icon} flex-shrink-0`}>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              d='M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5'
            />
          </svg>
        );
      case 'action':
        return (
          <svg
            xmlns='http://www.w3.org/2000/svg'
            fill='none'
            viewBox='0 0 24 24'
            strokeWidth={2}
            stroke='currentColor'
            className={`w-4 h-4 ${style.icon} flex-shrink-0`}>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              d='M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18'
            />
          </svg>
        );
      case 'alert':
        return (
          <svg
            xmlns='http://www.w3.org/2000/svg'
            fill='none'
            viewBox='0 0 24 24'
            strokeWidth={2}
            stroke='currentColor'
            className={`w-4 h-4 ${style.icon} flex-shrink-0`}>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              d='M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z'
            />
          </svg>
        );
    }
  };

  return (
    <div
      className={`${style.bg} ${style.border} ${style.borderClass} rounded-xl ${
        style.special ? 'p-4' : 'p-3'
      } flex flex-col gap-2`}>
      {/* Badge */}
      <span
        className={`text-xs font-bold uppercase tracking-wider ${style.badgeBg} px-2 py-0.5 rounded-full self-start`}>
        {style.badge}
      </span>

      {/* Content */}
      <div className='flex gap-2.5 items-start'>
        {/* Icon container */}
        <div
          className={`w-8 h-8 rounded-full ${style.iconBg} flex items-center justify-center flex-shrink-0`}>
          {getIcon()}
        </div>

        {/* Structured content */}
        <div className='flex-1 space-y-1.5'>
          {/* Headline - bold and scannable */}
          <p className='text-text-primary text-xs font-semibold leading-snug'>
            {headline}
          </p>

          {/* Bullet items if present */}
          {items && items.length > 0 && (
            <ul className='space-y-1'>
              {items.map((item, i) => (
                <li
                  key={i}
                  className='flex items-start gap-1.5 text-text-primary text-xs leading-relaxed'>
                  <span
                    className={`w-1 h-1 rounded-full ${style.iconBg} mt-1.5 flex-shrink-0`}
                  />
                  {item}
                </li>
              ))}
            </ul>
          )}

          {/* Details - muted secondary text */}
          {details && (
            <p className='text-text-secondary text-[11px] leading-relaxed'>
              {details}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DWindowForecastCard({
  forecast,
  onRefresh,
  isRefreshing = false,
  isPremium = false,
}: DWindowForecastCardProps) {
  const { presentPaywall } = useSubscription();
  const now = useMinuteTick();
  const getEfficiencyColor = (efficiency: string) => {
    switch (efficiency) {
      case 'excellent':
        return 'text-grove-green-dark';
      case 'good':
        return 'text-solar-flare';
      case 'moderate':
        return 'text-amber-500';
      case 'poor':
        return 'text-red-500';
      default:
        return 'text-text-secondary';
    }
  };

  const getEfficiencyLabel = (efficiency: string) => {
    switch (efficiency) {
      case 'excellent':
        return 'Excellent Conditions';
      case 'good':
        return 'Good Conditions';
      case 'moderate':
        return 'Moderate Conditions';
      case 'poor':
        return 'Poor Conditions';
      default:
        return 'Unknown';
    }
  };

  // Active dot reflects when D synthesis is possible (broader band)
  const isWindowActive = isInSynthesisWindow(forecast.todaySynthesis, now);

  return (
    <div className='w-full'>
      <GlassCardWrapper>
        {/* Header */}
        <div className='mb-4'>
          <div className='flex items-center justify-between mb-2'>
            <div className='flex items-center gap-1.5'>
              <h3 className='text-xs font-semibold uppercase tracking-[0.08em] text-text-secondary'>
                D-Window Forecast
              </h3>
            </div>
            <div className='flex items-center gap-2'>
              <span
                className={`text-xs font-medium ${getEfficiencyColor(
                  forecast.efficiency,
                )}`}>
                {getEfficiencyLabel(forecast.efficiency).replace(
                  ' Conditions',
                  '',
                )}
              </span>
              {/* {onRefresh && (
                <button
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  className={`text-text-secondary hover:text-text-primary active:scale-95 transition-all p-3 min-w-[44px] min-h-[44px] flex items-center justify-center ${
                    isRefreshing ? 'opacity-50 pointer-events-none' : ''
                  }`}
                  aria-label='Refresh forecast'>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    fill='none'
                    viewBox='0 0 24 24'
                    strokeWidth={2}
                    stroke='currentColor'
                    className={`w-4 h-4 ${
                      isRefreshing ? 'motion-safe:animate-spin' : ''
                    }`}
                    aria-hidden='true'>
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      d='M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99'
                    />
                  </svg>
                </button>
              )} */}
            </div>
          </div>
          {/* <p className="text-xs text-text-secondary">{isPremium ? 'Next 48 Hours' : 'Your D-Windows'}</p> */}
        </div>

        {/* Windows */}
        <div className='space-y-3'>
          {/* Today section - always show */}
          <div>
            <p className='text-xs font-medium text-text-secondary mb-1.5'>
              Today
            </p>
            {forecast.today ? (
              <WindowDisplay
                window={forecast.today}
                synthesis={forecast.todaySynthesis}
                isActive={isWindowActive}
                now={now}
              />
            ) : forecast.todaySynthesis ? (
              <SynthesisOnlyDisplay
                synthesis={forecast.todaySynthesis}
                noWindowReason={forecast.todayNoWindowReason}
                isActive={isWindowActive}
                now={now}
              />
            ) : (
              <div className='rounded-xl p-3 bg-black/[0.03] border border-black/5 text-center'>
                <p className='text-sm font-medium text-text-primary'>
                  No D-Window today
                </p>
                <p className='text-xs text-text-secondary mt-0.5'>
                  {forecast.todayNoWindowReason === 'clouds-blocking'
                    ? 'Cloud cover is blocking UV'
                    : forecast.todayNoWindowReason === 'low-exposure'
                    ? 'More skin exposure needed'
                    : forecast.todayNoWindowReason === 'uv-too-low'
                    ? 'UV levels too low'
                    : 'Check recommendations below'}
                </p>
              </div>
            )}
          </div>

          {/* Tomorrow section - always show */}
          <div>
            <p className='text-xs font-medium text-text-secondary mb-1.5'>
              Tomorrow
            </p>
            {forecast.tomorrow ? (
              isPremium ? (
                <WindowDisplay
                  window={forecast.tomorrow}
                  synthesis={forecast.tomorrowSynthesis}
                  now={now}
                />
              ) : (
                <button
                  type='button'
                  onClick={async () => {
                    await presentPaywall();
                  }}
                  className='relative w-full overflow-hidden rounded-xl isolate text-left active:scale-[0.98] transition-transform'
                  aria-label="Unlock tomorrow's D-Window with Pro">
                  <LockedTomorrowWindow />

                  <div className='absolute inset-0 z-10 bg-white/90 backdrop-blur-xl pointer-events-none' />

                  <div className='absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 pointer-events-none'>
                    <ProBadge />
                    <p className='text-sm font-semibold text-text-primary'>
                      Unlock tomorrow&apos;s D-Window
                    </p>
                  </div>
                </button>
              )
            ) : (
              <div className='rounded-xl p-3 bg-black/[0.03] border border-black/5 text-center'>
                <p className='text-sm font-medium text-text-primary'>
                  No D-Window predicted yet
                </p>
                <p className='text-xs text-text-secondary mt-0.5'>
                  {forecast.tomorrowNoWindowReason === 'clouds-blocking'
                    ? 'Cloud cover is blocking UV'
                    : forecast.tomorrowNoWindowReason === 'low-exposure'
                    ? 'More skin exposure needed'
                    : forecast.tomorrowNoWindowReason === 'uv-too-low'
                    ? 'UV levels too low'
                    : "We'll keep updating"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Recommendations */}
        {forecast.recommendations.length > 0 && (
          <div className='mt-4 pt-4 border-t border-black/5'>
            <p className='text-xs font-semibold uppercase tracking-wider text-text-muted mb-3'>
              Recommendations
            </p>
            <div className='space-y-2.5'>
              {forecast.recommendations
                .filter((rec) => {
                  // Filter out tomorrow-related recommendations for free users
                  if (
                    !isPremium &&
                    rec.content.headline?.toLowerCase().includes('tomorrow')
                  ) {
                    return false;
                  }
                  return true;
                })
                .sort((a, b) => a.priority - b.priority)
                .map((rec, index) => (
                  <RecommendationCard key={index} rec={rec} />
                ))}
            </div>
          </div>
        )}
      </GlassCardWrapper>
    </div>
  );
}

function LockedTomorrowWindow() {
  return (
    <div
      className='backdrop-blur-sm bg-white/50 rounded-xl p-3.5 border border-black/5 relative overflow-hidden'
      aria-hidden='true'>
      <div className='absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-amber-50/40 to-transparent pointer-events-none' />

      <div className='relative animate-pulse'>
        <div className='flex items-center justify-between mb-3'>
          <div className='h-4 w-16 rounded bg-black/10' />
          <div className='h-3 w-24 rounded bg-black/[0.06]' />
        </div>

        <div className='flex items-baseline gap-2.5 mb-3'>
          <div className='h-7 w-20 rounded bg-black/10' />
          <div className='h-5 w-3 rounded bg-black/[0.06]' />
          <div className='h-7 w-20 rounded bg-black/10' />
        </div>

        <div className='h-7 w-44 rounded-full bg-black/[0.06] mb-3' />

        <div className='flex items-center gap-2.5 pt-2.5 border-t border-black/5'>
          <div className='h-3 w-16 rounded bg-black/[0.06]' />
          <div className='h-3 w-12 rounded bg-black/[0.06]' />
          <div className='h-3 w-10 rounded bg-black/[0.06]' />
        </div>
      </div>
    </div>
  );
}

function SynthesisRow({ message }: { message: string }) {
  return (
    <div className='flex items-center gap-1.5 mb-3 text-xs text-text-secondary'>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        fill='none'
        viewBox='0 0 24 24'
        strokeWidth={2}
        stroke='currentColor'
        className='w-3.5 h-3.5 text-[#C47600] flex-shrink-0'
        aria-hidden='true'>
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          d='M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z'
        />
      </svg>
      <span>{message}</span>
    </div>
  );
}

function SynthesisOnlyDisplay({
  synthesis,
  noWindowReason,
  isActive,
  now,
}: {
  synthesis: SynthesisWindow;
  noWindowReason?: DWindowForecast['todayNoWindowReason'];
  isActive?: boolean;
  now: Date;
}) {
  const message =
    getSynthesisSecondaryMessage(synthesis, null, now) ??
    `D synthesis possible ${synthesis.startTime} – ${synthesis.endTime}`;

  return (
    <div className='rounded-xl p-3 bg-black/[0.03] border border-black/5'>
      <div className='flex items-center gap-1.5 mb-2'>
        <span className='text-sm font-medium text-text-primary'>Today</span>
        {isActive && (
          <span
            className='w-2 h-2 rounded-full bg-green-400 animate-pulse-dwindow'
            title='D synthesis is currently possible'
          />
        )}
      </div>
      <SynthesisRow message={message} />
      <p className='text-xs text-text-secondary'>
        {noWindowReason === 'low-exposure'
          ? 'UV is sufficient · More skin exposure needed for meaningful IU'
          : 'No optimal session window today'}
      </p>
    </div>
  );
}

function WindowDisplay({
  window,
  synthesis,
  isActive,
  now,
}: {
  window: OptimalWindow;
  synthesis?: SynthesisWindow | null;
  isActive?: boolean;
  now: Date;
}) {
  const synthesisMessage = synthesis
    ? getSynthesisSecondaryMessage(synthesis, window, now)
    : null;

  return (
    <div className='backdrop-blur-sm bg-white/50 rounded-xl p-3.5 border border-black/5 relative overflow-hidden'>
      {/* Subtle gradient accent */}
      <div className='absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-amber-50/40 to-transparent pointer-events-none' />

      <div className='relative'>
        {/* Header */}
        <div className='flex items-center justify-between mb-3'>
          <div className='flex items-center gap-1.5'>
            <span className='text-text-primary font-medium text-sm whitespace-nowrap'>
              {window.dayLabel}
            </span>
            {isActive && (
              <span
                className='w-2 h-2 rounded-full bg-green-400 animate-pulse-dwindow'
                title='Window is currently active'
              />
            )}
          </div>
          <span className='text-xs text-text-secondary truncate ml-2'>
            {window.reason}
          </span>
        </div>

        {/* Best window - Hero Element */}
        <div className='mb-3'>
          <p className='text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1'>
            Best window
          </p>
          <div className='flex items-baseline gap-2.5'>
            <span className='text-[#C47600] text-2xl font-bold tracking-tight whitespace-nowrap bg-gradient-to-br from-[#C47600] to-[#A86300] bg-clip-text text-transparent'>
              {window.windowStartTime}
            </span>
            <span className='text-[#C47600]/40 text-xl font-light'>—</span>
            <span className='text-[#C47600] text-2xl font-bold tracking-tight whitespace-nowrap bg-gradient-to-br from-[#C47600] to-[#A86300] bg-clip-text text-transparent'>
              {window.windowEndTime}
            </span>
          </div>
        </div>

        {/* Session Duration Badge */}
        <div className='inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/40 mb-3'>
          <svg
            xmlns='http://www.w3.org/2000/svg'
            fill='none'
            viewBox='0 0 24 24'
            strokeWidth={2}
            stroke='currentColor'
            className='w-3.5 h-3.5 text-amber-600'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              d='M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z'
            />
          </svg>
          <span className='text-xs font-semibold text-amber-900'>
            {window.durationMinutes} min session recommended
          </span>
        </div>

        {synthesisMessage && <SynthesisRow message={synthesisMessage} />}

        {/* Stats */}
        <div className='flex flex-wrap items-center gap-2.5 text-xs pt-2.5 border-t border-black/5'>
          <div className='flex items-center gap-1 whitespace-nowrap'>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              fill='none'
              viewBox='0 0 24 24'
              strokeWidth={2}
              stroke='currentColor'
              className='w-3.5 h-3.5 text-[#C47600]'
              aria-hidden='true'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z'
              />
            </svg>
            <span className='text-text-secondary font-medium'>
              ~{window.estimatedIU.toLocaleString()} IU
            </span>
          </div>
          <div className='w-px h-3.5 bg-black/10' />
          <div className='flex items-center gap-1 whitespace-nowrap'>
            <span className='text-text-secondary font-medium'>
              UV {window.avgUvIndex.toFixed(1)}
            </span>
          </div>
          {window.cloudCover > 0.3 && (
            <>
              <div className='w-px h-3.5 bg-black/10' />
              <div className='flex items-center gap-1 whitespace-nowrap'>
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  fill='none'
                  viewBox='0 0 24 24'
                  strokeWidth={2}
                  stroke='currentColor'
                  className='w-3.5 h-3.5 text-text-secondary'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    d='M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z'
                  />
                </svg>
                <span className='text-text-secondary font-medium'>
                  {Math.round(window.cloudCover * 100)}%
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
