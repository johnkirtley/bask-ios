'use client';

import { Capacitor } from '@capacitor/core';
import { databaseService } from '../connection';
import { toNgMl, type LabUnit } from '../../labUtils';
import {
  seedLabResultsAll,
  seedLabResultCreate,
  seedLabResultUpdate,
  seedLabResultDelete,
} from '../devSeed';

export interface LabResult {
  id: number;
  value_ng_ml: number;
  entered_value: number;
  entered_unit: LabUnit;
  test_date: string;
  source: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewLabResult {
  value: number;
  unit: LabUnit;
  testDate: string;
  source?: string | null;
  notes?: string | null;
}

export const labResultsRepository = {
  /** All results, most recent test first. */
  async getAll(): Promise<LabResult[]> {
    if (!Capacitor.isNativePlatform()) return seedLabResultsAll();
    const db = await databaseService.getConnection();
    const result = await db.query(
      `SELECT * FROM bask_lab_results
       ORDER BY test_date DESC, id DESC`,
    );
    return result.values ?? [];
  },

  /** The single most recent result (by test date), or null if none logged. */
  async getLatest(): Promise<LabResult | null> {
    const all = await this.getAll();
    return all[0] ?? null;
  },

  /** Results within an inclusive test-date range, oldest first (for charting). */
  async getByDateRange(start: string, end: string): Promise<LabResult[]> {
    const all = await this.getAll();
    return all
      .filter((r) => r.test_date >= start && r.test_date <= end)
      .sort((a, b) => (a.test_date < b.test_date ? -1 : 1));
  },

  async create({ value, unit, testDate, source, notes }: NewLabResult): Promise<number> {
    const ngMl = toNgMl(value, unit);
    if (!Capacitor.isNativePlatform()) {
      return seedLabResultCreate({
        value_ng_ml: ngMl,
        entered_value: value,
        entered_unit: unit,
        test_date: testDate,
        source: source ?? null,
        notes: notes ?? null,
      });
    }
    const db = await databaseService.getConnection();
    const result = await db.run(
      `INSERT INTO bask_lab_results
         (value_ng_ml, entered_value, entered_unit, test_date, source, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [ngMl, value, unit, testDate, source ?? null, notes ?? null],
    );
    return result.changes?.lastId ?? 0;
  },

  async update(id: number, { value, unit, testDate, source, notes }: NewLabResult): Promise<void> {
    const ngMl = toNgMl(value, unit);
    if (!Capacitor.isNativePlatform()) {
      seedLabResultUpdate(id, {
        value_ng_ml: ngMl,
        entered_value: value,
        entered_unit: unit,
        test_date: testDate,
        source: source ?? null,
        notes: notes ?? null,
      });
      return;
    }
    const db = await databaseService.getConnection();
    await db.run(
      `UPDATE bask_lab_results
       SET value_ng_ml = ?, entered_value = ?, entered_unit = ?, test_date = ?,
           source = ?, notes = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [ngMl, value, unit, testDate, source ?? null, notes ?? null, id],
    );
  },

  async delete(id: number): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      seedLabResultDelete(id);
      return;
    }
    const db = await databaseService.getConnection();
    await db.run('DELETE FROM bask_lab_results WHERE id = ?', [id]);
  },
};
