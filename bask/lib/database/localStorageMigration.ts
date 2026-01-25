'use client';

// Template version - no migration needed
// This file can be customized if you need to migrate data from localStorage to SQLite

const MIGRATION_FLAG_KEY = 'app_template_sqlite_migrated';

export async function migrateFromLocalStorage(): Promise<boolean> {
  // Mark migration as complete (nothing to migrate in template)
  if (typeof window !== 'undefined') {
    localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
  }
  return false;
}

export function isMigrationComplete(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(MIGRATION_FLAG_KEY) === 'true';
}
