'use client';

import { GoalStreakSummary, StreakState } from '../../lib/database';
import { STREAK_MILESTONES } from '../../lib/streakUtils';
import SlideSheet from '../ui/SlideSheet';

interface StreakDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  summary: GoalStreakSummary | null;
  state: StreakState | null;
}

export default function StreakDetailSheet({
  isOpen,
  onClose,
  summary,
  state,
}: StreakDetailSheetProps) {
  const currentStreak = summary?.currentStreak ?? 0;
  const longestStreak = summary?.longestStreak ?? state?.longestStreak ?? 0;
  const nextMilestone = summary?.nextMilestone ?? 3;
  const daysToNextMilestone = summary?.daysToNextMilestone ?? nextMilestone;
  const previousMilestone =
    [...STREAK_MILESTONES]
      .reverse()
      .find((milestone) => milestone <= currentStreak) ?? 0;
  const milestoneRange = Math.max(1, nextMilestone - previousMilestone);
  const milestoneProgress = Math.min(
    100,
    ((currentStreak - previousMilestone) / milestoneRange) * 100,
  );
  const achieved = new Set(state?.milestonesAchieved ?? []);

  return (
    <SlideSheet isOpen={isOpen} onClose={onClose}>
      <div className='px-6 pb-8'>
        <div className='flex items-start justify-between gap-4'>
          <div>
            <p className='text-xs font-semibold uppercase tracking-[0.08em] text-text-secondary'>
              Daily Goal Streak
            </p>
            <div className='mt-3 flex items-end gap-3'>
              <span className='text-5xl flame-pulse' aria-hidden='true'>
                🔥
              </span>
              <div>
                <div className='text-5xl font-bold tabular-nums text-solar-flare'>
                  {currentStreak}
                </div>
                <p className='text-sm font-medium text-text-secondary'>
                  day{currentStreak === 1 ? '' : 's'} current
                </p>
              </div>
            </div>
            <p className='mt-3 text-sm text-text-secondary'>
              Longest: <span className='font-semibold text-text-primary'>{longestStreak}</span>{' '}
              days
            </p>
          </div>

          <button
            type='button'
            onClick={onClose}
            className='rounded-full bg-black/5 px-4 py-2 text-sm font-semibold text-text-secondary active:scale-95'>
            Close
          </button>
        </div>

        {summary?.recentDays && summary.recentDays.length > 0 && (
          <section className='mt-8'>
            <h3 className='text-xs font-semibold uppercase tracking-[0.08em] text-text-secondary'>
              Last 7 Days
            </h3>
            <div className='mt-3 grid grid-cols-7 gap-2'>
              {summary.recentDays.map((day) => {
                const isToday =
                  day.date.toDateString() === new Date().toDateString();
                return (
                  <div key={day.dateKey} className='text-center'>
                    <div
                      className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${
                        day.goalMet
                          ? 'bg-gradient-to-br from-solar-flare to-solar-warm text-white shadow-md'
                          : isToday && !summary.hitToday
                            ? 'animate-pulse bg-solar-flare/15 text-solar-warm'
                            : 'bg-black/5 text-text-secondary'
                      }`}
                      title={`${day.totalIU.toLocaleString()} IU`}>
                      {day.goalMet ? '✓' : ''}
                    </div>
                    <div className='mt-1 text-[10px] font-medium uppercase text-text-muted'>
                      {day.date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1)}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className='mt-8 rounded-2xl bg-white/60 p-4 border border-black/5'>
          <div className='flex items-center justify-between gap-3'>
            <div>
              <h3 className='text-sm font-semibold text-text-primary'>
                Next milestone: Day {nextMilestone}
              </h3>
              <p className='mt-1 text-xs text-text-secondary'>
                {daysToNextMilestone === 0
                  ? 'Milestone reached.'
                  : `${daysToNextMilestone} day${daysToNextMilestone === 1 ? '' : 's'} to go.`}
              </p>
            </div>
            <span className='text-2xl' aria-hidden='true'>🏅</span>
          </div>
          <div className='mt-4 h-2.5 overflow-hidden rounded-full bg-black/5'>
            <div
              className='h-full rounded-full bg-gradient-to-r from-solar-flare to-solar-warm'
              style={{ width: `${milestoneProgress}%` }}
            />
          </div>
        </section>

        <section className='mt-8'>
          <h3 className='text-xs font-semibold uppercase tracking-[0.08em] text-text-secondary'>
            Badges
          </h3>
          <div className='mt-3 grid grid-cols-4 gap-2'>
            {STREAK_MILESTONES.map((milestone) => {
              const unlocked = achieved.has(milestone) || currentStreak >= milestone;
              return (
                <div
                  key={milestone}
                  className={`rounded-2xl border p-3 text-center ${
                    unlocked
                      ? 'border-solar-flare/30 bg-solar-flare/15 text-solar-warm'
                      : 'border-black/5 bg-black/5 text-text-muted'
                  }`}>
                  <div className='text-xl' aria-hidden='true'>
                    {unlocked ? '🔥' : '○'}
                  </div>
                  <div className='mt-1 text-xs font-bold tabular-nums'>
                    {milestone}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </SlideSheet>
  );
}
