# Bug Fix: Live basking sessions silently lost when iOS reclaims the app

**Branch:** `claude/live-session-recording-bug-68psu9`
**Files changed:** `bask/hooks/useBaskSession.ts`, `bask/lib/sessionPersistence.ts` (new), `bask/lib/constants.ts`

---

## 1. The reported symptom

> "Sometimes when I have a live session, then go back into the app, it just takes me to the home screen and the session is never recorded — almost like the app closes out of the session automatically."

Two things go wrong together: the user is bounced to the **home screen**, and the session is **never recorded** in history.

---

## 2. Root cause

A basking session lives **only in React `useState`** inside `useBaskSession.ts`:

```ts
const [state, setState] = useState<BaskSessionState>(INITIAL_STATE);
```

There was **no recovery path** for an in-progress session.

On iOS/Capacitor, normal short backgrounding preserves the JS context, so the existing foreground reconciliation (`appStateChange` listener) handles it — that's the happy path. But **intermittently** iOS terminates the suspended WKWebView process (memory pressure, or being backgrounded long enough). When the user returns, the web bundle reloads from scratch, and three things happen:

1. **Bounced to home.** `useBaskSession` remounts at `INITIAL_STATE`, so `session.isActive`/`isPaused` are `false`. `app/page.tsx` only renders `ActiveSessionView` when one of those is true (`page.tsx:713`), so it falls through to the idle home view.
2. **Session never recorded.** The session's row in `bask_sessions` was created at start with `ended_at = NULL` (`sessionsRepository.create`). Nothing ever reads incomplete sessions, so the row is **orphaned** and never finalized.
3. **Live Activity destroyed.** A mount effect called `BaskLiveActivity.endAllActivities()` unconditionally (`useBaskSession.ts:141-145`), killing the still-running lock-screen Live Activity (ActivityKit activities survive process death).

The **"sometimes"** in the report is the tell: this is the OS terminating the process, not a deterministic logic bug. "Almost like the app closes out of the session automatically" is literally what happened — the app *was* terminated, and there was no recovery.

---

## 3. The fix

Persist an in-progress session to `localStorage` (synchronous, mirrors the existing `OnboardingContext` pattern) and restore it synchronously on mount, reusing the existing pure integrator `integrateAccrual` (`lib/sessionAccrual.ts`) to catch the timer and IU back up.

### a. New helper — `bask/lib/sessionPersistence.ts`
- `savePersistedSession(state)` — writes the full session as JSON (Dates → ISO). Only persists `active`/`paused`; clears otherwise.
- `loadPersistedSession()` — SSR-guarded (`typeof window`), validates shape, rehydrates Dates. Returns `null` on anything unexpected.
- `clearPersistedSession()`.

### b. Synchronous restore (no home-screen flash)
```ts
const [state, setState] = useState(() => loadPersistedSession() ?? INITIAL_STATE);
```
Using a **lazy initializer** means the restored session is in state on the very first render, so `ActiveSessionView` shows immediately — the user never sees the home screen flash.

### c. Live Activity: re-sync instead of destroy
The on-mount effect is now conditional:
- **Normal cold start** (no session to restore): keep the original `endAllActivities()` cleanup of truly-orphaned activities.
- **Restoring**: push an `updateActivity` to re-sync the surviving Live Activity. If that rejects (the activity died with the process), start a fresh one and adopt its id.

### d. Persistence without a write-loop
The per-second timer mutates state every tick, so persisting on every change would mean ~1 write/sec. Instead:
- A **transition-keyed** effect persists only on durable changes (`status`, `sessionId`, `liveActivityId`, `hasSynthesized`, `pausedAt`, `startTime`).
- A **coarse 15s flush** snapshots `accumulatedIU` mid-session as belt-and-suspenders.

This is correct, not just cheap: `accumulatedIU` and `lastAccrualMs` are always saved together as a consistent pair, and `integrateAccrual` rebuilds elapsed/IU from `lastAccrualMs` on restore.

### e. Correct IU crediting across the gap (UV-0 race)
On a cold reload, `sunData.effectiveUV` starts at `0` until WeatherKit reloads (a second or two). The per-second timer also calls `integrateAccrual`, and whichever call fires first "consumes" the background gap by advancing `lastAccrualMs`. If the timer's first tick wins at UV 0, the whole gap gets credited as **zero IU**.

Fix: a `restorePendingRef` guard. While a restore's gap is pending **and** live UV is still 0, the timer only advances the displayed clock and leaves `lastAccrualMs` untouched, so the gap survives to be credited once at a real UV. (At genuinely-zero UV no IU accrues anyway, so holding is safe.) The flag is cleared on the first good-UV tick, and reset on `startSession`/`resumeSession` so it can't leak into a new/resumed session.

### f. No false restores
The persistence effect clears the key on **both** `idle` (cancel) and `completed` (end). This is important — `endSession` sets `status: 'completed'` (not `idle`), so without handling `completed` a finished session would be "restored" on the next cold start and risk double-recording.

---

## 4. Edge cases handled

| Case | Behavior |
|------|----------|
| Session ended normally, then cold relaunch | Key cleared on `completed` → home screen, no false restore |
| Session cancelled | Key cleared on `idle` |
| Paused session restored | Frozen elapsed restored verbatim; no reconciliation (timer is gated off while paused) |
| Live Activity died with the process | `updateActivity` rejects → fresh `startActivity` |
| Cold reload at UV 0 (WeatherKit not yet loaded) | Gap held by `restorePendingRef` until live UV; clock still advances |
| Genuinely zero-UV (evening) session | No IU accrues; elapsed time still advances |
| Web / non-Capacitor | `typeof window` guard in helper; all native calls already platform-gated |
| New session started after a leftover restore flag | `restorePendingRef` reset in `startSession` |

---

## 5. Out of scope (suggested follow-up)

Orphaned DB rows when `localStorage` is unavailable/cleared (rare). The `bask_sessions` row lacks the fields needed to restore a session (no `fitzpatrickType`, accumulators, `liveActivityId`, etc.), so `localStorage` is the source of truth for restore. Fabricating an `ended_at`/IU for an orphan would record garbage — a safer cleanup would **delete** abandoned open rows past a threshold rather than inventing completion data. Tracked separately.

---

## 6. Verification

**Automated (run and passing):**
- `npx tsc --noEmit` — clean
- `npx next lint` — no new warnings (the two reported pre-exist in unchanged code)
- `npm run build` — succeeds

**Manual (recommended on a real device / simulator before release):**
1. Start a session → background the app → **force-terminate via Xcode** (simulates iOS reclaim) → reopen.
   - ✅ Lands on the active session (not home), timer continues, Live Activity still present and updating.
   - ✅ End the session → it appears in History with correct duration/IU; no orphaned `ended_at = NULL` row.
2. Pause → terminate → reopen → session restores **paused** with frozen elapsed.
3. End a session normally → cold relaunch → home screen (no false restore).
4. Web smoke test (`npm run dev`): start a session, confirm `localStorage['bask_active_session']` is written, reload the page → session restores; End/Cancel → key cleared.
5. Confirm the warm background→foreground path (existing `appStateChange` reconciliation) still behaves.
