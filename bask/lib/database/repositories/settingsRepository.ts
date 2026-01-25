'use client';

import { databaseService } from '../connection';

export const settingsRepository = {
  async get(key: string): Promise<string | null> {
    const db = await databaseService.getConnection();
    const result = await db.query(
      'SELECT value FROM settings WHERE key = ?',
      [key]
    );
    return result.values?.[0]?.value ?? null;
  },

  async set(key: string, value: string): Promise<void> {
    const db = await databaseService.getConnection();
    await db.run(
      `INSERT INTO settings (key, value, updated_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = datetime('now')`,
      [key, value, value]
    );
  },

  async delete(key: string): Promise<void> {
    const db = await databaseService.getConnection();
    await db.run('DELETE FROM settings WHERE key = ?', [key]);
  },

  async getAll(): Promise<Record<string, string>> {
    const db = await databaseService.getConnection();
    const result = await db.query('SELECT key, value FROM settings');

    const settings: Record<string, string> = {};
    for (const row of result.values ?? []) {
      settings[row.key] = row.value;
    }
    return settings;
  },

  async setMultiple(entries: Record<string, string>): Promise<void> {
    const db = await databaseService.getConnection();
    const statements = Object.entries(entries).map(([key, value]) => ({
      statement: `INSERT INTO settings (key, value, updated_at)
                  VALUES (?, ?, datetime('now'))
                  ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = datetime('now')`,
      values: [key, value, value],
    }));

    if (statements.length > 0) {
      await db.executeSet(statements);
    }
  },
};
