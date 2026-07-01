// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';

import { sessionsRepository } from '@/lib/database/repositories/sessionsRepository';
import { getLocalDateKey } from '@/lib/streakUtils';
import { getFakeDb, resetBackend } from '../_setup/capacitorMocks';

function nowIso() {
  return new Date().toISOString();
}

describe('sessionsRepository', () => {
  beforeEach(() => resetBackend());

  it('create applies defaults and returns an id', async () => {
    const id = await sessionsRepository.create({
      started_at: nowIso(),
      uv_index: 5,
      clothing_preset_id: 'tshirt',
      exposure_percent: 40,
    });
    expect(id).toBeGreaterThan(0);

    const row = await sessionsRepository.getById(id);
    expect(row).not.toBeNull();
    expect(row!.source).toBe('manual');
    expect(row!.duration_seconds).toBe(0);
    expect(row!.iu_gained).toBe(0);
    expect(row!.notes).toBeNull();
    expect(row!.synced_at).toBeNull();
  });

  it('getById returns null for a missing row', async () => {
    expect(await sessionsRepository.getById(999)).toBeNull();
  });

  it('update persists ended_at, duration, and iu', async () => {
    const id = await sessionsRepository.create({
      started_at: nowIso(),
      uv_index: 5,
      clothing_preset_id: 'tshirt',
      exposure_percent: 40,
    });
    await sessionsRepository.update(id, {
      ended_at: nowIso(),
      duration_seconds: 600,
      iu_gained: 1500,
    });

    const row = await sessionsRepository.getById(id);
    expect(row!.duration_seconds).toBe(600);
    expect(row!.iu_gained).toBe(1500);
    expect(row!.ended_at).not.toBeNull();
  });

  it('update with no fields is a no-op', async () => {
    const id = await sessionsRepository.create({
      started_at: nowIso(),
      uv_index: 5,
      clothing_preset_id: 'tshirt',
      exposure_percent: 40,
    });
    await sessionsRepository.update(id, {});
    const row = await sessionsRepository.getById(id);
    expect(row!.iu_gained).toBe(0);
  });

  it('delete removes the row', async () => {
    const id = await sessionsRepository.create({
      started_at: nowIso(),
      uv_index: 5,
      clothing_preset_id: 'tshirt',
      exposure_percent: 40,
    });
    await sessionsRepository.delete(id);
    expect(await sessionsRepository.getById(id)).toBeNull();
  });

  it('upsertHealthKitSession inserts a healthkit row then updates it on the second call', async () => {
    await sessionsRepository.upsertHealthKitSession({
      date: '2025-01-15',
      duration_seconds: 1200,
      iu_gained: 500,
      uv_index: 4,
      synced_at: 'sync-1',
    });

    let rows = getFakeDb().getTable('bask_sessions');
    expect(rows).toHaveLength(1);
    expect(rows[0].source).toBe('healthkit');
    expect(rows[0].clothing_preset_id).toBe('healthkit');
    expect(rows[0].exposure_percent).toBe(50);

    await sessionsRepository.upsertHealthKitSession({
      date: '2025-01-15',
      duration_seconds: 2000,
      iu_gained: 800,
      uv_index: 4,
      synced_at: 'sync-2',
    });

    rows = getFakeDb().getTable('bask_sessions');
    expect(rows).toHaveLength(1); // no duplicate
    expect(rows[0].iu_gained).toBe(800);
    expect(rows[0].duration_seconds).toBe(2000);
    expect(rows[0].synced_at).toBe('sync-2');
  });

  it('getManualSessionDuration sums only manual sessions for a date', async () => {
    const today = getLocalDateKey(new Date());
    getFakeDb().reset({
      bask_sessions: [
        { id: 1, started_at: nowIso(), source: 'manual', duration_seconds: 300, iu_gained: 100, uv_index: 5, clothing_preset_id: 'x', exposure_percent: 40 },
        { id: 2, started_at: nowIso(), source: 'manual', duration_seconds: 120, iu_gained: 50, uv_index: 5, clothing_preset_id: 'x', exposure_percent: 40 },
        { id: 3, started_at: nowIso(), source: 'healthkit', duration_seconds: 9999, iu_gained: 9999, uv_index: 5, clothing_preset_id: 'x', exposure_percent: 40 },
      ],
    });

    expect(await sessionsRepository.getManualSessionDuration(today)).toBe(420);
  });

  it('getTodayTotalIU sums today across sources (empty -> 0)', async () => {
    expect(await sessionsRepository.getTodayTotalIU()).toBe(0);

    getFakeDb().reset({
      bask_sessions: [
        { id: 1, started_at: nowIso(), source: 'manual', iu_gained: 700 },
        { id: 2, started_at: nowIso(), source: 'healthkit', iu_gained: 300 },
      ],
    });

    expect(await sessionsRepository.getTodayTotalIU()).toBe(1000);
  });

  it('deleteHealthKitSession removes only healthkit rows for a date', async () => {
    const today = getLocalDateKey(new Date());
    getFakeDb().reset({
      bask_sessions: [
        { id: 1, started_at: nowIso(), source: 'manual', iu_gained: 100 },
        { id: 2, started_at: nowIso(), source: 'healthkit', iu_gained: 200 },
      ],
    });

    await sessionsRepository.deleteHealthKitSession(today);
    const rows = getFakeDb().getTable('bask_sessions');
    expect(rows).toHaveLength(1);
    expect(rows[0].source).toBe('manual');
  });
});
