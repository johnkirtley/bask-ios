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
import { formatEstimatedIU } from '../../lib/dEngine';
import GlassCardWrapper from './GlassCardWrapper';
import ProBadge from '../ui/ProBadge';
import { useSubscription } from '../../hooks/useSubscription';

interface DWindowForecastCardProps {
  forecast: DWindowForecast;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  isPremium?: boolean;
  isCurrentCloudBlocked?: boolean;
  sunsetTime?: string;
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

function parseClockTimeToDate(timeStr: string | undefined, baseDate: Date) {
  if (!timeStr || timeStr === '--') return null;

  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();

  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;

  const date = new Date(baseDate);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function getTodayNoWindowCopy(
  reason: DWindowForecast['todayNoWindowReason'],
  isAfterSunset: boolean,
  isCurrentCloudBlocked: boolean,
) {
  if (isAfterSunset) {
    return {
      headline: 'Sun has set',
      subtext: 'No D-window is available for the rest of today.',
    };
  }

  if (reason === 'clouds-blocking') {
    return {
      headline: 'No window right now',
      subtext: isCurrentCloudBlocked
        ? 'Clouds may be blocking vitamin D right now. Check back later.'
        : 'Clouds may limit your D-window later today. Check back later.',
    };
  }

  if (reason === 'low-exposure') {
    return {
      headline: 'No window right now',
      subtext: 'Conditions aren\'t enough for your D-window right now. Check back later.',
    };
  }

  if (reason === 'uv-too-low') {
    return {
      headline: 'No window right now',
      subtext: 'UV is too low for vitamin D right now. Check back later.',
    };
  }

  return {
    headline: 'No window right now',
    subtext: 'Forecast still updating. Check back later.',
  };
}

function RecommendationCard({ rec }: { rec: Recommendation }) {
  const { headline, details, items } = rec.content;
  const styles = {
    window: {
      bg: 'bg-solar-flare/15',
      border: 'border-solar-warm/25',
      icon: 'text-solar-warm',
      iconBg: 'bg-solar-flare/20',
      badge: 'WINDOW',
      badgeBg: 'bg-solar-flare/30 text-[#8A5A00]',
      borderClass: '',
      special: false,
    },
    tip: {
      bg: 'bg-bask-teal/15',
      border: 'border-bask-teal/25',
      icon: 'text-bask-teal',
      iconBg: 'bg-bask-teal/20',
      badge: 'TIP',
      badgeBg: 'bg-bask-teal/20 text-bask-teal',
      borderClass: '',
      special: false,
    },
    action: {
      bg: 'bg-gradient-to-br from-bask-teal/20 to-bask-teal/5',
      border: 'border-2 border-bask-teal/30',
      icon: 'text-bask-teal',
      iconBg: 'bg-bask-teal/30',
      badge: 'ACTION',
      badgeBg: 'bg-bask-teal/25 text-bask-teal',
      borderClass: 'shadow-[0_4px_20px_rgba(26,161,162,0.15)]',
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

const LOW_EXPOSURE_ACTION_HEADLINE = 'More skin exposure could make today viable';
const LOW_UV_ACTION_HEADLINE = 'UV too weak for vitamin D synthesis';

const CURRENT_CLOUD_BLOCKED_RECOMMENDATION: Recommendation = {
  type: 'action',
  priority: 0,
  content: {
    headline: 'Cloud cover may be the blocker right now',
    items: [
      'More skin exposure will not add IU until effective UV rises',
      'Use the forecast window when clouds clear',
    ],
    details:
      'Raw UV is high, but cloud-adjusted UV is below the vitamin D threshold right now.',
  },
};

function getDisplayedRecommendations(
  recommendations: Recommendation[],
  isCurrentCloudBlocked: boolean,
  isPremium: boolean,
): Recommendation[] {
  const visibleRecommendations = recommendations.filter((rec) => {
    if (!isPremium && rec.content.headline?.toLowerCase().includes('tomorrow')) {
      return false;
    }

    if (
      isCurrentCloudBlocked &&
      rec.type === 'action' &&
      (rec.content.headline === LOW_EXPOSURE_ACTION_HEADLINE ||
        rec.content.headline === LOW_UV_ACTION_HEADLINE)
    ) {
      return false;
    }

    return true;
  });

  if (!isCurrentCloudBlocked) {
    return visibleRecommendations.sort((a, b) => a.priority - b.priority);
  }

  return [
    CURRENT_CLOUD_BLOCKED_RECOMMENDATION,
    ...visibleRecommendations,
  ].sort((a, b) => a.priority - b.priority);
}

export default function DWindowForecastCard({
  forecast,
  onRefresh,
  isRefreshing = false,
  isPremium = false,
  isCurrentCloudBlocked = false,
  sunsetTime,
}: DWindowForecastCardProps) {
  const { presentPaywall } = useSubscription();
  const now = useMinuteTick();
  const sunsetAt = parseClockTimeToDate(sunsetTime, now);
  const todayNoWindowCopy = getTodayNoWindowCopy(
    forecast.todayNoWindowReason,
    sunsetAt !== null && now >= sunsetAt,
    isCurrentCloudBlocked,
  );

  // Active dot reflects when D synthesis is possible under current conditions.
  const isWindowActive =
    !isCurrentCloudBlocked && isInSynthesisWindow(forecast.todaySynthesis, now);
  const displayedRecommendations = getDisplayedRecommendations(
    forecast.recommendations,
    isCurrentCloudBlocked,
    isPremium,
  );

  return (
    <div id='dwindow-forecast' className='w-full'>
      <GlassCardWrapper>
        {/* Header */}
        <div className='mb-4'>
          <div className='flex items-center justify-between mb-2'>
            <div className='flex items-center gap-1.5'>
              <h3 className='text-[11px] font-extrabold uppercase tracking-[0.12em] text-text-secondary'>
                D-Window Forecast
              </h3>
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
                isCurrentCloudBlocked={isCurrentCloudBlocked}
                now={now}
              />
            ) : forecast.todaySynthesis ? (
              <SynthesisOnlyDisplay
                synthesis={forecast.todaySynthesis}
                isActive={isWindowActive}
                isCurrentCloudBlocked={isCurrentCloudBlocked}
                now={now}
              />
            ) : (
              <div className='rounded-xl p-3 bg-solar-flare/[0.06] border border-solar-warm/[0.15] text-center'>
                <p className='text-sm font-medium text-text-primary'>
                  {todayNoWindowCopy.headline}
                </p>
                <p className='text-xs text-text-secondary mt-0.5'>
                  {todayNoWindowCopy.subtext}
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
                    <ProBadge interactive={false} />
                    <p className='text-sm font-semibold text-text-primary'>
                      Unlock tomorrow&apos;s D-Window
                    </p>
                  </div>
                </button>
              )
            ) : (
              <div className='rounded-xl p-3 bg-solar-flare/[0.06] border border-solar-warm/[0.15] text-center'>
                <p className='text-sm font-medium text-text-primary'>
                  No D-Window predicted yet
                </p>
                <p className='text-xs text-text-secondary mt-0.5'>
                  {forecast.tomorrowNoWindowReason === 'clouds-blocking'
                    ? 'Cloud cover may block vitamin D'
                    : forecast.tomorrowNoWindowReason === 'low-exposure'
                    ? 'UV available · exposure may be limiting'
                    : forecast.tomorrowNoWindowReason === 'uv-too-low'
                    ? 'UV too low for vitamin D'
                    : "We'll keep updating"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Recommendations */}
        {displayedRecommendations.length > 0 && (
          <div className='mt-4 pt-4 border-t border-black/5'>
            <p className='text-xs font-semibold uppercase tracking-wider text-text-muted mb-3'>
              Recommendations
            </p>
            <div className='space-y-2.5'>
              {displayedRecommendations.map((rec, index) => (
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
      className='backdrop-blur-sm bg-vitality-mint/[0.12] rounded-xl p-3.5 border border-black/5 relative overflow-hidden'
      aria-hidden='true'>
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

function SynthesisRow({
  message,
  tone = 'default',
}: {
  message: string;
  tone?: 'default' | 'blocked';
}) {
  return (
    <div
      className={`flex items-center gap-1.5 mb-3 text-xs ${
        tone === 'blocked'
          ? 'rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 font-semibold text-amber-800'
          : 'text-text-secondary'
      }`}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        fill='none'
        viewBox='0 0 24 24'
        strokeWidth={2}
        stroke='currentColor'
        className={`w-3.5 h-3.5 flex-shrink-0 ${
          tone === 'blocked' ? 'text-amber-600' : 'text-[#F4A536]'
        }`}
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
  isActive,
  isCurrentCloudBlocked = false,
  now,
}: {
  synthesis: SynthesisWindow;
  isActive?: boolean;
  isCurrentCloudBlocked?: boolean;
  now: Date;
}) {
  const message = isCurrentCloudBlocked
    ? 'Clouds may be blocking vitamin D right now'
    : getSynthesisSecondaryMessage(synthesis, null, now) ??
      `D synthesis possible ${synthesis.startTime} – ${synthesis.endTime}`;

  // Near the end of the synthesis window there isn't enough time left for
  // findOptimalWindow to recommend a session (it drops the same-day window
  // once fewer than ~10 min remain: LEAD 5 + MIN_SESSION 5, allowing for :05
  // rounding). In that closing tail the limiter is the clock, not exposure,
  // so suppress the "exposure may be limiting" line to avoid misleading copy.
  const SYNTHESIS_CLOSING_MINUTES = 10;
  const minutesUntilClose =
    (synthesis.endsAt.getTime() - now.getTime()) / 60_000;
  const isWindowClosing = minutesUntilClose <= SYNTHESIS_CLOSING_MINUTES;

  return (
    <div className='rounded-xl p-3 bg-black/[0.03] border border-black/5'>
      {isActive && (
        <div className='flex items-center gap-1.5 mb-2'>
          <span
            className='w-2 h-2 rounded-full bg-green-400 animate-pulse-dwindow'
            title='D synthesis is currently possible'
          />
          <span className='text-xs font-medium text-text-secondary'>
            Active now
          </span>
        </div>
      )}
      <SynthesisRow
        message={message}
        tone={isCurrentCloudBlocked ? 'blocked' : 'default'}
      />
      <p className='text-xs text-text-secondary'>
        {isCurrentCloudBlocked
          ? 'IU stays at 0 while effective UV is below 3.'
          : isWindowClosing
          ? "Today's window is closing. Check back tomorrow."
          : "You can get vitamin D now, but there's no standout window left today."}
      </p>
    </div>
  );
}

function WindowDisplay({
  window,
  synthesis,
  isActive,
  isCurrentCloudBlocked = false,
  now,
}: {
  window: OptimalWindow;
  synthesis?: SynthesisWindow | null;
  isActive?: boolean;
  isCurrentCloudBlocked?: boolean;
  now: Date;
}) {
  const synthesisMessage = isCurrentCloudBlocked
    ? `Clouds may be blocking vitamin D right now · Best window: ${window.windowStartTime} - ${window.windowEndTime}`
    : synthesis
    ? getSynthesisSecondaryMessage(synthesis, window, now)
    : null;

  return (
    <div className='backdrop-blur-sm bg-vitality-mint/[0.12] rounded-xl p-3.5 border border-black/5 relative overflow-hidden'>
      <div className='relative'>
        {/* Header — day label comes from the section heading above */}
        <div className='flex items-center justify-between mb-3'>
          <span className='text-xs text-text-secondary truncate'>
            {window.reason}
          </span>
          {isActive && (
            <span
              className='w-2 h-2 rounded-full bg-green-400 animate-pulse-dwindow ml-2 flex-shrink-0'
              title='Window is currently active'
            />
          )}
        </div>

        {/* Best window - Hero Element */}
        <div className='mb-3'>
          <p className='text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1'>
            Best window
          </p>
          <div className='flex items-baseline gap-2.5 max-w-full'>
            <span className='text-[#F4A536] text-[clamp(1.0625rem,6vw,1.5rem)] leading-none font-bold tracking-tight whitespace-nowrap bg-gradient-to-br from-[#F4A536] to-[#E8941F] bg-clip-text text-transparent'>
              {window.windowStartTime}
            </span>
            <span className='text-[#F4A536]/60 text-[clamp(0.9375rem,5vw,1.25rem)] font-light'>—</span>
            <span className='text-[#F4A536] text-[clamp(1.0625rem,6vw,1.5rem)] leading-none font-bold tracking-tight whitespace-nowrap bg-gradient-to-br from-[#F4A536] to-[#E8941F] bg-clip-text text-transparent'>
              {window.windowEndTime}
            </span>
          </div>
        </div>

        {/* Session Duration Badge */}
        <div className='inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-bask-teal/[0.15] border border-bask-teal/30 mb-3'>
          <svg
            xmlns='http://www.w3.org/2000/svg'
            fill='none'
            viewBox='0 0 24 24'
            strokeWidth={2}
            stroke='currentColor'
            className='w-3.5 h-3.5 text-[#137677]'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              d='M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z'
            />
          </svg>
          <span className='text-xs font-semibold text-[#137677]'>
            {window.durationMinutes} min session recommended
          </span>
        </div>

        {synthesisMessage && (
          <SynthesisRow
            message={synthesisMessage}
            tone={isCurrentCloudBlocked ? 'blocked' : 'default'}
          />
        )}

        {/* Stats */}
        <div className='flex flex-wrap items-center gap-2.5 text-xs pt-2.5 border-t border-black/5'>
          <div className='flex items-center gap-1 whitespace-nowrap'>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              fill='none'
              viewBox='0 0 24 24'
              strokeWidth={2}
              stroke='currentColor'
              className='w-3.5 h-3.5 text-grove-green-dark'
              aria-hidden='true'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                d='M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z'
              />
            </svg>
            <span className='text-text-secondary font-medium'>
              ~{formatEstimatedIU(window.estimatedIU)} IU
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
