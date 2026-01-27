'use client';

import { databaseService } from './connection';

interface Migration {
  version: number;
  up: string[];
}

const migrations: Migration[] = [
  {
    version: 1,
    up: [
      // Schema version tracking
      `CREATE TABLE IF NOT EXISTS schema_info (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      // User progress aggregate data (single row)
      `CREATE TABLE IF NOT EXISTS user_progress (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        current_streak INTEGER NOT NULL DEFAULT 0,
        last_session_date TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      // Completed sessions (normalized)
      `CREATE TABLE IF NOT EXISTS completed_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        program_id TEXT NOT NULL,
        completed_at TEXT NOT NULL,
        duration_seconds INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      // Indexes for common queries
      `CREATE INDEX IF NOT EXISTS idx_sessions_program_id ON completed_sessions(program_id)`,
      `CREATE INDEX IF NOT EXISTS idx_sessions_completed_at ON completed_sessions(completed_at)`,
      // Settings key-value store
      `CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      // Favorites (future feature)
      `CREATE TABLE IF NOT EXISTS favorites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_type TEXT NOT NULL CHECK (item_type IN ('program', 'exercise')),
        item_id TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(item_type, item_id)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_favorites_type ON favorites(item_type)`,
      // Insert default user_progress row
      `INSERT OR IGNORE INTO user_progress (id, current_streak) VALUES (1, 0)`,
    ],
  },
  {
    version: 2,
    up: [
      // Add longest_streak column for tracking all-time best streak
      `ALTER TABLE user_progress ADD COLUMN longest_streak INTEGER NOT NULL DEFAULT 0`,
      // Backfill: set longest_streak to current_streak for existing users
      `UPDATE user_progress SET longest_streak = current_streak WHERE longest_streak = 0 AND current_streak > 0`,
    ],
  },
  {
    version: 3,
    up: [
      // Individual exercise completions (separate from program sessions)
      `CREATE TABLE IF NOT EXISTS completed_exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        exercise_name TEXT NOT NULL,
        exercise_type TEXT NOT NULL CHECK (exercise_type IN ('exercise', 'stretch')),
        muscle_group TEXT NOT NULL,
        completed_at TEXT NOT NULL,
        duration_seconds INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      // Index for date-based queries (heatmap, daily counts)
      `CREATE INDEX IF NOT EXISTS idx_exercises_completed_at ON completed_exercises(completed_at)`,
      // Index for counting by exercise name
      `CREATE INDEX IF NOT EXISTS idx_exercises_name ON completed_exercises(exercise_name)`,
    ],
  },
  {
    version: 4,
    up: [
      // Bask user profile (single row)
      `CREATE TABLE IF NOT EXISTS bask_user_profile (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        fitzpatrick_type INTEGER NOT NULL DEFAULT 2,
        base_d_level INTEGER NOT NULL DEFAULT 0,
        daily_goal INTEGER NOT NULL DEFAULT 5000,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      // Insert default user profile row
      `INSERT OR IGNORE INTO bask_user_profile (id) VALUES (1)`,
      // Bask sun exposure sessions
      `CREATE TABLE IF NOT EXISTS bask_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        started_at TEXT NOT NULL,
        ended_at TEXT,
        uv_index REAL NOT NULL,
        duration_seconds INTEGER NOT NULL DEFAULT 0,
        iu_gained INTEGER NOT NULL DEFAULT 0,
        clothing_preset_id TEXT NOT NULL,
        exposure_percent REAL NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      // Indexes for bask_sessions
      `CREATE INDEX IF NOT EXISTS idx_bask_sessions_started_at ON bask_sessions(started_at)`,
      `CREATE INDEX IF NOT EXISTS idx_bask_sessions_date ON bask_sessions(date(started_at))`,
      // Bask supplements log
      `CREATE TABLE IF NOT EXISTS bask_supplements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dosage_iu INTEGER NOT NULL,
        logged_at TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      // Indexes for bask_supplements
      `CREATE INDEX IF NOT EXISTS idx_bask_supplements_logged_at ON bask_supplements(logged_at)`,
      `CREATE INDEX IF NOT EXISTS idx_bask_supplements_date ON bask_supplements(date(logged_at))`,
    ],
  },
  {
    version: 5,
    up: [
      // Cofactor tracking (Magnesium and Vitamin K2)
      `CREATE TABLE IF NOT EXISTS bask_cofactors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cofactor_type TEXT NOT NULL CHECK (cofactor_type IN ('magnesium', 'vitamin_k2')),
        logged_at TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      // Indexes for bask_cofactors
      `CREATE INDEX IF NOT EXISTS idx_bask_cofactors_logged_at ON bask_cofactors(logged_at)`,
      `CREATE INDEX IF NOT EXISTS idx_bask_cofactors_date ON bask_cofactors(date(logged_at))`,
      `CREATE INDEX IF NOT EXISTS idx_bask_cofactors_type ON bask_cofactors(cofactor_type)`,
    ],
  },
];

export async function runMigrations(): Promise<void> {
  const db = await databaseService.getConnection();

  // Ensure schema_info exists first
  await db.execute(migrations[0].up[0]);

  // Get current version
  const result = await db.query('SELECT MAX(version) as version FROM schema_info');
  const currentVersion = result.values?.[0]?.version ?? 0;

  // Run pending migrations
  for (const migration of migrations) {
    if (migration.version > currentVersion) {
      for (const statement of migration.up) {
        await db.execute(statement);
      }

      await db.run('INSERT INTO schema_info (version) VALUES (?)', [
        migration.version,
      ]);
    }
  }
}

export async function getCurrentSchemaVersion(): Promise<number> {
  try {
    const db = await databaseService.getConnection();
    const result = await db.query('SELECT MAX(version) as version FROM schema_info');
    return result.values?.[0]?.version ?? 0;
  } catch {
    return 0;
  }
}
