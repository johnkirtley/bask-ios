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
      // Settings key-value store
      `CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
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
  {
    version: 2,
    up: [
      // Add new biological profile fields to bask_user_profile
      `ALTER TABLE bask_user_profile ADD COLUMN age INTEGER`,
      `ALTER TABLE bask_user_profile ADD COLUMN weight REAL`,
      `ALTER TABLE bask_user_profile ADD COLUMN weight_unit TEXT DEFAULT 'lbs'`,
      `ALTER TABLE bask_user_profile ADD COLUMN default_attire TEXT DEFAULT 't-shirt-shorts'`,
      `ALTER TABLE bask_user_profile ADD COLUMN disclaimer_accepted_at TEXT`,
    ],
  },
  {
    version: 3,
    up: [
      // Add blood test baseline fields
      `ALTER TABLE bask_user_profile ADD COLUMN blood_test_value REAL`,
      `ALTER TABLE bask_user_profile ADD COLUMN blood_test_unit TEXT DEFAULT 'ng/mL'`,
      `ALTER TABLE bask_user_profile ADD COLUMN blood_test_date TEXT`,
      `ALTER TABLE bask_user_profile ADD COLUMN blood_test_source TEXT DEFAULT 'manual'`,
    ],
  },
  {
    version: 4,
    up: [
      // Add source column to distinguish manual vs HealthKit-derived sessions
      `ALTER TABLE bask_sessions ADD COLUMN source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'healthkit'))`,
      // Add synced_at timestamp for HealthKit sync tracking
      `ALTER TABLE bask_sessions ADD COLUMN synced_at TEXT`,
    ],
  },
  {
    version: 5,
    up: [
      // Persist streak transition state for milestone/death/revival side effects.
      `CREATE TABLE IF NOT EXISTS bask_streak_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        current_streak INTEGER NOT NULL DEFAULT 0,
        longest_streak INTEGER NOT NULL DEFAULT 0,
        last_qualifying_date TEXT,
        last_streak_death_date TEXT,
        last_streak_death_length INTEGER NOT NULL DEFAULT 0,
        streak_revival_notif_fired INTEGER NOT NULL DEFAULT 0,
        last_revival_notif_date TEXT,
        milestones_achieved TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      `INSERT OR IGNORE INTO bask_streak_state (id) VALUES (1)`,
      // Store the user's end-of-day goal per local date so goal changes do not
      // retroactively rewrite existing streak history.
      `CREATE TABLE IF NOT EXISTS bask_daily_goal_snapshots (
        date_key TEXT PRIMARY KEY,
        goal_iu INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
    ],
  },
  {
    version: 6,
    up: [
      // HealthKit sessions previously stored a timezone-naive started_at
      // (`YYYY-MM-DDT00:00:00`), which mis-attributed passive daylight to the wrong
      // local day for negative-UTC-offset users. These rows are fully reconstructable
      // from Apple Health, so drop them; they re-sync with correct UTC-anchored
      // timestamps on the next foreground sync.
      `DELETE FROM bask_sessions WHERE source = 'healthkit'`,
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
