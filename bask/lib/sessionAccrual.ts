import { vitaminDRatePerMinute } from './dEngine';
import type { FitzpatrickType } from './dEngine';

/**
 * Treat dt larger than this as a backgrounded gap (active ticks are ~1s apart).
 * Across such a gap we have no intermediate live-UV samples, so we credit IU at
 * the *lower* of the start-of-gap and current effective UV — a UV rise during the
 * gap can never be over-credited.
 */
export const BACKGROUND_GAP_MINUTES = 2;

/** Fields the integrator reads from the live session state. */
export interface AccrualInput {
  startTime: Date | null;
  exposurePercent: number;
  fitzpatrickType: FitzpatrickType;
  age: number | null;
  accumulatedIU: number;
  lastAccrualMs: number;
  lastAccrualEffUv: number;
  hasSynthesized: boolean;
}

/** The state slice the integrator produces each accrual. */
export interface AccrualResult {
  elapsedSeconds: number;
  accumulatedIU: number;
  currentIU: number;
  lastAccrualMs: number;
  lastAccrualEffUv: number;
  synthesizing: boolean;
  hasSynthesized: boolean;
}

/**
 * Pure incremental vitamin D integrator. Computes the next accrual slice from
 * `prev` only (no shared mutable state), so it is idempotent under React's
 * double-invoked updaters. Accrues only the IU produced since the last tick at the
 * current live effective UV:
 *   - Monotonic by construction — IU never decreases when UV dips.
 *   - Never back-credits pre-threshold minutes — IU stays 0 until effective UV >= 3,
 *     then climbs only from the crossing onward.
 *   - Pause-safe — callers reset `lastAccrualMs` on resume so paused time isn't credited.
 *   - Background-safe — a large dt is credited at the lower of start/now UV.
 */
export function integrateAccrual(
  prev: AccrualInput,
  liveEffectiveUv: number,
  nowMs: number,
): AccrualResult | null {
  if (!prev.startTime) return null;

  const newElapsed = Math.floor((nowMs - prev.startTime.getTime()) / 1000);
  const dtMin = Math.max(0, (nowMs - prev.lastAccrualMs) / 60000);
  const accrualUv =
    dtMin > BACKGROUND_GAP_MINUTES
      ? Math.min(prev.lastAccrualEffUv, liveEffectiveUv)
      : liveEffectiveUv;

  const rate = vitaminDRatePerMinute(
    accrualUv,
    prev.exposurePercent,
    prev.fitzpatrickType,
    prev.age,
  );
  const accumulatedIU = prev.accumulatedIU + rate * dtMin;

  // Phase is judged on the *live* UV (what the user is in now), independent of the
  // conservative gap-crediting used for the IU amount.
  const synthesizing =
    vitaminDRatePerMinute(
      liveEffectiveUv,
      prev.exposurePercent,
      prev.fitzpatrickType,
      prev.age,
    ) > 0;

  return {
    elapsedSeconds: newElapsed,
    accumulatedIU,
    currentIU: Math.round(accumulatedIU),
    lastAccrualMs: nowMs,
    lastAccrualEffUv: liveEffectiveUv,
    synthesizing,
    hasSynthesized: prev.hasSynthesized || synthesizing,
  };
}
