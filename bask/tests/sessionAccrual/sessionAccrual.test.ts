import { describe, it, expect } from 'vitest';
import { integrateAccrual, BACKGROUND_GAP_MINUTES, type AccrualInput } from '../../lib/sessionAccrual';

function baseInput(overrides: Partial<AccrualInput> = {}): AccrualInput {
  const startTime = new Date('2024-06-15T12:00:00.000Z');
  return {
    startTime,
    exposurePercent: 50,
    fitzpatrickType: 3,
    age: 30,
    accumulatedIU: 0,
    lastAccrualMs: startTime.getTime(),
    lastAccrualEffUv: 0,
    hasSynthesized: false,
    ...overrides,
  };
}

describe('integrateAccrual — null / no-session guard', () => {
  it('returns null when startTime is null', () => {
    const result = integrateAccrual(baseInput({ startTime: null }), 8, Date.now());
    expect(result).toBeNull();
  });
});

describe('integrateAccrual — Shadow Rule gating', () => {
  it('accrues 0 IU when effective UV < 3', () => {
    const start = new Date('2024-06-15T12:00:00.000Z');
    const oneMinLater = start.getTime() + 60_000;
    const result = integrateAccrual(
      baseInput({ startTime: start, lastAccrualMs: start.getTime() }),
      2.5,
      oneMinLater,
    );
    expect(result!.accumulatedIU).toBe(0);
    expect(result!.synthesizing).toBe(false);
  });

  it('starts accruing IU when effective UV >= 3', () => {
    const start = new Date('2024-06-15T12:00:00.000Z');
    const oneMinLater = start.getTime() + 60_000;
    const result = integrateAccrual(
      baseInput({ startTime: start, lastAccrualMs: start.getTime() }),
      5,
      oneMinLater,
    );
    expect(result!.accumulatedIU).toBeGreaterThan(0);
    expect(result!.synthesizing).toBe(true);
  });

  it('UV exactly 3.0 starts accruing (boundary)', () => {
    const start = new Date('2024-06-15T12:00:00.000Z');
    const oneMinLater = start.getTime() + 60_000;
    const result = integrateAccrual(
      baseInput({ startTime: start, lastAccrualMs: start.getTime() }),
      3.0,
      oneMinLater,
    );
    expect(result!.synthesizing).toBe(true);
    expect(result!.accumulatedIU).toBeGreaterThan(0);
  });
});

describe('integrateAccrual — monotonicity (IU never decreases)', () => {
  it('accumulated IU never goes down when UV drops', () => {
    const start = new Date('2024-06-15T12:00:00.000Z');
    const t1 = start.getTime() + 60_000;
    const t2 = t1 + 60_000;

    const r1 = integrateAccrual(
      baseInput({ startTime: start, lastAccrualMs: start.getTime() }),
      8,
      t1,
    )!;
    const r2 = integrateAccrual(
      baseInput({
        startTime: start,
        lastAccrualMs: t1,
        accumulatedIU: r1.accumulatedIU,
        lastAccrualEffUv: 8,
        hasSynthesized: true,
      }),
      2,
      t2,
    )!;

    expect(r2.accumulatedIU).toBeGreaterThanOrEqual(r1.accumulatedIU);
  });

  it('accumulated IU stays constant when UV is below threshold (no backsliding)', () => {
    const start = new Date('2024-06-15T12:00:00.000Z');
    const t1 = start.getTime() + 60_000;
    const t2 = t1 + 60_000;

    const r1 = integrateAccrual(
      baseInput({ startTime: start, lastAccrualMs: start.getTime() }),
      8,
      t1,
    )!;
    const r2 = integrateAccrual(
      baseInput({
        startTime: start,
        lastAccrualMs: t1,
        accumulatedIU: r1.accumulatedIU,
        lastAccrualEffUv: 8,
        hasSynthesized: true,
      }),
      1,
      t2,
    )!;

    expect(r2.accumulatedIU).toBe(r1.accumulatedIU);
  });
});

describe('integrateAccrual — background gap handling', () => {
  it('uses the LOWER UV across a large gap (> 2 min)', () => {
    const start = new Date('2024-06-15T12:00:00.000Z');
    const gapMs = (BACKGROUND_GAP_MINUTES + 1) * 60_000;
    const afterGap = start.getTime() + gapMs;

    const resultHighStart = integrateAccrual(
      baseInput({
        startTime: start,
        lastAccrualMs: start.getTime(),
        lastAccrualEffUv: 10,
      }),
      4,
      afterGap,
    )!;

    const resultLowStart = integrateAccrual(
      baseInput({
        startTime: start,
        lastAccrualMs: start.getTime(),
        lastAccrualEffUv: 4,
      }),
      10,
      afterGap,
    )!;

    expect(resultHighStart.accumulatedIU).toBeCloseTo(resultLowStart.accumulatedIU, 1);
  });

  it('uses the LIVE UV for short gaps (< 2 min)', () => {
    const start = new Date('2024-06-15T12:00:00.000Z');
    const shortGap = start.getTime() + 30_000;

    const result = integrateAccrual(
      baseInput({
        startTime: start,
        lastAccrualMs: start.getTime(),
        lastAccrualEffUv: 2,
      }),
      8,
      shortGap,
    )!;

    const expectedRate = (8 / 10) * (50 / 100) * (1 / 3.0) * 0.8 * 1500;
    const expectedIU = expectedRate * 0.5;
    expect(result.accumulatedIU).toBeCloseTo(expectedIU, 0);
  });
});

describe('integrateAccrual — elapsed time', () => {
  it('computes elapsed seconds from startTime to now', () => {
    const start = new Date('2024-06-15T12:00:00.000Z');
    const ninetySecondsLater = start.getTime() + 90_000;

    const result = integrateAccrual(
      baseInput({ startTime: start, lastAccrualMs: start.getTime() }),
      5,
      ninetySecondsLater,
    )!;

    expect(result.elapsedSeconds).toBe(90);
  });

  it('floors partial seconds', () => {
    const start = new Date('2024-06-15T12:00:00.000Z');
    const pointFiveSecondsLater = start.getTime() + 500;

    const result = integrateAccrual(
      baseInput({ startTime: start, lastAccrualMs: start.getTime() }),
      5,
      pointFiveSecondsLater,
    )!;

    expect(result.elapsedSeconds).toBe(0);
  });
});

describe('integrateAccrual — hasSynthesized flag', () => {
  it('sets hasSynthesized to true once synthesizing occurs', () => {
    const start = new Date('2024-06-15T12:00:00.000Z');
    const t1 = start.getTime() + 60_000;
    const result = integrateAccrual(
      baseInput({ startTime: start, lastAccrualMs: start.getTime() }),
      8,
      t1,
    )!;
    expect(result.hasSynthesized).toBe(true);
  });

  it('preserves hasSynthesized = true even when UV later drops', () => {
    const start = new Date('2024-06-15T12:00:00.000Z');
    const t2 = start.getTime() + 120_000;

    const result = integrateAccrual(
      baseInput({
        startTime: start,
        lastAccrualMs: start.getTime(),
        accumulatedIU: 500,
        lastAccrualEffUv: 8,
        hasSynthesized: true,
      }),
      1,
      t2,
    )!;

    expect(result.hasSynthesized).toBe(true);
  });

  it('hasSynthesized stays false when UV never reaches 3', () => {
    const start = new Date('2024-06-15T12:00:00.000Z');
    const t1 = start.getTime() + 60_000;
    const result = integrateAccrual(
      baseInput({ startTime: start, lastAccrualMs: start.getTime() }),
      2,
      t1,
    )!;
    expect(result.hasSynthesized).toBe(false);
  });
});

describe('integrateAccrual — synthesizing flag (live UV)', () => {
  it('synthesizing reflects LIVE UV, not gap-crediting UV', () => {
    const start = new Date('2024-06-15T12:00:00.000Z');
    const gapMs = (BACKGROUND_GAP_MINUTES + 1) * 60_000;
    const afterGap = start.getTime() + gapMs;

    const result = integrateAccrual(
      baseInput({
        startTime: start,
        lastAccrualMs: start.getTime(),
        lastAccrualEffUv: 10,
      }),
      2,
      afterGap,
    )!;

    expect(result.synthesizing).toBe(false);
  });
});

describe('integrateAccrual — currentIU rounding', () => {
  it('currentIU is the rounded version of accumulatedIU', () => {
    const start = new Date('2024-06-15T12:00:00.000Z');
    const t1 = start.getTime() + 60_000;
    const result = integrateAccrual(
      baseInput({ startTime: start, lastAccrualMs: start.getTime() }),
      7,
      t1,
    )!;
    expect(result.currentIU).toBe(Math.round(result.accumulatedIU));
  });
});
