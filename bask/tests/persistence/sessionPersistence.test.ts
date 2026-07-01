// @vitest-environment jsdom
/**
 * sessionPersistence — crash-recovery layer for in-progress sessions.
 * Covers save/load round-trip with Date rehydration, status gating
 * (idle/completed clears), and rejection of corrupt/invalid blobs.
 */
import { describe, it, expect, beforeEach } from 'vitest';

import {
  loadPersistedSession,
  savePersistedSession,
  clearPersistedSession,
} from '@/lib/sessionPersistence';
import { STORAGE_KEYS } from '@/lib/constants';
import type { BaskSessionState } from '@/hooks/useBaskSession';
import { resetBackend } from '../_setup/capacitorMocks';

function activeState(overrides: Partial<BaskSessionState> = {}): BaskSessionState {
  return {
    status: 'active',
    startTime: new Date('2025-06-15T12:00:00.000Z'),
    pausedAt: null,
    elapsedSeconds: 120,
    uvIndex: 5,
    rawUvIndex: 6,
    clothingPresetId: 'tshirt',
    exposurePercent: 40,
    fitzpatrickType: 3,
    age: 30,
    currentIU: 250,
    accumulatedIU: 250.4,
    lastAccrualMs: Date.now(),
    lastAccrualEffUv: 4.5,
    synthesizing: true,
    hasSynthesized: true,
    projectedTimeToBurn: 45,
    sessionId: 7,
    liveActivityId: 'abc-123',
    ...overrides,
  };
}

describe('sessionPersistence', () => {
  beforeEach(() => {
    localStorage.clear();
    resetBackend();
  });

  it('round-trips an active session and rehydrates Date fields', () => {
    const original = activeState();
    savePersistedSession(original);

    const loaded = loadPersistedSession();
    expect(loaded).not.toBeNull();
    expect(loaded!.status).toBe('active');
    expect(loaded!.startTime).toBeInstanceOf(Date);
    expect(loaded!.startTime!.toISOString()).toBe('2025-06-15T12:00:00.000Z');
    expect(loaded!.currentIU).toBe(250);
    expect(loaded!.sessionId).toBe(7);
  });

  it('round-trips a paused session (pausedAt rehydrates to a Date)', () => {
    savePersistedSession(activeState({ status: 'paused', pausedAt: new Date('2025-06-15T12:05:00.000Z') }));

    const loaded = loadPersistedSession();
    expect(loaded!.status).toBe('paused');
    expect(loaded!.pausedAt).toBeInstanceOf(Date);
    expect(loaded!.pausedAt!.toISOString()).toBe('2025-06-15T12:05:00.000Z');
  });

  it('savePersistedSession clears for idle/completed status', () => {
    savePersistedSession(activeState());
    expect(localStorage.getItem(STORAGE_KEYS.activeSession)).not.toBeNull();

    savePersistedSession(activeState({ status: 'completed' }));
    expect(localStorage.getItem(STORAGE_KEYS.activeSession)).toBeNull();

    savePersistedSession(activeState({ status: 'idle' }));
    expect(localStorage.getItem(STORAGE_KEYS.activeSession)).toBeNull();
  });

  it('returns null when no session is stored', () => {
    expect(loadPersistedSession()).toBeNull();
  });

  it('rejects a corrupt JSON blob', () => {
    localStorage.setItem(STORAGE_KEYS.activeSession, '{not valid json');
    expect(loadPersistedSession()).toBeNull();
  });

  it('rejects a blob missing required numeric fields', () => {
    const bad = activeState();
    delete (bad as any).currentIU;
    localStorage.setItem(STORAGE_KEYS.activeSession, JSON.stringify({ ...bad, startTime: bad.startTime!.toISOString() }));

    expect(loadPersistedSession()).toBeNull();
  });

  it('rejects a blob with a non-restorable status', () => {
    const bad = { ...activeState(), status: 'idle', startTime: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEYS.activeSession, JSON.stringify(bad));
    expect(loadPersistedSession()).toBeNull();
  });

  it('clearPersistedSession removes the key', () => {
    savePersistedSession(activeState());
    clearPersistedSession();
    expect(localStorage.getItem(STORAGE_KEYS.activeSession)).toBeNull();
    expect(loadPersistedSession()).toBeNull();
  });
});
