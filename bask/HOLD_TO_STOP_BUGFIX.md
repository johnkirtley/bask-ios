# Hold-to-Stop Button — Bug Fix Plan

## Context
A "hold to stop" gesture was added to the live-session Stop button (commit `784cc2a`) to
prevent accidental pocket taps from ending a session. Users report two **separate** problems:

1. On the **first** press-and-hold, they feel the haptic "tap" but the session does **not**
   end. Releasing and holding **again** ends the session.
2. Even on a **successful** hold, there is **no visible progress fill** indicating the session
   is being stopped.

Both bugs live entirely in `bask/components/home/HoldToStopButton.tsx`. Wiring in
`ActiveSessionView.tsx` (`onHoldComplete={onEnd}` → `session.endSession`) is correct — no
changes needed there or in `useBaskSession.ts`.

## Bug 1 — first hold does nothing (`onPointerLeave` cancels the timer)
`handlePointerDown` calls `e.currentTarget.setPointerCapture(...)` (comment: *"Keep receiving
pointerup even if the finger drifts off the button"*). Pointer capture means the element keeps
receiving pointer events regardless of finger position — yet the button **also** wires
`onPointerLeave={cancelHold}` (line 71). These contradict each other.

On iOS WKWebView, `setPointerCapture` during `pointerdown` reliably dispatches a spurious
`pointerleave` (and any micro-drift of the finger fires it too). That immediately calls
`cancelHold`, which `clearTimeout`s the completion timer (→ `onHoldComplete()`/`endSession`
never fires) and resets `holding` to false. The light "press" haptic (line 55) has already
fired — that's the feedback the user feels before nothing happens. "Works the second time" is
the known iOS pointer-capture warm-up quirk where the spurious leave doesn't re-fire.

**Fix:** Remove `onPointerLeave={cancelHold}` from the `<button>`. Pointer capture already
guarantees `onPointerUp` (intentional release) and `onPointerCancel` (system interruption), so
cancelling on `pointerleave` is unnecessary and is the source of the bug.

## Bug 2 — fill never animates (CSS transition skipped on WebKit)
The progress fill `<span>` (lines 76-85) changes **both** its `transform`
(`scaleX(0)`→`scaleX(1)`) **and** its `transition` duration (`150ms`→`1500ms`) in the *same*
React commit. WebKit/WKWebView frequently skips a transition when the `transition` property and
the transitioned value change in the same frame — so the fill never sweeps, even when the hold
succeeds. (The `bg-ember-alert/15` color itself resolves fine in Tailwind v3.3.3; opacity is
not the problem.)

**Fix (chosen approach: "Bolder fill sweep"):** Drive the fill with a `requestAnimationFrame`
loop instead of a CSS transition, and increase the fill opacity so it's clearly visible.

- Add refs: `fillRef` (on the fill `<span>`), `rafRef`, `startRef`.
- On `pointerDown`: reset fill to `scaleX(0)`, record `startRef = performance.now()`, fire the
  light haptic, and start a rAF loop.
- Each frame: `progress = min((now - start) / holdDurationMs, 1)`, set
  `fillRef.current.style.transform = scaleX(progress)` directly. When `progress >= 1`, set
  `completedRef`, fire the success haptic, and call `onHoldComplete()` — this single loop now
  drives both the visual and completion, so they stay perfectly in sync (no separate
  `setTimeout`).
- `cancelHold`: `cancelAnimationFrame(rafRef.current)`; if not completed, briefly transition the
  fill back to `scaleX(0)` (a short `150ms` ease-out is safe here since only the value changes,
  not a mid-fill duration) and `setHolding(false)`.
- Cleanup: cancel any pending rAF on unmount (replace the existing `clearTimeout` cleanup).
- Visibility: bump the fill from `bg-ember-alert/15` to a clearly visible value
  (e.g. `bg-ember-alert/30`); keep it behind the `relative z-10` label.

Keep `holding` state only for the label text swap (`label` ↔ `holdLabel`) and the
release-cancel logic; the fill scale is now controlled imperatively via the ref.

## Files to modify
- `bask/components/home/HoldToStopButton.tsx` (only file).

## Verification
1. `cd bask && npm run lint` (+ `npm run build` / `tsc` if configured) — no type/lint regressions.
2. On device/simulator, start a live session and test the Stop button:
   - Press & hold → fill sweeps left→right over ~1.5s and is **clearly visible**.
   - Holding past the threshold ends the session **on the first attempt** (success haptic + session ends).
   - A quick tap (release before threshold) does **not** end the session and the fill resets.
   - Finger drifting slightly off the button during the hold still completes (pointer capture intact).
   - Repeat in the paused-state layout (compact "Stop" beside "Resume").
