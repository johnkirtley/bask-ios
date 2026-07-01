# Test Coverage — Critical Flows (Session Loop, Persistence, Notifications)

Date: 2026-06-30
Status: Shipped on branch `test/critical-flow-coverage`
Suite: **1147 tests**, all three gates green (`npm test`, `npm run test:all`, `npm run test:coverage`).

## Why

The existing test suite protected the pure calculation engine (D-engine, window forecasting, session accrual, streak math) but covered none of the glue that turns that math into a user-facing flow: the SQLite repositories, the notification orchestration, and the `useBaskSession` session loop. A green run gave no assurance that the session loop, data writes, or notification wiring hadn't regressed. This round closes that gap on the three flows you prioritized: **core session loop, persistence, notifications** (onboarding and subscription flows were explicitly out of scope).

## What was built

### Infrastructure (`bask/tests/_setup/`)

A jsdom + React Testing Layer test rig that loads automatically with the integration suite:

- **`fakeDb.ts`** — in-memory fake `SQLiteDBConnection` (`.query`/`.run`/`.execute`/`.executeSet`) with paren-aware SQL parsing. Handles the patterns the repos actually emit: `INSERT/UPDATE/DELETE/SELECT`, `COALESCE(SUM(col), 0)`, `INSERT OR IGNORE`, `ON CONFLICT(col) DO UPDATE`, `datetime('now')` literals, `NULL`, and `date(col,'localtime')` filters. Does **not** validate raw SQL syntax (accepted tradeoff — SQL correctness stays manual/native QA).
- **`capacitorMocks.ts`** — central `vi.mock` setup for `@capacitor/{core,haptics,app,browser,local-notifications}`, `@/lib/plugins` (BaskLiveActivity/Health/Weather), `@/lib/analytics` (real events taxonomy, stubbed `capture`), `inAppReviewService`, and `leaderboardService`. Includes a `vi.hoisted` fake-DB singleton with `setNative`/`resetBackend` toggles for use in `beforeEach`.
- **`localNotificationsMock.ts`** — inspectable LocalNotifications mock (records `schedule`/`cancel` calls, controllable permission state, captures `addListener` callbacks for OS-event simulation).
- **`notificationFixtures.ts`** — `DWindowForecast` builders dated "tomorrow" so notification times are always future-valid (the service skips within a 60s grace of now).
- **`jsdomSetup.ts`** — `@testing-library/jest-dom/vitest` matchers.

### Test files (102 new tests across 16 files)

**Persistence (51 tests)**
- `tests/persistence/streaksRepository.test.ts` — 10 tests covering the streak algebra: streak-start, milestone detection, milestone-rejection on repeat, streak-death after the grace day, grace-day survival, `lowGoalStreak` (<500 IU), no double-recording of a death, longest-streak monotonicity, plus `getGoalStreakSummary` hit/remaining/multi-day count.
- `tests/persistence/sessionsRepository.test.ts` — 9 tests: create defaults (`source='manual'`, 0 duration/IU, null notes), getById missing, update round-trip + no-op, delete, `upsertHealthKitSession` insert-then-update with correct healthkit defaults, `getManualSessionDuration` source filter, `getTodayTotalIU` empty + cross-source sum, `deleteHealthKitSession`.
- `tests/persistence/sessionPersistence.test.ts` (jsdom) — 8 tests: active+paused round-trip with Date rehydration, idle/completed clears the key, corrupt JSON blob rejected, missing-field blob rejected, non-restorable status rejected, clear behavior.
- `tests/persistence/resetRepository.test.ts` — 3 tests: all tables cleared + profile reset to defaults + localStorage cleared, notification-cancel + leaderboard-delete invoked, leaderboard failure non-fatal.
- `tests/persistence/streakStateRepository.test.ts` — 9 tests: defaults from empty, save/get round-trip, idempotent upsert, patch shallow-merge, corrupt-milestones recovery (string and array).
- `tests/persistence/userProfileRepository.test.ts` — 6 tests: null when empty, partial update, `setDailyGoal` writes profile AND goal snapshot, `clearBloodTest`, `resetBiologicalFields`.
- `tests/persistence/crudSmoke.test.ts` — 6 light smoke tests for settings/supplements/cofactors/lab (lower-priority repos).

**Notifications (29 tests)**
- `tests/notifications/reconcile.test.ts` — 9 tests: schedule path, denied-permission cancel, no-forecast cancel, non-premium cancel, dedupe via `reconcileKey`, `force:true` bypass, `applySettingsChange` re-reconciles from cached forecast, non-native no-op.
- `tests/notifications/scheduleCancel.test.ts` — 4 tests: builds the right notification list, disabled-settings short-circuit, denied-permission short-circuit, `cancelDWindowNotifications` cancels all 8 dwindow ids.
- `tests/notifications/streakRevival.test.ts` — 5 tests: schedules + patches `streakRevivalNotifFired`, guards for death <3, already fired, revival within 7 days, notifications disabled.
- `tests/notifications/useDWindowNotifications.test.tsx` — 3 tests: derived `streakContext` passed to reconcile, null context without summary, native guard short-circuits.
- `tests/notifications/NotificationBootstrap.test.tsx` — 3 tests: renders nothing, calls `registerHandlers` on mount, survives rejection (fire-and-forget).
- `tests/notifications/registerHandlers.test.ts` — 5 tests: action-type + listener registration, `streak_revival` received-listener patches state, non-revival events ignored, action-performed listener scrolls on home, idempotent (single registration per module instance).

**Session loop (11 tests)**
- `tests/session/useBaskSession.test.tsx` — All five actions + restore + persistence + foreground:
  - `startSession`: active transition, DB row, `sessionStarted` analytics, Medium haptic, sun-down guard.
  - `pauseSession` / `resumeSession`: state transitions, startTime adjustment past the pause gap, analytics events.
  - `endSession`: DB update, `leaderboardService.submitSession`, `recordReviewValueEvent`, `sessionEnded` analytics, Success haptic, returns the snapshot. DB-failure path returns null and leaves status active.
  - `cancelSession`: DB row deleted, state reset to idle, `sessionCancelled` analytics.
  - Restore-on-reclaim: rehydrates an active session from `localStorage` on mount.
  - Persistence effect: snapshots while active, clears on end and on cancel.
  - Foreground reconciliation: registers `appStateChange` listener; firing `isActive` doesn't crash and leaves status active.

The hook tests use `vi.useFakeTimers()` so the 1s and 15s intervals never auto-fire between assertions, and use `vi.spyOn(sessionsRepository, 'update')` (with explicit `mockRestore()`) to exercise the DB-failure path.

## How to run

```bash
npm test             # green gate — pure weather/vitamin-D logic (node, fast)
npm run test:watch   # watch mode for iterative development
npm run test:all     # full suite (adds jsdom integration tests)
npm run test:coverage # full suite + coverage gate (enforces thresholds)
```

`npm test` is the pre-Xcode check (catches calculation/messaging bugs). `npm run test:coverage` is the broader gate that protects the critical user-facing flows.

## Coverage numbers

Aggregate (priority files only — excludes intentionally-untested infra: mocked `connection.ts`, web-only `devSeed.ts`, DDL `schema.ts`, stub `localStorageMigration.ts`):

| File | % Stmts | % Branch | % Funcs | % Lines |
|---|---:|---:|---:|---:|
| `components/NotificationBootstrap.tsx` | 100 | 100 | 100 | 100 |
| `hooks/useDWindowNotifications.ts` | 100 | 100 | 100 | 100 |
| `lib/sessionPersistence.ts` | 83.3 | 88.2 | 100 | 92.9 |
| `lib/services/notificationService.ts` | 76.6 | 69.7 | 86.7 | 82.8 |
| `hooks/useBaskSession.ts` | 74.3 | 43.8 | 69.6 | 76.4 |
| Repositories (avg) | ~64 | ~54 | ~71 | ~67 |

**Gate thresholds** (enforced by `npm run test:coverage`): statements 55, branches 45, functions 55, lines 58. Current aggregate across the scoped files is **70% stmts / 58.7% branch / 75% funcs / 73% lines** — comfortably above the floor, so the gate locks in gains and catches real erosion.

The uncovered branches in `useBaskSession` are predominantly the Live Activity native paths. The test setup mocks the plugin, but this suite does not exercise or assert the Live Activity lifecycle; that behavior remains manual native QA.

## Known gaps (flagged, not fixed)

1. **Component smoke tests deferred** — the root `tsconfig` uses `jsx: "preserve"`, which blocks importing JSX components under the Vitest transform (esbuild/oxc overrides don't reach the import-analysis step). Hooks and services are covered directly. Enabling component tests requires a `tsconfig` `jsx` decision (e.g. `react-jsx`; low-risk since Next uses SWC for compilation and ignores this setting, but it's a shared-config change left for the team).
2. **Native-only paths** (Live Activity, real iOS notification delivery, native HealthKit) are not covered by this integration suite. They stay manual/native QA.
3. **Web-preview fallbacks** in the repositories (the `if (!Capacitor.isNativePlatform())` seed-data branches used during local dev) are not exercised by the integration tests, which run in the native path. Coverage drift on those branches is acceptable per scope.
4. **Ionic page interaction tests** (ActiveSessionView morph celebration, zero-IU tooltip, settings page toggle) are out of scope this round, per the "no deep Ionic renders" decision.

## Files changed

Modified:
- `bask/AGENTS.md` — documents the two test tiers and the coverage gate
- `bask/package.json` — adds `test:coverage` script
- `bask/package-lock.json` — jsdom, @testing-library/react, @testing-library/jest-dom, @vitest/coverage-v8
- `bask/vitest.config.ts` — excludes integration test dirs from the green gate
- `bask/vitest.all.config.ts` — `.tsx` includes, setupFiles, coverage config with thresholds

New:
- `bask/tests/_setup/` (7 files: fakeDb, capacitorMocks, localNotificationsMock, notificationFixtures, jsdomSetup, sanity, fakeDb.hardening)
- `bask/tests/persistence/` (7 files: streaks, sessions, sessionPersistence, reset, streakState, userProfile, crudSmoke)
- `bask/tests/notifications/` (6 files: reconcile, scheduleCancel, streakRevival, useDWindowNotifications, NotificationBootstrap, registerHandlers)
- `bask/tests/session/useBaskSession.test.tsx`
