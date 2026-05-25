'use client';

export { databaseService } from './connection';
export { runMigrations, getCurrentSchemaVersion } from './schema';
export { migrateFromLocalStorage, isMigrationComplete } from './localStorageMigration';
export { settingsRepository } from './repositories/settingsRepository';
export { userProfileRepository } from './repositories/userProfileRepository';
export { sessionsRepository } from './repositories/sessionsRepository';
export { supplementsRepository } from './repositories/supplementsRepository';
export { cofactorsRepository } from './repositories/cofactorsRepository';
export { streaksRepository } from './repositories/streaksRepository';
export { streakStateRepository } from './repositories/streakStateRepository';

export type { UserProfile } from './repositories/userProfileRepository';
export type { BaskSession, NewBaskSession } from './repositories/sessionsRepository';
export type { Supplement } from './repositories/supplementsRepository';
export type { Cofactor, CofactorType } from './repositories/cofactorsRepository';
export type {
  DailyGoalProgress,
  GoalStreakSummary,
  StreakTransitionResult,
  StreakTransitionReason,
} from './repositories/streaksRepository';
export type {
  DailyGoalSnapshot,
  StreakState,
  StreakStatePatch,
} from './repositories/streakStateRepository';
