'use client';

import { databaseService } from '../connection';

export interface Supplement {
  id: number;
  dosage_iu: number;
  logged_at: string;
  notes: string | null;
  created_at: string;
}

export const supplementsRepository = {
  async create(dosageIu: number, notes?: string): Promise<number> {
    const db = await databaseService.getConnection();
    const now = new Date().toISOString();
    const result = await db.run(
      `INSERT INTO bask_supplements (dosage_iu, logged_at, notes)
       VALUES (?, ?, ?)`,
      [dosageIu, now, notes ?? null]
    );
    return result.changes?.lastId ?? 0;
  },

  async getToday(): Promise<Supplement[]> {
    const db = await databaseService.getConnection();
    const result = await db.query(
      `SELECT * FROM bask_supplements
       WHERE date(logged_at) = date('now', 'localtime')
       ORDER BY logged_at DESC`
    );
    return result.values ?? [];
  },

  async getTodayTotalIU(): Promise<number> {
    const db = await databaseService.getConnection();
    const result = await db.query(
      `SELECT COALESCE(SUM(dosage_iu), 0) as total
       FROM bask_supplements
       WHERE date(logged_at) = date('now', 'localtime')`
    );
    return result.values?.[0]?.total ?? 0;
  },

  async getByDateRange(start: string, end: string): Promise<Supplement[]> {
    const db = await databaseService.getConnection();
    const result = await db.query(
      `SELECT * FROM bask_supplements
       WHERE logged_at >= ? AND logged_at <= ?
       ORDER BY logged_at DESC`,
      [start, end]
    );
    return result.values ?? [];
  },

  async delete(id: number): Promise<void> {
    const db = await databaseService.getConnection();
    await db.run('DELETE FROM bask_supplements WHERE id = ?', [id]);
  },
};
