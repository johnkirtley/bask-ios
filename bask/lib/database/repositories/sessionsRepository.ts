'use client';

import { Capacitor } from '@capacitor/core';
import { databaseService } from '../connection';
import {
  seedSessionsByRange,
  seedSessionsToday,
  seedSessionsTodayTotalIU,
} from '../devSeed';

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
  source: 'manual' | 'healthkit';
  synced_at: string | null;
}

export interface NewBaskSession {
  started_at: string;
  uv_index: number;
  clothing_preset_id: string;
  exposure_percent: number;
  duration_seconds?: number;
  iu_gained?: number;
  notes?: string;
  source?: 'manual' | 'healthkit';
  synced_at?: string;
}

export const sessionsRepository = {
  async create(session: NewBaskSession): Promise<number> {
    const db = await databaseService.getConnection();
    const result = await db.run(
      `INSERT INTO bask_sessions (
        started_at, uv_index, clothing_preset_id, exposure_percent,
        duration_seconds, iu_gained, notes, source, synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        session.started_at,
        session.uv_index,
        session.clothing_preset_id,
        session.exposure_percent,
        session.duration_seconds ?? 0,
        session.iu_gained ?? 0,
        session.notes ?? null,
        session.source ?? 'manual',
        session.synced_at ?? null,
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
    if (!Capacitor.isNativePlatform()) return seedSessionsToday();
    const db = await databaseService.getConnection();
    const result = await db.query(
      `SELECT * FROM bask_sessions
       WHERE date(started_at, 'localtime') = date('now', 'localtime')
       ORDER BY started_at DESC`
    );
    return result.values ?? [];
  },

  async getByDateRange(start: string, end: string): Promise<BaskSession[]> {
    if (!Capacitor.isNativePlatform()) return seedSessionsByRange(start, end);
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
    if (!Capacitor.isNativePlatform()) return seedSessionsTodayTotalIU();
    const db = await databaseService.getConnection();
    const result = await db.query(
      `SELECT COALESCE(SUM(iu_gained), 0) as total
       FROM bask_sessions
       WHERE date(started_at, 'localtime') = date('now', 'localtime')`
    );
    return result.values?.[0]?.total ?? 0;
  },

  async delete(id: number): Promise<void> {
    const db = await databaseService.getConnection();
    await db.run('DELETE FROM bask_sessions WHERE id = ?', [id]);
  },

  /**
   * Upsert a HealthKit-sourced session for a specific day (always reflects latest sync).
   */
  async upsertHealthKitSession(data: {
    date: string; // YYYY-MM-DD
    duration_seconds: number;
    iu_gained: number;
    uv_index: number;
    synced_at: string;
  }): Promise<void> {
    const db = await databaseService.getConnection();

    // Check if HealthKit session already exists for this date
    const existing = await db.query(
      `SELECT id, iu_gained FROM bask_sessions
       WHERE date(started_at, 'localtime') = date(?, 'localtime')
       AND source = 'healthkit'
       LIMIT 1`,
      [data.date]
    );

    if (existing.values && existing.values.length > 0) {
      const existingSession = existing.values[0];
      // Always update with latest HealthKit data (including 0 values when user deletes entries)
      await db.run(
        `UPDATE bask_sessions
         SET duration_seconds = ?,
             iu_gained = ?,
             uv_index = ?,
             synced_at = ?
         WHERE id = ?`,
        [
          data.duration_seconds,
          data.iu_gained,
          data.uv_index,
          data.synced_at,
          existingSession.id,
        ]
      );
    } else {
      // Create new HealthKit session
      await db.run(
        `INSERT INTO bask_sessions (
          started_at, ended_at, uv_index, clothing_preset_id, exposure_percent,
          duration_seconds, iu_gained, source, synced_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `${data.date}T00:00:00`, // Start of day
          `${data.date}T23:59:59`, // End of day
          data.uv_index,
          'healthkit', // Placeholder preset ID
          50, // Match the exposure percent used in useHealthKitSync calculation
          data.duration_seconds,
          data.iu_gained,
          'healthkit',
          data.synced_at,
        ]
      );
    }
  },

  /**
   * Get total duration of manual sessions for a specific date
   * Used to subtract from HealthKit timeInDaylight to avoid double-counting
   */
  async getManualSessionDuration(date: string): Promise<number> {
    const db = await databaseService.getConnection();
    const result = await db.query(
      `SELECT COALESCE(SUM(duration_seconds), 0) as total
       FROM bask_sessions
       WHERE date(started_at, 'localtime') = date(?, 'localtime')
       AND source = 'manual'`,
      [date]
    );
    return result.values?.[0]?.total ?? 0;
  },

  /**
   * Delete HealthKit session for a specific date
   * Used when user deletes Time in Daylight entry from Apple Health
   */
  async deleteHealthKitSession(date: string): Promise<void> {
    const db = await databaseService.getConnection();
    await db.run(
      `DELETE FROM bask_sessions WHERE date(started_at, 'localtime') = date(?, 'localtime') AND source = 'healthkit'`,
      [date]
    );
  },
};
