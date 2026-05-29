'use client';

import { Capacitor } from '@capacitor/core';
import { DEFAULT_DAILY_GOAL_IU } from '../../constants';
import {
  addDays,
  daysBetweenLocalDateKeys,
  endOfLocalDay,
  getLocalDateKey,
  getNextMilestone,
  isStreakAtRiskDisplayTime,
  isValidMilestone,
  startOfLocalDay,
  STREAK_LOOKBACK_DAYS,
} from '../../streakUtils';
import { getSeed } from '../devSeed';
import { sessionsRepository } from './sessionsRepository';
import {
  StreakState,
  streakStateRepository,
} from './streakStateRepository';
import { supplementsRepository } from './supplementsRepository';
import { userProfileRepository } from './userProfileRepository';

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
  lastQualifyingDate: string | null;
}

export type StreakTransitionReason = 'app_open' | 'log' | 'goal_change' | 'manual';

export interface StreakTransitionResult {
  summary: GoalStreakSummary;
  state: StreakState;
  events: {
    streakStarted: boolean;
    streakDied: boolean;
    milestoneReached: number | null;
    lowGoalStreak: boolean;
  };
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

function resolveGoalIU(dailyGoal?: number): number {
  return dailyGoal && dailyGoal > 0 ? dailyGoal : DEFAULT_DAILY_GOAL_IU;
}

function getDateKeys(startDay: Date, endDay: Date): string[] {
  const dateKeys: string[] = [];
  for (
    let cursor = new Date(startDay);
    cursor <= endDay;
    cursor = addDays(cursor, 1)
  ) {
    dateKeys.push(getLocalDateKey(cursor));
  }
  return dateKeys;
}

function getLatestQualifyingDate(days: DailyGoalProgress[]): string | null {
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].goalMet) return days[i].dateKey;
  }
  return null;
}

export const streaksRepository = {
  async getDailyGoalProgress(
    start: Date,
    end: Date,
    dailyGoal?: number,
  ): Promise<DailyGoalProgress[]> {
    if (!Capacitor.isNativePlatform()) {
      // Web preview: aggregate seeded sessions + supplements so the streak,
      // calendar, and trend visuals populate during local development.
      const goalIU = resolveGoalIU(dailyGoal);
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

      const seed = getSeed();
      seed.sessions.forEach((session) => {
        const progress = progressByDate.get(
          getLocalDateKey(new Date(session.started_at)),
        );
        if (!progress) return;
        progress.sunIU += session.iu_gained;
        progress.totalIU += session.iu_gained;
      });
      seed.supplements.forEach((supplement) => {
        const progress = progressByDate.get(
          getLocalDateKey(new Date(supplement.logged_at)),
        );
        if (!progress) return;
        progress.supplementIU += supplement.dosage_iu;
        progress.totalIU += supplement.dosage_iu;
      });

      return Array.from(progressByDate.values()).map((progress) => ({
        ...progress,
        goalMet: progress.totalIU >= progress.goalIU,
      }));
    }

    const goalIU = await resolveDailyGoal(dailyGoal);
    const startDay = startOfLocalDay(start);
    const endDay = startOfLocalDay(end);
    const dateKeys = getDateKeys(startDay, endDay);
    await streakStateRepository.ensureGoalSnapshots(dateKeys, goalIU);
    const goalSnapshots = await streakStateRepository.getGoalSnapshots(
      dateKeys,
      goalIU,
    );
    const progressByDate = new Map<string, DailyGoalProgress>();

    for (
      let cursor = new Date(startDay);
      cursor <= endDay;
      cursor = addDays(cursor, 1)
    ) {
      const dateKey = getLocalDateKey(cursor);
      const progress = createEmptyProgress(
        cursor,
        goalSnapshots.get(dateKey) ?? goalIU,
      );
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

  async getGoalStreakSummary(
    dailyGoal?: number,
    existingState?: StreakState,
  ): Promise<GoalStreakSummary> {
    if (!Capacitor.isNativePlatform()) {
      // Web preview: derive a real summary from the seeded daily progress.
      const goalIU = resolveGoalIU(dailyGoal);
      const today = startOfLocalDay(new Date());
      const start = addDays(today, -(STREAK_LOOKBACK_DAYS - 1));
      const days = await this.getDailyGoalProgress(start, today, goalIU);
      const metDates = new Set(
        days.filter((day) => day.goalMet).map((day) => day.dateKey),
      );
      const todayKey = getLocalDateKey(today);
      const yesterdayKey = getLocalDateKey(addDays(today, -1));
      const hitToday = metDates.has(todayKey);
      const hasGraceFromYesterday = !hitToday && metDates.has(yesterdayKey);
      const streakAnchor = hitToday ? today : addDays(today, -1);

      let currentStreak = 0;
      if (hitToday || hasGraceFromYesterday) {
        for (let i = 0; i < STREAK_LOOKBACK_DAYS; i++) {
          if (!metDates.has(getLocalDateKey(addDays(streakAnchor, -i)))) break;
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
        longestStreak: Math.max(longestStreak, currentStreak),
        hitToday,
        streakAtRisk:
          currentStreak > 0 && !hitToday && isStreakAtRiskDisplayTime(),
        todayTotalIU: todayProgress.totalIU,
        todayGoalIU: goalIU,
        remainingTodayIU: Math.max(0, goalIU - todayProgress.totalIU),
        nextMilestone,
        daysToNextMilestone: Math.max(0, nextMilestone - currentStreak),
        recentDays: days.slice(-7),
        lastQualifyingDate: getLatestQualifyingDate(days),
      };
    }

    const goalIU = await resolveDailyGoal(dailyGoal);
    const today = startOfLocalDay(new Date());
    const start = addDays(today, -(STREAK_LOOKBACK_DAYS - 1));
    const days = await this.getDailyGoalProgress(start, today, goalIU);
    const persistedState = existingState ?? (await streakStateRepository.get());
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

    let longestStreakInLookback = 0;
    let runningStreak = 0;
    days.forEach((day) => {
      if (day.goalMet) {
        runningStreak++;
        longestStreakInLookback = Math.max(longestStreakInLookback, runningStreak);
      } else {
        runningStreak = 0;
      }
    });

    const todayProgress =
      days.find((day) => day.dateKey === todayKey) ??
      createEmptyProgress(today, goalIU);
    const nextMilestone = getNextMilestone(currentStreak);
    const lastQualifyingDate = getLatestQualifyingDate(days);

    return {
      currentStreak,
      longestStreak: Math.max(
        persistedState.longestStreak,
        longestStreakInLookback,
        currentStreak,
      ),
      hitToday,
      streakAtRisk:
        currentStreak > 0 && !hitToday && isStreakAtRiskDisplayTime(),
      todayTotalIU: todayProgress.totalIU,
      todayGoalIU: goalIU,
      remainingTodayIU: Math.max(0, goalIU - todayProgress.totalIU),
      nextMilestone,
      daysToNextMilestone: Math.max(0, nextMilestone - currentStreak),
      recentDays: days.slice(-7),
      lastQualifyingDate,
    };
  },

  async recomputeAndPersistStreak(
    dailyGoal?: number,
    reason: StreakTransitionReason = 'manual',
  ): Promise<StreakTransitionResult> {
    const previousState = await streakStateRepository.get();
    const summary = await this.getGoalStreakSummary(dailyGoal, previousState);
    const todayKey = getLocalDateKey(new Date());
    const lastQualifyingDate = summary.lastQualifyingDate;
    const previousLastQualifyingDate = previousState.lastQualifyingDate;
    const previousStreakAlive = previousState.currentStreak > 0;
    const missedGraceDay =
      previousLastQualifyingDate !== null &&
      daysBetweenLocalDateKeys(todayKey, previousLastQualifyingDate) > 1;
    // The streak actually broke the first fully-missed day after the grace day:
    // last qualifying + 1 (grace, streak survives) + 1 (break). Detection may run
    // days later, so derive the real break day instead of assuming "yesterday".
    const streakDeathDate = previousLastQualifyingDate
      ? getLocalDateKey(
          addDays(
            startOfLocalDay(new Date(`${previousLastQualifyingDate}T00:00:00`)),
            2,
          ),
        )
      : getLocalDateKey(addDays(new Date(), -1));
    const streakDied =
      previousStreakAlive &&
      summary.currentStreak === 0 &&
      missedGraceDay &&
      previousState.lastStreakDeathDate !== streakDeathDate;
    const milestoneReached =
      reason === 'log' &&
      isValidMilestone(summary.currentStreak) &&
      !previousState.milestonesAchieved.includes(summary.currentStreak)
        ? summary.currentStreak
        : null;
    const milestonesAchieved =
      milestoneReached === null
        ? previousState.milestonesAchieved
        : Array.from(
            new Set([...previousState.milestonesAchieved, milestoneReached]),
          ).sort((a, b) => a - b);

    const nextState: StreakState = {
      ...previousState,
      currentStreak: summary.currentStreak,
      longestStreak: Math.max(
        previousState.longestStreak,
        summary.longestStreak,
        summary.currentStreak,
      ),
      lastQualifyingDate,
      lastStreakDeathDate: streakDied
        ? streakDeathDate
        : previousState.lastStreakDeathDate,
      lastStreakDeathLength: streakDied
        ? previousState.currentStreak
        : previousState.lastStreakDeathLength,
      streakRevivalNotifFired: streakDied
        ? false
        : previousState.streakRevivalNotifFired,
      milestonesAchieved,
    };

    await streakStateRepository.save(nextState);

    return {
      summary: {
        ...summary,
        longestStreak: nextState.longestStreak,
      },
      state: nextState,
      events: {
        streakStarted:
          reason === 'log' &&
          previousState.currentStreak === 0 &&
          summary.currentStreak === 1,
        streakDied,
        milestoneReached,
        lowGoalStreak: summary.todayGoalIU < 500,
      },
    };
  },
};
