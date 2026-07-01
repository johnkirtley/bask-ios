// @vitest-environment jsdom
/** Light CRUD smoke for the lower-risk repositories (settings, supplements, cofactors, lab). */
import { describe, it, expect, beforeEach } from 'vitest';

import { settingsRepository } from '@/lib/database/repositories/settingsRepository';
import { supplementsRepository } from '@/lib/database/repositories/supplementsRepository';
import { cofactorsRepository } from '@/lib/database/repositories/cofactorsRepository';
import { labResultsRepository } from '@/lib/database/repositories/labResultsRepository';
import { resetBackend } from '../_setup/capacitorMocks';

describe('settingsRepository (CRUD smoke)', () => {
  beforeEach(() => resetBackend());

  it('set/get/delete + getAll', async () => {
    expect(await settingsRepository.get('missing')).toBeNull();
    await settingsRepository.set('a', '1');
    await settingsRepository.set('b', '2');
    expect(await settingsRepository.get('a')).toBe('1');

    const all = await settingsRepository.getAll();
    expect(all).toEqual({ a: '1', b: '2' });

    await settingsRepository.delete('a');
    expect(await settingsRepository.get('a')).toBeNull();
  });
});

describe('supplementsRepository (CRUD smoke)', () => {
  beforeEach(() => resetBackend());

  it('create + getTodayTotalIU + delete', async () => {
    expect(await supplementsRepository.getTodayTotalIU()).toBe(0);
    const id = await supplementsRepository.create(1000);
    expect(id).toBeGreaterThan(0);
    expect(await supplementsRepository.getTodayTotalIU()).toBe(1000);

    await supplementsRepository.delete(id);
    expect(await supplementsRepository.getTodayTotalIU()).toBe(0);
  });

  it('update edits dosage and notes', async () => {
    const id = await supplementsRepository.create(500);
    await supplementsRepository.update(id, { dosage_iu: 750, notes: 'with food' });
    const [today] = await supplementsRepository.getToday();
    expect(today.dosage_iu).toBe(750);
    expect(today.notes).toBe('with food');
  });
});

describe('cofactorsRepository (CRUD smoke)', () => {
  beforeEach(() => resetBackend());

  it('create + hasLoggedToday + delete', async () => {
    expect(await cofactorsRepository.hasLoggedToday('magnesium')).toBe(false);
    const id = await cofactorsRepository.create('magnesium');
    expect(await cofactorsRepository.hasLoggedToday('magnesium')).toBe(true);
    expect(await cofactorsRepository.hasLoggedToday('vitamin_k2')).toBe(false);

    await cofactorsRepository.delete(id);
    expect(await cofactorsRepository.hasLoggedToday('magnesium')).toBe(false);
  });
});

describe('labResultsRepository (CRUD smoke)', () => {
  beforeEach(() => resetBackend());

  it('create normalizes to ng/mL and getLatest returns most recent', async () => {
    await labResultsRepository.create({ value: 30, unit: 'ng/mL', testDate: '2025-01-01' });
    await labResultsRepository.create({ value: 40, unit: 'ng/mL', testDate: '2025-02-01' });

    const latest = await labResultsRepository.getLatest();
    expect(latest).not.toBeNull();
    expect(latest!.test_date).toBe('2025-02-01');
    expect(latest!.value_ng_ml).toBe(40);
  });

  it('getByDateRange filters and sorts oldest-first', async () => {
    await labResultsRepository.create({ value: 10, unit: 'ng/mL', testDate: '2025-01-01' });
    await labResultsRepository.create({ value: 20, unit: 'ng/mL', testDate: '2025-02-01' });
    await labResultsRepository.create({ value: 30, unit: 'ng/mL', testDate: '2025-03-01' });

    const range = await labResultsRepository.getByDateRange('2025-01-15', '2025-02-15');
    expect(range).toHaveLength(1);
    expect(range[0].test_date).toBe('2025-02-01');
  });
});
