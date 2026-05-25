'use client';

import { DEFAULT_DAILY_GOAL_IU } from '../../constants';
import { sessionsRepository } from './sessionsRepository';
import { supplementsRepository } from './supplementsRepository';
import { userProfileRepository } from './userProfileRepository';

const STREAK_LOOKBACK_DAYS = 365;
const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100, 365];

export interface DailyGoalProgress {
  date: Date;
  dateKey: string;
  sunIU: number;
  supplementIU: number;
  totalIU: number;
  goalIU: number;
  goalMet: boolean;
}

export interface GoalStreakSummary {
  currentStreak: number;
  longestStreak: number;
  hitToday: boolean;
  streakAtRisk: boolean;
  todayTotalIU: number;
  todayGoalIU: number;
  remainingTodayIU: number;
  nextMilestone: number;
  daysToNextMilestone: number;
  recentDays: DailyGoalProgress[];
}

function startOfLocalDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfLocalDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function getLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createEmptyProgress(date: Date, goalIU: number): DailyGoalProgress {
  return {
    date: startOfLocalDay(date),
    dateKey: getLocalDateKey(date),
    sunIU: 0,
    supplementIU: 0,
    totalIU: 0,
    goalIU,
    goalMet: false,
  };
}

async function resolveDailyGoal(dailyGoal?: number): Promise<number> {
  if (dailyGoal && dailyGoal > 0) return dailyGoal;

  const profile = await userProfileRepository.get();
  return profile?.daily_goal && profile.daily_goal > 0
    ? profile.daily_goal
    : DEFAULT_DAILY_GOAL_IU;
}

function getNextMilestone(currentStreak: number): number {
  return (
    STREAK_MILESTONES.find((milestone) => milestone > currentStreak) ??
    currentStreak + 100
  );
}

export const streaksRepository = {
  async getDailyGoalProgress(
    start: Date,
    end: Date,
    dailyGoal?: number,
  ): Promise<DailyGoalProgress[]> {
    const goalIU = await resolveDailyGoal(dailyGoal);
    const startDay = startOfLocalDay(start);
    const endDay = startOfLocalDay(end);
    const progressByDate = new Map<string, DailyGoalProgress>();

    for (
      let cursor = new Date(startDay);
      cursor <= endDay;
      cursor = addDays(cursor, 1)
    ) {
      const progress = createEmptyProgress(cursor, goalIU);
      progressByDate.set(progress.dateKey, progress);
    }

    const [sessions, supplements] = await Promise.all([
      sessionsRepository.getByDateRange(
        startDay.toISOString(),
        endOfLocalDay(endDay).toISOString(),
      ),
      supplementsRepository.getByDateRange(
        startDay.toISOString(),
        endOfLocalDay(endDay).toISOString(),
      ),
    ]);

    sessions.forEach((session) => {
      const dateKey = getLocalDateKey(new Date(session.started_at));
      const progress = progressByDate.get(dateKey);
      if (!progress) return;

      progress.sunIU += session.iu_gained;
      progress.totalIU += session.iu_gained;
    });

    supplements.forEach((supplement) => {
      const dateKey = getLocalDateKey(new Date(supplement.logged_at));
      const progress = progressByDate.get(dateKey);
      if (!progress) return;

      progress.supplementIU += supplement.dosage_iu;
      progress.totalIU += supplement.dosage_iu;
    });

    return Array.from(progressByDate.values()).map((progress) => ({
      ...progress,
      goalMet: progress.totalIU >= progress.goalIU,
    }));
  },

  async getGoalStreakSummary(dailyGoal?: number): Promise<GoalStreakSummary> {
    const goalIU = await resolveDailyGoal(dailyGoal);
    const today = startOfLocalDay(new Date());
    const start = addDays(today, -(STREAK_LOOKBACK_DAYS - 1));
    const days = await this.getDailyGoalProgress(start, today, goalIU);
    const metDates = new Set(
      days.filter((day) => day.goalMet).map((day) => day.dateKey),
    );

    const todayKey = getLocalDateKey(today);
    const yesterday = addDays(today, -1);
    const yesterdayKey = getLocalDateKey(yesterday);
    const hitToday = metDates.has(todayKey);
    const hasGraceFromYesterday = !hitToday && metDates.has(yesterdayKey);
    const streakAnchor = hitToday ? today : yesterday;

    let currentStreak = 0;
    if (hitToday || hasGraceFromYesterday) {
      for (let i = 0; i < STREAK_LOOKBACK_DAYS; i++) {
        const dateKey = getLocalDateKey(addDays(streakAnchor, -i));
        if (!metDates.has(dateKey)) break;
        currentStreak++;
      }
    }

    let longestStreak = 0;
    let runningStreak = 0;
    days.forEach((day) => {
      if (day.goalMet) {
        runningStreak++;
        longestStreak = Math.max(longestStreak, runningStreak);
      } else {
        runningStreak = 0;
      }
    });

    const todayProgress =
      days.find((day) => day.dateKey === todayKey) ??
      createEmptyProgress(today, goalIU);
    const nextMilestone = getNextMilestone(currentStreak);

    return {
      currentStreak,
      longestStreak,
      hitToday,
      streakAtRisk: currentStreak > 0 && !hitToday,
      todayTotalIU: todayProgress.totalIU,
      todayGoalIU: goalIU,
      remainingTodayIU: Math.max(0, goalIU - todayProgress.totalIU),
      nextMilestone,
      daysToNextMilestone: Math.max(0, nextMilestone - currentStreak),
      recentDays: days.slice(-7),
    };
  },
};
