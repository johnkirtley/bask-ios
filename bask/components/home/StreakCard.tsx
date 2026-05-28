'use client';

import { GoalStreakSummary } from '../../lib/database';
import { getLocalDateKey } from '../../lib/streakUtils';
import Mascot from '../ui/Mascot';

interface StreakCardProps {
  summary: GoalStreakSummary | null;
  todayTotalIU: number;
  vitaminDGoal: number;
}

function getStatusMessage(
  summary: GoalStreakSummary | null,
  fallbackRemainingIU: number,
  currentStreak: number,
  longestStreak: number,
): string {
  if (!summary) {
    return 'Hit your goal today to start a streak';
  }

  if (summary.hitToday) {
    return 'Goal hit — soak the rest in tomorrow';
  }

  if (currentStreak > 0) {
    const remaining = summary.remainingTodayIU;
    if (remaining <= 2000) {
      return `Only ${remaining.toLocaleString()} IU left. A short walk could finish it.`;
    }
    return `${remaining.toLocaleString()} IU left to keep your streak alive`;
  }

  return `${fallbackRemainingIU.toLocaleString()} IU left to start a streak`;
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
  const statusMessage = getStatusMessage(
    summary,
    remainingTodayIU,
    currentStreak,
    longestStreak,
  );

  return (
    <div className='w-full'>
      <div className='rounded-card overflow-hidden relative bg-gradient-to-br from-[#1AA1A2] to-[#148B8C] p-5 shadow-[0_6px_24px_rgba(40,30,10,0.06)]'>
        {/* Mascot in top-right */}
        <div className='absolute top-3 right-3 z-10'>
          <Mascot size={80} mood="happy" floating={false} />
        </div>

        <div className='relative z-10'>
          <h3 className='text-[11px] font-extrabold uppercase tracking-[0.12em] text-white/70 mb-1'>
            Daily Goal Streak
          </h3>
          <div className='flex items-baseline gap-1.5'>
            <span className='text-[64px] font-black text-white tabular-nums leading-none tracking-tight'>
              {currentStreak}
            </span>
            <span className='text-lg font-bold text-white/80'>
              day{currentStreak === 1 ? '' : 's'}
            </span>
          </div>

          <p className='mt-2 text-sm font-semibold text-white/70'>
            {longestStreak > 0
              ? `Best: ${longestStreak} days · ${statusMessage}`
              : statusMessage}
          </p>
        </div>

        {/* Week day bubbles */}
        {summary?.recentDays && summary.recentDays.length > 0 && (
          <div className='relative z-10 mt-4 flex justify-center gap-2.5'>
            {summary.recentDays.map((day) => {
              const isGoalMet = day.goalMet;
              const isToday = day.dateKey === getLocalDateKey(new Date());
              const dayLetter = day.date.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1);

              return (
                <div
                  key={day.dateKey}
                  className={`flex items-center justify-center w-9 h-9 rounded-full text-xs font-extrabold ${
                    isGoalMet
                      ? 'bg-white text-[#1AA1A2]'
                      : isToday
                        ? 'bg-[#FFC93C] text-[#2A2419]'
                        : 'bg-white/25 text-white/50'
                  }`}
                  title={`${day.totalIU.toLocaleString()} IU`}
                  aria-label={`${day.date.toLocaleDateString('en-US', { weekday: 'long' })}: ${day.totalIU.toLocaleString()} IU`}
                >
                  {dayLetter}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
