'use client';

import { databaseService } from '../connection';

export interface BaskSession {
  id: number;
  started_at: string;
  ended_at: string | null;
  uv_index: number;
  duration_seconds: number;
  iu_gained: number;
  clothing_preset_id: string;
  exposure_percent: number;
  notes: string | null;
  created_at: string;
}

export interface NewBaskSession {
  started_at: string;
  uv_index: number;
  clothing_preset_id: string;
  exposure_percent: number;
  duration_seconds?: number;
  iu_gained?: number;
  notes?: string;
}

export const sessionsRepository = {
  async create(session: NewBaskSession): Promise<number> {
    const db = await databaseService.getConnection();
    const result = await db.run(
      `INSERT INTO bask_sessions (
        started_at, uv_index, clothing_preset_id, exposure_percent,
        duration_seconds, iu_gained, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        session.started_at,
        session.uv_index,
        session.clothing_preset_id,
        session.exposure_percent,
        session.duration_seconds ?? 0,
        session.iu_gained ?? 0,
        session.notes ?? null,
      ]
    );
    return result.changes?.lastId ?? 0;
  },

  async update(id: number, data: Partial<Omit<BaskSession, 'id' | 'created_at'>>): Promise<void> {
    const db = await databaseService.getConnection();
    const updates: string[] = [];
    const values: any[] = [];

    if (data.ended_at !== undefined) {
      updates.push('ended_at = ?');
      values.push(data.ended_at);
    }
    if (data.duration_seconds !== undefined) {
      updates.push('duration_seconds = ?');
      values.push(data.duration_seconds);
    }
    if (data.iu_gained !== undefined) {
      updates.push('iu_gained = ?');
      values.push(data.iu_gained);
    }
    if (data.notes !== undefined) {
      updates.push('notes = ?');
      values.push(data.notes);
    }

    if (updates.length > 0) {
      values.push(id);
      await db.run(
        `UPDATE bask_sessions SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
    }
  },

  async getById(id: number): Promise<BaskSession | null> {
    const db = await databaseService.getConnection();
    const result = await db.query(
      'SELECT * FROM bask_sessions WHERE id = ?',
      [id]
    );
    return result.values?.[0] ?? null;
  },

  async getToday(): Promise<BaskSession[]> {
    const db = await databaseService.getConnection();
    const result = await db.query(
      `SELECT * FROM bask_sessions
       WHERE date(started_at) = date('now', 'localtime')
       ORDER BY started_at DESC`
    );
    return result.values ?? [];
  },

  async getByDateRange(start: string, end: string): Promise<BaskSession[]> {
    const db = await databaseService.getConnection();
    const result = await db.query(
      `SELECT * FROM bask_sessions
       WHERE started_at >= ? AND started_at <= ?
       ORDER BY started_at DESC`,
      [start, end]
    );
    return result.values ?? [];
  },

  async getTodayTotalIU(): Promise<number> {
    const db = await databaseService.getConnection();
    const result = await db.query(
      `SELECT COALESCE(SUM(iu_gained), 0) as total
       FROM bask_sessions
       WHERE date(started_at) = date('now', 'localtime')`
    );
    return result.values?.[0]?.total ?? 0;
  },

  async delete(id: number): Promise<void> {
    const db = await databaseService.getConnection();
    await db.run('DELETE FROM bask_sessions WHERE id = ?', [id]);
  },
};
