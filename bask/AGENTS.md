# Project Agent Instructions

Linear is the source of truth for planned, deferred, and completed app work.

## Testing

There are two test tiers:

```bash
npm test             # green gate — pure weather/vitamin-D logic (node, fast)
npm run test:watch   # watch mode for iterative development
npm run test:all     # full suite (adds jsdom integration tests)
npm run test:coverage # full suite + coverage gate (enforces thresholds)
```

Tests live in `tests/`:

- **Pure-logic tests** (`.test.ts`, node env) cover the calculation engine in
  `lib/` — the D-engine, window forecasting, session accrual, streak math, etc.
  These are the green gate: run them before building in Xcode to catch
  calculation/messaging bugs early.
- **Integration tests** (`.test.{ts,tsx}` under `tests/persistence`,
  `tests/notifications`, `tests/session`) cover the critical user-facing flows:
  the SQLite persistence layer, the notification orchestration, and the
  `useBaskSession` session loop. They run under jsdom with Capacitor/SQLite
  mocked via `tests/_setup/` (loaded automatically by `vitest.all.config.ts`).
  Bugs previously caught by the test suite were documented in `tests/TRIAGE.md`;
  all have been resolved and their assertions promoted into the green gate.

The **coverage gate** (`npm run test:coverage`) enforces minimum coverage on the
persistence, notification, session-loop, and sessionPersistence modules so the
gap can't silently reopen. Note: React component smoke tests are deferred — the
root `tsconfig` uses `jsx: "preserve"`, which blocks importing JSX components
under the test transform; hooks and services are covered directly.
