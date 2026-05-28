'use client';

import { Capacitor } from '@capacitor/core';
import { databaseService } from '../connection';
import {
  seedCofactorLastLogged,
  seedCofactorsByRange,
  seedCofactorsTodayByType,
} from '../devSeed';

export type CofactorType = 'magnesium' | 'vitamin_k2';

export interface Cofactor {
  id: number;
  cofactor_type: CofactorType;
  logged_at: string;
  notes: string | null;
  created_at: string;
}

export const cofactorsRepository = {
  async create(cofactorType: CofactorType, notes?: string): Promise<number> {
    const db = await databaseService.getConnection();
    const now = new Date().toISOString();
    const result = await db.run(
      `INSERT INTO bask_cofactors (cofactor_type, logged_at, notes)
       VALUES (?, ?, ?)`,
      [cofactorType, now, notes ?? null]
    );
    return result.changes?.lastId ?? 0;
  },

  async getToday(): Promise<Cofactor[]> {
    const db = await databaseService.getConnection();
    const result = await db.query(
      `SELECT * FROM bask_cofactors
       WHERE date(logged_at, 'localtime') = date('now', 'localtime')
       ORDER BY logged_at DESC`
    );
    return result.values ?? [];
  },

  async getTodayByType(cofactorType: CofactorType): Promise<Cofactor[]> {
    if (!Capacitor.isNativePlatform())
      return seedCofactorsTodayByType(cofactorType) as Cofactor[];
    const db = await databaseService.getConnection();
    const result = await db.query(
      `SELECT * FROM bask_cofactors
       WHERE date(logged_at, 'localtime') = date('now', 'localtime')
       AND cofactor_type = ?
       ORDER BY logged_at DESC`,
      [cofactorType]
    );
    return result.values ?? [];
  },

  async hasLoggedToday(cofactorType: CofactorType): Promise<boolean> {
    const items = await this.getTodayByType(cofactorType);
    return items.length > 0;
  },

  async getLastLoggedDate(cofactorType: CofactorType): Promise<string | null> {
    if (!Capacitor.isNativePlatform())
      return seedCofactorLastLogged(cofactorType);
    const db = await databaseService.getConnection();
    const result = await db.query(
      `SELECT MAX(logged_at) as last_logged
       FROM bask_cofactors
       WHERE cofactor_type = ?`,
      [cofactorType]
    );
    return result.values?.[0]?.last_logged ?? null;
  },

  async getDaysSinceLastLogged(cofactorType: CofactorType): Promise<number> {
    const lastLogged = await this.getLastLoggedDate(cofactorType);
    if (!lastLogged) return Infinity;

    const lastDate = new Date(lastLogged);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - lastDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  },

  async getByDateRange(start: string, end: string): Promise<Cofactor[]> {
    if (!Capacitor.isNativePlatform()) return seedCofactorsByRange(start, end);
    const db = await databaseService.getConnection();
    const result = await db.query(
      `SELECT * FROM bask_cofactors
       WHERE logged_at >= ? AND logged_at <= ?
       ORDER BY logged_at DESC`,
      [start, end]
    );
    return result.values ?? [];
  },

  async update(id: number, data: Partial<Pick<Cofactor, 'notes'>>): Promise<void> {
    const db = await databaseService.getConnection();
    const updates: string[] = [];
    const values: any[] = [];

    if (data.notes !== undefined) {
      updates.push('notes = ?');
      values.push(data.notes);
    }

    if (updates.length > 0) {
      values.push(id);
      await db.run(
        `UPDATE bask_cofactors SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
    }
  },

  async delete(id: number): Promise<void> {
    const db = await databaseService.getConnection();
    await db.run('DELETE FROM bask_cofactors WHERE id = ?', [id]);
  },
};
