'use client';

import GlassCardWrapper from './GlassCardWrapper';
import { GoalStreakSummary } from '../../lib/database';

interface StreakCardProps {
  summary: GoalStreakSummary | null;
  todayTotalIU: number;
  vitaminDGoal: number;
}

function getStatusMessage(
  summary: GoalStreakSummary | null,
  fallbackRemainingIU: number,
  currentStreak: number,
): string {
  if (!summary) {
    return 'Hit your vitamin D goal today to start a streak.';
  }

  if (summary.hitToday) {
    return 'Goal complete. Come back tomorrow to keep it going.';
  }

  if (currentStreak > 0) {
    const remaining = summary.remainingTodayIU;
    return `${remaining.toLocaleString()} IU left today to keep your streak alive.`;
  }

  return `${fallbackRemainingIU.toLocaleString()} IU left today to start a streak.`;
}

export default function StreakCard({
  summary,
  todayTotalIU,
  vitaminDGoal,
}: StreakCardProps) {
  const currentStreak = summary?.currentStreak ?? 0;
  const longestStreak = summary?.longestStreak ?? 0;
  const remainingTodayIU =
    summary?.remainingTodayIU ?? Math.max(0, vitaminDGoal - todayTotalIU);
  const progressPercent = Math.min(100, (todayTotalIU / vitaminDGoal) * 100);
  const statusMessage = getStatusMessage(
    summary,
    remainingTodayIU,
    currentStreak,
  );

  return (
    <div className='w-full'>
      <GlassCardWrapper>
        <div className='flex items-start justify-between gap-3'>
          <div className='min-w-0 flex-1'>
            <h3 className='text-xs font-semibold uppercase tracking-[0.08em] text-text-secondary mb-2'>
              Daily Goal Streak
            </h3>
            <div className='flex items-baseline gap-2'>
              <span className='text-4xl font-bold text-solar-flare tabular-nums'>
                {currentStreak}
              </span>
              <span className='text-sm font-medium text-text-secondary'>
                day{currentStreak === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          {longestStreak > 0 && (
            <p className='shrink-0 text-xs text-text-secondary whitespace-nowrap'>
              Best:{' '}
              <span className='font-semibold text-text-primary'>
                {longestStreak}
              </span>{' '}
              days
            </p>
          )}
        </div>

        <p className='mt-4 text-sm leading-relaxed text-text-primary'>
          {statusMessage}
        </p>

        <div className='mt-4'>
          <div className='mb-2 flex items-center justify-between text-xs text-text-secondary'>
            <span>Today</span>
            <span>
              {todayTotalIU.toLocaleString()} / {vitaminDGoal.toLocaleString()} IU
            </span>
          </div>
          <div className='h-2.5 overflow-hidden rounded-full bg-black/5'>
            <div
              className='h-full rounded-full bg-gradient-to-r from-solar-flare to-solar-warm transition-all duration-500'
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {summary?.recentDays && summary.recentDays.length > 0 && (
          <div className='mt-4 grid grid-cols-7 gap-2'>
            {summary.recentDays.map((day) => {
              const isGoalMet = day.goalMet;

              return (
                <div key={day.dateKey} className='text-center'>
                  <div
                    className={
                      isGoalMet
                        ? 'mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-solar-flare to-solar-warm text-xs font-bold text-white shadow-md'
                        : 'mx-auto h-8 w-8 rounded-full bg-black/5'
                    }
                    title={`${day.totalIU.toLocaleString()} IU`}
                    aria-label={`${day.date.toLocaleDateString('en-US', {
                      weekday: 'long',
                    })}: ${day.totalIU.toLocaleString()} IU`}>
                    {isGoalMet && (
                      <svg
                        xmlns='http://www.w3.org/2000/svg'
                        fill='none'
                        viewBox='0 0 24 24'
                        strokeWidth={3}
                        stroke='currentColor'
                        className='h-4 w-4'>
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          d='M4.5 12.75l6 6 9-13.5'
                        />
                      </svg>
                    )}
                  </div>
                  <div className='mt-1 text-[10px] font-medium uppercase text-text-muted'>
                    {day.date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </GlassCardWrapper>
    </div>
  );
}
