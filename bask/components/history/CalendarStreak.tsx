'use client';

import { useEffect, useState } from 'react';
import { streaksRepository, userProfileRepository } from '../../lib/database';
import { DEFAULT_DAILY_GOAL_IU } from '../../lib/constants';
import LoadingSpinner from '../ui/LoadingSpinner';

interface CalendarStreakProps {
  className?: string;
}

interface DayData {
  date: Date;
  hasActivity: boolean;
  goalMet: boolean;
  iuTotal: number;
  sunIU: number;
  supplementIU: number;
  isCurrentMonth: boolean;
}

function getHeatIntensity(
  iuTotal: number,
  dailyGoal: number,
): 'none' | 'light' | 'warm' | 'hot' | 'blazing' {
  if (iuTotal === 0) return 'none';
  const ratio = iuTotal / dailyGoal;
  if (ratio < 0.25) return 'light';
  if (ratio < 0.5) return 'warm';
  if (ratio < 0.75) return 'hot';
  return 'blazing';
}

function getHeatStyles(intensity: 'none' | 'light' | 'warm' | 'hot' | 'blazing'): string {
  switch (intensity) {
    case 'none':
      return 'bg-white/50 text-text-secondary';
    case 'light':
      return 'bg-gradient-to-br from-solar-flare/30 to-solar-flare/20 text-text-primary font-medium shadow-sm';
    case 'warm':
      return 'bg-gradient-to-br from-solar-flare/60 to-solar-warm/50 text-white font-semibold shadow-md';
    case 'hot':
      return 'bg-gradient-to-br from-solar-flare to-solar-warm text-white font-bold shadow-lg heat-breathe';
    case 'blazing':
      return 'bg-gradient-to-br from-solar-warm to-ember-alert text-white font-bold shadow-xl heat-breathe';
  }
}

function getHeatGlow(intensity: 'none' | 'light' | 'warm' | 'hot' | 'blazing'): React.ReactNode {
  if (intensity === 'none' || intensity === 'light') return null;

  const glowOpacity = intensity === 'warm' ? 0.15 : intensity === 'hot' ? 0.25 : 0.35;

  return (
    <div
      className="absolute inset-0 rounded-lg blur-sm -z-10"
      style={{
        background: `radial-gradient(circle at center, rgba(255, 201, 60, ${glowOpacity}) 0%, transparent 70%)`,
      }}
    />
  );
}

export default function CalendarStreak({ className = '' }: CalendarStreakProps) {
  const [calendarDays, setCalendarDays] = useState<DayData[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [hitToday, setHitToday] = useState(false);
  const [streakAtRisk, setStreakAtRisk] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [dailyGoal, setDailyGoal] = useState(DEFAULT_DAILY_GOAL_IU);

  useEffect(() => {
    userProfileRepository.get().then((profile) => {
      if (profile?.daily_goal) {
        setDailyGoal(profile.daily_goal);
      }
    });
  }, []);

  useEffect(() => {
    const calculateStreaks = async () => {
      try {
        const summary = await streaksRepository.getGoalStreakSummary(dailyGoal);

        setCurrentStreak(summary.currentStreak);
        setLongestStreak(summary.longestStreak);
        setHitToday(summary.hitToday);
        setStreakAtRisk(summary.streakAtRisk);
      } catch (error) {
        console.error('Failed to calculate streaks:', error);
      }
    };

    const loadCalendarData = async () => {
      setLoading(true);
      try {
        // Get first and last day of current month view
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();

        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);

        // Get first day to show (start of week containing first day of month)
        const firstDayOfWeek = new Date(firstDayOfMonth);
        firstDayOfWeek.setDate(firstDayOfWeek.getDate() - firstDayOfWeek.getDay());

        // Get last day to show (end of week containing last day of month)
        const lastDayOfWeek = new Date(lastDayOfMonth);
        lastDayOfWeek.setDate(lastDayOfWeek.getDate() + (6 - lastDayOfWeek.getDay()));

        const [dailyProgress] = await Promise.all([
          streaksRepository.getDailyGoalProgress(
            firstDayOfWeek,
            lastDayOfWeek,
            dailyGoal,
          ),
          calculateStreaks(),
        ]);

        const progressMap = new Map(
          dailyProgress.map((progress) => [progress.date.toDateString(), progress]),
        );

        // Build calendar grid
        const days: DayData[] = [];
        const current = new Date(firstDayOfWeek);

        while (current <= lastDayOfWeek) {
          const dateKey = current.toDateString();
          const progress = progressMap.get(dateKey);
          days.push({
            date: new Date(current),
            hasActivity: (progress?.totalIU ?? 0) > 0,
            goalMet: progress?.goalMet ?? false,
            iuTotal: progress?.totalIU ?? 0,
            sunIU: progress?.sunIU ?? 0,
            supplementIU: progress?.supplementIU ?? 0,
            isCurrentMonth: current.getMonth() === month,
          });
          current.setDate(current.getDate() + 1);
        }

        setCalendarDays(days);
      } catch (error) {
        console.error('Failed to load calendar data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCalendarData();
  }, [currentMonth, dailyGoal]);

  const changeMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentMonth(newMonth);
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const isCurrentMonthView = currentMonth.getMonth() === new Date().getMonth() &&
                            currentMonth.getFullYear() === new Date().getFullYear();

  const isNewRecord = currentStreak > 0 && hitToday && currentStreak >= longestStreak;
  const motivationalText = currentStreak === 0 ? 'Hit your goal to start!' :
                          streakAtRisk ? "Today's goal keeps it alive" :
                          isNewRecord ? 'New record! 🎉' :
                          'Keep it going!';

  return (
    <div className={`relative overflow-hidden backdrop-blur-xl bg-white/70 rounded-card p-6 border border-black/5 shadow-sm ${className}`}>
      {/* Decorative radial glow behind card */}
      <div className="absolute -inset-8 bg-solar-flare/5 rounded-full blur-3xl -z-10 pointer-events-none" />

      {/* Header - Stacked Title and Month Navigation */}
      <div className="mb-6 space-y-4">
        {/* Title with Solar Accent */}
        <div className="text-center relative">
          <div className="absolute left-1/2 -translate-x-1/2 -top-1 w-32 h-8 bg-solar-flare/10 blur-2xl pointer-events-none"></div>
          <h2 className="text-2xl font-bold text-text-primary tracking-tight relative">
            Goal Streak Calendar
          </h2>
        </div>

        {/* Month Navigation - Centered */}
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => changeMonth('prev')}
            className="p-2 rounded-xl hover:bg-black/5 active:bg-black/10 transition-all flex-shrink-0 touch-manipulation"
            aria-label="Previous month">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
              className="w-5 h-5 text-text-primary">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>

          <div className="min-w-[160px] text-center px-4 py-1.5 rounded-xl bg-white/40">
            <span className="text-text-primary font-semibold text-base whitespace-nowrap">
              {monthName}
            </span>
          </div>

          <button
            onClick={() => changeMonth('next')}
            className="p-2 rounded-xl hover:bg-black/5 active:bg-black/10 transition-all flex-shrink-0 touch-manipulation"
            aria-label="Next month">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
              className="w-5 h-5 text-text-primary">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      </div>

      {!isCurrentMonthView && (
        <button
          onClick={goToToday}
          className="w-full mb-4 px-4 py-2 rounded-full bg-solar-flare/20 text-solar-flare text-sm font-medium hover:bg-solar-flare/30 transition-colors">
          Go to Today
        </button>
      )}

      {/* Streak Stats - Redesigned with Icons and Glow */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {/* Current Streak */}
        <div className="relative backdrop-blur-sm bg-white/70 rounded-xl p-4 border border-black/5 overflow-hidden">
          {currentStreak > 0 && (
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-solar-flare/10 rounded-full blur-2xl pointer-events-none streak-glow" />
          )}
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <div className={`text-2xl ${currentStreak > 0 ? 'flame-pulse' : ''}`}>
                {currentStreak > 0 ? '🔥' : '☀️'}
              </div>
              <div className="text-text-secondary text-[10px] uppercase tracking-wider">Current</div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold text-solar-flare tabular-nums">{currentStreak}</span>
              <span className="text-text-secondary text-xs">days</span>
            </div>
            <div className="text-[10px] text-solar-flare font-medium mt-1">{motivationalText}</div>
          </div>
        </div>

        {/* Best Streak */}
        <div className="relative backdrop-blur-sm bg-white/70 rounded-xl p-4 border border-black/5">
          <div className="flex items-center gap-2 mb-2">
            <div className="text-2xl">{isNewRecord && longestStreak > 0 ? '👑' : '🏆'}</div>
            <div className="text-text-secondary text-[10px] uppercase tracking-wider">Best</div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold text-text-primary tabular-nums">{longestStreak}</span>
            <span className="text-text-secondary text-xs">days</span>
          </div>
          {isNewRecord && longestStreak > 0 && (
            <div className="text-[10px] text-text-secondary font-medium mt-1">Tied!</div>
          )}
        </div>
      </div>

      {/* Calendar Grid */}
      {loading ? (
        <div className="py-12 text-center">
          <LoadingSpinner size='sm' />
          <p className="text-text-secondary text-sm mt-3">Loading calendar...</p>
        </div>
      ) : (
        <>
          {/* Day headers - uppercase tracking style */}
          <div className="grid grid-cols-7 gap-2 mb-3">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <div key={i} className="text-center text-text-secondary text-[10px] uppercase tracking-[0.08em] font-semibold py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day, index) => {
              const isToday = day.date.toDateString() === new Date().toDateString();
              const intensity = getHeatIntensity(day.iuTotal, dailyGoal);
              const heatStyles = getHeatStyles(intensity);

              return (
                <div
                  key={index}
                  className={`
                    relative aspect-square rounded-lg flex items-center justify-center text-sm
                    transition-all cursor-pointer
                    calendar-day
                    ${!day.isCurrentMonth ? 'opacity-30' : ''}
                    ${heatStyles}
                    ${isToday ? 'ring-2 ring-solar-flare ring-offset-2 ring-offset-light-bg today-ring-pulse' : ''}
                    hover:scale-105
                  `}
                  style={{ animationDelay: `${index * 30}ms` }}
                  title={
                    day.hasActivity
                      ? `${day.iuTotal.toLocaleString()} IU of ${dailyGoal.toLocaleString()} IU goal (${day.sunIU.toLocaleString()} sun + ${day.supplementIU.toLocaleString()} supplement)`
                      : 'No IU logged'
                  }>

                  {/* Heat glow effect for active days */}
                  {getHeatGlow(intensity)}

                  {/* Day number */}
                  <span className="relative z-10">{day.date.getDate()}</span>

                  {/* Check indicator for days where the IU goal was met */}
                  {day.goalMet && (
                    <div className="absolute top-1 right-1 flex h-3 w-3 items-center justify-center rounded-full bg-white/90 text-[8px] font-bold text-solar-warm">
                      ✓
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Goal Completion Legend - Gradient Bar */}
          <div className="mt-6 space-y-2">
            <div className="text-center text-[10px] text-text-secondary uppercase tracking-wider mb-2">
              Goal Completion Scale
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-text-secondary flex-shrink-0">Low</span>
              <div className="flex-1 h-6 rounded-lg overflow-hidden flex">
                <div className="flex-1 bg-gradient-to-r from-solar-flare/20 to-solar-flare/40"></div>
                <div className="flex-1 bg-gradient-to-r from-solar-flare/40 to-solar-flare/70"></div>
                <div className="flex-1 bg-gradient-to-r from-solar-flare/70 to-solar-flare"></div>
                <div className="flex-1 bg-gradient-to-r from-solar-flare to-ember-alert"></div>
              </div>
              <span className="text-[10px] text-text-secondary flex-shrink-0">High</span>
            </div>
            <div className="text-center text-[10px] text-text-secondary">
              Based on daily goal of {dailyGoal.toLocaleString()} IU. Checkmarks mark goal-hit days.
            </div>
          </div>
        </>
      )}
    </div>
  );
}
