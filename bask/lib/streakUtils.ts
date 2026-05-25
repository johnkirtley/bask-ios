'use client';

export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100, 365] as const;
export const STREAK_AT_RISK_START_HOUR = 8;
export const STREAK_LOOKBACK_DAYS = 365;

export type StreakMilestone = (typeof STREAK_MILESTONES)[number];

export function startOfLocalDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function endOfLocalDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function getLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function daysBetweenLocalDateKeys(a: string, b: string): number {
  const aDate = startOfLocalDay(new Date(`${a}T00:00:00`));
  const bDate = startOfLocalDay(new Date(`${b}T00:00:00`));
  return Math.round((aDate.getTime() - bDate.getTime()) / 86_400_000);
}

export function getNextMilestone(currentStreak: number): number {
  return (
    STREAK_MILESTONES.find((milestone) => milestone > currentStreak) ??
    currentStreak + 100
  );
}

export function isStreakAtRiskDisplayTime(date = new Date()): boolean {
  return date.getHours() >= STREAK_AT_RISK_START_HOUR;
}

export function isValidMilestone(value: number): value is StreakMilestone {
  return STREAK_MILESTONES.includes(value as StreakMilestone);
}
