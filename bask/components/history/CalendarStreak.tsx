'use client';

import { useEffect, useState } from 'react';
import { sessionsRepository } from '../../lib/database';

interface CalendarStreakProps {
  className?: string;
}

interface DayData {
  date: Date;
  hasActivity: boolean;
  iuTotal: number;
  isCurrentMonth: boolean;
}

export default function CalendarStreak({ className = '' }: CalendarStreakProps) {
  const [calendarDays, setCalendarDays] = useState<DayData[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCalendarData();
  }, [currentMonth]);

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

      // Fetch all sessions for the date range
      const sessions = await sessionsRepository.getByDateRange(
        firstDayOfWeek.toISOString(),
        lastDayOfWeek.toISOString()
      );

      // Create a map of date -> total IU
      const dateMap = new Map<string, number>();
      sessions.forEach((session) => {
        const dateKey = new Date(session.started_at).toDateString();
        dateMap.set(dateKey, (dateMap.get(dateKey) || 0) + session.iu_gained);
      });

      // Build calendar grid
      const days: DayData[] = [];
      const current = new Date(firstDayOfWeek);

      while (current <= lastDayOfWeek) {
        const dateKey = current.toDateString();
        days.push({
          date: new Date(current),
          hasActivity: dateMap.has(dateKey),
          iuTotal: dateMap.get(dateKey) || 0,
          isCurrentMonth: current.getMonth() === month,
        });
        current.setDate(current.getDate() + 1);
      }

      setCalendarDays(days);

      // Calculate streaks (from all-time data)
      await calculateStreaks();
    } catch (error) {
      console.error('Failed to load calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStreaks = async () => {
    try {
      // Fetch all sessions from the past year
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const allSessions = await sessionsRepository.getByDateRange(
        oneYearAgo.toISOString(),
        new Date().toISOString()
      );

      // Get unique dates with activity
      const activeDates = new Set<string>();
      allSessions.forEach((session) => {
        const dateKey = new Date(session.started_at).toDateString();
        activeDates.add(dateKey);
      });

      // Calculate current streak (consecutive days from today backwards)
      let streak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (let i = 0; i < 365; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - i);

        if (activeDates.has(checkDate.toDateString())) {
          streak++;
        } else if (i > 0) {
          // Allow 1-day grace (check if yesterday had activity before breaking)
          break;
        }
      }

      setCurrentStreak(streak);

      // Calculate longest streak
      const sortedDates = Array.from(activeDates)
        .map(d => new Date(d))
        .sort((a, b) => a.getTime() - b.getTime());

      let maxStreak = 0;
      let tempStreak = 0;
      let prevDate: Date | null = null;

      sortedDates.forEach((date) => {
        if (prevDate) {
          const daysDiff = Math.round((date.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysDiff === 1) {
            tempStreak++;
          } else {
            maxStreak = Math.max(maxStreak, tempStreak);
            tempStreak = 1;
          }
        } else {
          tempStreak = 1;
        }
        prevDate = date;
      });

      maxStreak = Math.max(maxStreak, tempStreak);
      setLongestStreak(maxStreak);
    } catch (error) {
      console.error('Failed to calculate streaks:', error);
    }
  };

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

  return (
    <div className={`backdrop-blur-xl bg-white/10 rounded-2xl p-6 border border-white/20 ${className}`}>
      {/* Header with Month Navigation */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Basking Calendar</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => changeMonth('prev')}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-5 h-5 text-white">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <span className="text-white font-medium min-w-[140px] text-center">{monthName}</span>
          <button
            onClick={() => changeMonth('next')}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-5 h-5 text-white">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      </div>

      {!isCurrentMonthView && (
        <button
          onClick={goToToday}
          className="w-full mb-4 px-4 py-2 rounded-lg bg-golden-glow/20 text-golden-glow text-sm font-medium hover:bg-golden-glow/30 transition-colors">
          Go to Today
        </button>
      )}

      {/* Streak Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="backdrop-blur-sm bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="text-text-secondary text-sm mb-1">Current Streak</div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-golden-glow">{currentStreak}</span>
            <span className="text-text-secondary text-sm">days</span>
          </div>
        </div>
        <div className="backdrop-blur-sm bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="text-text-secondary text-sm mb-1">Longest Streak</div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{longestStreak}</span>
            <span className="text-text-secondary text-sm">days</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      {loading ? (
        <div className="py-12 text-center">
          <div className="w-8 h-8 border-4 border-golden-glow/30 border-t-golden-glow rounded-full animate-spin mx-auto"></div>
          <p className="text-text-secondary text-sm mt-3">Loading calendar...</p>
        </div>
      ) : (
        <>
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center text-text-secondary text-xs font-medium py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day, index) => {
              const isToday = day.date.toDateString() === new Date().toDateString();

              return (
                <div
                  key={index}
                  className={`
                    aspect-square rounded-lg flex items-center justify-center text-sm relative
                    transition-all
                    ${!day.isCurrentMonth ? 'opacity-30' : ''}
                    ${day.hasActivity ? 'bg-golden-glow text-dark-bg font-semibold' : 'bg-white/5 text-text-secondary'}
                    ${isToday ? 'ring-2 ring-golden-glow ring-offset-2 ring-offset-dark-bg' : ''}
                    ${day.hasActivity ? 'hover:bg-golden-glow/80' : 'hover:bg-white/10'}
                  `}
                  title={day.hasActivity ? `${day.iuTotal.toLocaleString()} IU` : 'No activity'}>
                  {day.date.getDate()}
                  {day.hasActivity && (
                    <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-dark-bg"></div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-6 flex items-center justify-center gap-4 text-xs text-text-secondary">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-golden-glow"></div>
              <span>With sun exposure</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-white/5"></div>
              <span>No activity</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
