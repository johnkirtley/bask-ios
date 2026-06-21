'use client';

import { STORAGE_KEYS } from './constants';
import type { BaskSessionState } from '../hooks/useBaskSession';

/**
 * Persistence for an in-progress basking session.
 *
 * The session state lives only in React memory inside `useBaskSession`. If iOS
 * reclaims the suspended app process while a session is running, the web bundle
 * reloads fresh and the in-memory session is lost — the user lands on the home
 * screen and the session is never recorded. To survive that, we snapshot the
 * live session to localStorage (synchronous, mirrors `OnboardingContext`) and
 * restore it on the next mount.
 *
 * Only `active`/`paused` sessions are persisted. `idle`/`completed` clear the key
 * so an already-recorded or cancelled session is never falsely restored.
 */

/** Serialized shape: Dates are stored as ISO strings. */
type PersistedSession = Omit<BaskSessionState, 'startTime' | 'pausedAt'> & {
  startTime: string | null;
  pausedAt: string | null;
};

function isRestorableStatus(status: unknown): boolean {
  return status === 'active' || status === 'paused';
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isBool = (v: unknown): v is boolean => typeof v === 'boolean';

// Validate that parsed data matches the expected structure before trusting it.
// A partially-corrupt blob must NOT reach the integrator — e.g. a missing
// `fitzpatrickType`/`exposurePercent`/`age` would feed `undefined` into
// `vitaminDRatePerMinute` and produce `NaN` IU, so every field the integrator
// and downstream UI consume is checked here.
function isValidPersistedSession(obj: unknown): obj is PersistedSession {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  return (
    isRestorableStatus(o.status) &&
    typeof o.startTime === 'string' &&
    (o.pausedAt === null || typeof o.pausedAt === 'string') &&
    isNum(o.elapsedSeconds) &&
    isNum(o.uvIndex) &&
    isNum(o.rawUvIndex) &&
    typeof o.clothingPresetId === 'string' &&
    isNum(o.exposurePercent) &&
    isNum(o.fitzpatrickType) &&
    (o.age === null || isNum(o.age)) &&
    isNum(o.currentIU) &&
    isNum(o.accumulatedIU) &&
    isNum(o.lastAccrualMs) &&
    isNum(o.lastAccrualEffUv) &&
    isBool(o.synthesizing) &&
    isBool(o.hasSynthesized) &&
    isNum(o.projectedTimeToBurn) &&
    (o.sessionId === null || isNum(o.sessionId)) &&
    (o.liveActivityId === null || typeof o.liveActivityId === 'string')
  );
}

/**
 * Load and rehydrate a persisted in-progress session, or null if none/invalid.
 * Guarded for SSR (no `window`) so it is safe to call from a client-only mount
 * effect (see `useBaskSession`).
 */
export function loadPersistedSession(): BaskSessionState | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.activeSession);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (!isValidPersistedSession(parsed)) return null;
    return {
      ...parsed,
      startTime: parsed.startTime ? new Date(parsed.startTime) : null,
      pausedAt: parsed.pausedAt ? new Date(parsed.pausedAt) : null,
    } as BaskSessionState;
  } catch (e) {
    console.error('Failed to load persisted session:', e);
    return null;
  }
}

/** Snapshot an active/paused session. No-op (clears) for idle/completed. */
export function savePersistedSession(state: BaskSessionState): void {
  if (typeof window === 'undefined') return;
  if (!isRestorableStatus(state.status)) {
    clearPersistedSession();
    return;
  }
  try {
    const payload: PersistedSession = {
      ...state,
      startTime: state.startTime ? state.startTime.toISOString() : null,
      pausedAt: state.pausedAt ? state.pausedAt.toISOString() : null,
    };
    localStorage.setItem(STORAGE_KEYS.activeSession, JSON.stringify(payload));
  } catch (e) {
    console.error('Failed to persist session:', e);
  }
}

export function clearPersistedSession(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEYS.activeSession);
  } catch (e) {
    console.error('Failed to clear persisted session:', e);
  }
}
