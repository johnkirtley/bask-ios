# Morning Light feature — implementation plan

## Context

On the home screen the **Bask Now** button is enabled in any daylight (`effectiveUV > 0`), but between sunrise and the UV-3 "synthesis" threshold a started session logs **0 IU** (the shadow rule in `lib/dEngine.ts` returns 0 below UV 3) — a silent dead-end. Meanwhile after sunset the button is disabled, so the two low-value states are inconsistent.

Instead of a useless 0-IU session or a dead button, we lean into **morning light for circadian health** during the low-UV window, then **seamlessly morph** the same session into a vitamin D session the moment effective UV crosses 3. Reference: SunSeek's Morning Light → Vitamin D phases, but expressed through Bask's single adaptive hero rather than a stacked list.

### Decisions locked

- **Trigger/label — adaptive, bounded:** the low-UV daylight hero is always startable, but its framing changes by context and is *never* "Morning Light all day":
  - **Night / after sunset (`effectiveUV <= 0`):** button disabled — unchanged.
  - **Daylight, `0 < effectiveUV < 3`, vitamin D coming today** (`getSynthesisCountdown` non-null) **or** morning time-of-day → **Morning Light** framing with circadian copy + "vitamin D starts in N min".
  - **Daylight, `0 < effectiveUV < 3`, no synthesis coming (winter / heavy cloud, afternoon):** still startable as a generic **light/daylight** session, but with clear messaging "UV isn't strong enough for vitamin D right now — but getting sunlight still helps."
  - **`effectiveUV >= 3`:** normal **Bask / Vitamin D** — unchanged.
- **Mid-session morph:** one continuous session. When live effective UV crosses 3, IU starts accruing — no second session, no prompt, no double-logging.
- **Morph moment:** small celebratory beat (success haptic + brief visual accent) when vitamin D "switches on".
- **Persistence:** one session, logged normally; a session that never crosses UV 3 saves with `iu_gained: 0` and shows its duration in History. No separate streak/metric. No goal/streak impact — automatic, since the morning-light portion accrues 0 IU and only real (UV≥3) IU counts toward the goal.
- **Scope:** morning-only special case — small helpers, **no** reusable Morning→D→Evening phase engine. Evening Light is out of scope.

## UV basis & cross-app consistency (important)

**The entire feature keys off cloud-adjusted `effectiveUv(rawUv, cloudCover)` — never raw UV.** This is deliberate and matches the existing source of truth:

- `findSynthesisWindow` already filters on `effectiveUv(h.uvIndex, h.cloudCover) >= 3` (`lib/dWindowForecast.ts`), so `getSynthesisCountdown`'s "vitamin D in N min" copy is cloud-adjusted.
- `canStartSession` gates on `effectiveUV > 0`; the live session vitamin D math, DB storage, and HealthKit sync all use effective UV.

So the Morning Light phase boundary (`effectiveUv(...) >= 3`) and the morph trigger use the **same threshold** the forecast card already uses — no drift. **All new phase logic and copy must derive from effective UV, not `sunData.uvIndex`.**

### Two divergences to reconcile so messaging lines up everywhere

1. **Pre-existing bug to fix alongside this:** the "UV Now" stat displays **raw** UV (`uvIndex.toFixed(1)` in `components/home/ActiveSessionView.tsx`, and the home stat), while every gate/claim reasons on effective UV. On a cloudy morning this reads "UV Now 5" while the hero says "vitamin D not available yet" (effective ~2) — a direct contradiction. Fix: show effective UV in the stat (optionally annotate "5 → 2 with clouds"), or otherwise make the displayed number agree with the phase. Burn-risk time legitimately stays on raw UV (burn is sun angle, not synthesis) — leave that as-is.
2. **Forecast countdown vs live conditions:** `getSynthesisCountdown` is a forecast estimate (hourly cloud cover), but the morph fires on *live* current-moment effective UV. If clouds linger past the predicted time, reuse the app's existing distinction — when raw ≥ 3 but effective < 3, say **"Clouds are blocking vitamin D"** rather than **"UV is too low"** (pattern already in `app/page.tsx` timeToGoalSubtext and the ActiveSessionView cloud card). The Morning Light / low-UV copy should adopt the same raw-vs-effective phrasing split.

## Key technical insight & the trap

The morph is mostly a *presentation* change **plus one real accrual change**. Today the timer recomputes total IU as `calculateVitaminD(frozenUV, totalElapsedMinutes, …)` (`hooks/useBaskSession.ts`, timer effect). Frozen UV + growing minutes is monotonic, but it **cannot** be reused with live UV:

1. `calculateVitaminD` scales by `uvIndex/10` and applies a saturation taper — so `f(liveUV, totalMinutes)` can **decrease** when UV dips, ticking the counter backward (alarming).
2. Recomputing from *total elapsed* would **over-credit** the pre-threshold minutes: a session that sat at UV<3 for 30 min then crosses 3 would instantly jump as if all 30 min were synthesizing.

Fix: switch the active timer from "recompute total from frozen UV" to **incremental integration off live UV** — accumulate only the IU produced during each tick at the current effective UV. Monotonic by construction; only counts minutes where UV≥3.

This also resolves a latent inconsistency: `components/home/ActiveSessionView.tsx` already reads *live* UV for the "Clouds are blocking vitamin D" card while IU climbs off the *frozen* value — after this change the card and the number agree.

## Implementation chunks (sequenced, ship piece by piece)

Each chunk is independently reviewable and shippable; ordered by dependency. Edge cases (from the section below) are folded into the chunk where they belong so nothing is lost.

### Chunk 0 — UV display consistency (tiny, standalone, ship first)
De-risks every later contradiction by making the displayed UV agree with the gates. No dependency on anything else.
- [ ] Show cloud-adjusted **effective** UV in the "UV Now" stat (home + `components/home/ActiveSessionView.tsx`); keep burn-risk time on raw UV.
- [ ] Optional: annotate raw→effective when clouds cut it (e.g. "5 → 2").
- Verify: preview with a stubbed `cloudCover` — stat matches the synthesis gate.

### Chunk 1 — Live-UV incremental accrual (foundation, mostly invisible)
The one real behavior change; makes the morph mechanically correct and fixes the card-vs-counter inconsistency for *all* sessions. No morning-light UI yet.
- [ ] `lib/dEngine.ts`: extract `vitaminDRatePerMinute(...)`; reuse it in `calculateTimeToGoal`.
- [ ] `hooks/useBaskSession.ts`: integrate live effective UV per tick; monotonic accumulator; same logic in `appStateChange` reconcile.
- [ ] Edge: pause resets `lastAccrualAtMs` (#7); init `hasSynthesizedRef`/`morphCelebratedRef` from starting UV (#4, data side); backgrounded gap credited from hourly `uvCurve` (#6).
- [ ] Unit tests: monotonic across a UV dip; no back-credit of pre-threshold minutes; pause doesn't credit paused time.
- Verify: unit tests + preview simulating a UV rise mid-session (IU starts at the crossing, never ticks backward).

### Chunk 2 — Idle morning-light CTA (first visible value)
- [ ] New `lib/lightPhase.ts`: `getBaskCta({ rawUV, effectiveUV, timeOfDay, synthesisCountdownMin })` → `{ label, helper, variant }` (raw-vs-effective copy split, #3; morning-vs-generic label, #2).
- [ ] Wire into `app/page.tsx`; `components/home/BaskNowButton.tsx` renders phase-aware `label`/`helper` + subtle `morningLight` accent.
- [ ] Analytics: `phase_at_start` on `sessionStarted`.
- Verify: preview each band (morning pre-synthesis, cloudy midday, winter afternoon, after sunset).

### Chunk 3 — Active session phases + morph beat
Depends on Chunk 1 (accrual) and Chunk 2 (label helper).
- [ ] `components/home/ActiveSessionView.tsx`: pre-synthesis hero = timer + phase label; suppress the "Why is my IU at 0?" hint during intentional low-UV; sticky hero + once-only celebration (#1); time-of-day label degradation (#2); in-session raw-vs-effective subline (#3).
- [ ] Morph: success haptic + brief accent when `hasSynthesizedRef` first flips.
- [ ] Analytics: `morning_light_morphed`.
- Verify: preview the morph visuals; device for haptic.

### Chunk 4 — Live Activity / Dynamic Island phase (native iOS, last)
Native build + device-only testing; depends on the phase concept from Chunks 1/3.
- [ ] `ios/App/App/BaskSessionAttributes.swift`: `SynthesisPhase` enum + `phase` on `ContentState`.
- [ ] `lib/plugins/baskLiveActivity.ts`: `phase` on start/update options.
- [ ] `ios/App/App/BaskLiveActivityPlugin.swift`: read/forward `phase`.
- [ ] `ios/App/BaskWidgetExtension/BaskLiveActivityWidget.swift`: phase-conditional rendering (hide IU + show timer/label during morning light) across lock screen + Dynamic Island.
- [ ] `hooks/useBaskSession.ts`: init phase from starting UV; include in periodic/pause/resume updates; **immediate `updateActivity` push at morph**.
- Verify: device — lock screen shows "Morning light · elapsed" during low-UV, flips to "+IU" at the crossing.

## Implementation

### 1. `lib/dEngine.ts` — extract a marginal-rate helper

- Add `vitaminDRatePerMinute(uvIndex, exposurePercent, fitzpatrickType, age)` returning IU/min (0 if `uvIndex < 3`). The expression already exists inline in `calculateTimeToGoal` — factor it out and reuse it there to avoid drift.
- Saturation taper: v1 may integrate at the pre-saturation rate (the taper only matters past `timeToBurn`, by which point the sunburn-risk UI already dominates). Optional refinement: scale the marginal rate down once accumulated exposure minutes exceed `calculateTimeToBurn(uv, fitz)` using the same `POST_BURN_CEILING` shape. Note this as a follow-up, not a blocker.

### 2. `hooks/useBaskSession.ts` — live-UV incremental accrual + morph detection

- Add state/refs: `accumulatedIU` (drives `currentIU`), `lastAccrualAtMs`, and `synthesisActive` (whether last tick's live UV ≥ 3). Keep `elapsedSeconds` wall-clock as today.
- In the 1s timer:
  - Read `liveUV = sunDataRef.current.effectiveUV` (ref already kept live).
  - `dtMin = max(0, (now - lastAccrualAtMs)/60000)`; `rate = vitaminDRatePerMinute(liveUV, exposurePercent, fitz, age)`; `accumulatedIU += rate * dtMin` (× saturation factor if added); set `lastAccrualAtMs = now`.
  - `currentIU = Math.round(accumulatedIU)` — never decreases.
  - **Morph detection:** if `rate > 0 && !synthesisActive` → set a `justMorphed` flag (or fire success haptic here) once; update `synthesisActive`.
- Apply the same incremental integration in the `appStateChange` foreground-reconcile path: integrate the backgrounded gap once at the current live UV (accepted approximation — no historical UV while backgrounded; still better than today for the morph case).
- `startSession`: keep the `effectiveUV <= 0` guard so after-sunset stays blocked; stop relying on frozen `uvIndex` for accrual (it can remain in state for display/Live Activity). Initialize `lastAccrualAtMs = now`, `accumulatedIU = 0`.
- Expose a `phase`/`isSynthesizing` flag and a `justMorphed` signal (or surface via `currentIU` crossing 0) for the view.

### 3. `app/page.tsx` — adaptive idle CTA + props to the active view

- Add a small pure helper (e.g. `lib/lightPhase.ts`, kept special-cased) `getBaskCta({ effectiveUV, timeOfDay, synthesisCountdownMin })` → `{ label, helper, variant }`:
  - `effectiveUV >= 3` → `{ label: 'Bask Now', helper: 'Tap to start tracking your sun exposure', variant: 'vitaminD' }`.
  - `0 < effectiveUV < 3` and (synthesis coming or morning) → `{ label: 'Get your morning light', helper: synthesisCountdownMin != null ? 'Morning light now · vitamin D starts in {n} min' : "Great for your circadian rhythm — UV isn't strong enough for vitamin D yet", variant: 'morningLight' }`.
  - `0 < effectiveUV < 3` otherwise → `{ label: 'Start a light session', helper: "UV isn't strong enough for vitamin D right now — but getting sunlight still helps", variant: 'lowUv' }`.
- Compute `synthesisCountdownMin` from existing `getSynthesisCountdown(dWindowForecast?.todaySynthesis ?? null, now)`; `timeOfDay` already available.
- `canStartSession` stays `!isLoading && effectiveUV > 0` (after-sunset disabled, all daylight enabled). Pass the computed `label`/`helper`/`variant` into `BaskNowButton`.
- Pass to `ActiveSessionView`: `synthesisCountdownMinutes` and continue passing `uvIndex`/`cloudCover` (it derives live effective UV itself).

### 4. `components/home/BaskNowButton.tsx` — phase-aware copy/accent

- Accept `label`, `helper`, and `variant` props (keep `disabled`/`disabledReason` behavior). Render `label` on the button and `helper` below (replacing the hardcoded "Bask Now" / "Tap to start…").
- For `variant === 'morningLight'` apply a subtle accent shift (e.g. cooler/dawn gradient or a small sunrise glyph) — minimal, in keeping with the recent "calmer" visual work. Keep the gold gradient for `vitaminD`.

### 5. `components/home/ActiveSessionView.tsx` — phase hero + morph beat

- Derive live phase: `isSynthesizing = effectiveUv(uvIndex, cloudCover) >= 3`.
- **Make the "UV Now" stat agree with the phase:** display `effectiveUv(uvIndex, cloudCover)` (cloud-adjusted) instead of raw `uvIndex`, so the number never contradicts a "vitamin D not available yet" hero. Optionally show raw→effective when clouds are cutting it (e.g. "5 → 2"). Apply the same fix to the home "UV Now"/UV stat. Leave burn-risk time on raw UV.
- **Low-UV / morning-light phase (`!isSynthesizing`):** make the **timer** the hero with a "Morning light" label and a calm subline ("Vitamin D begins when UV rises" or "~N min until vitamin D" using `synthesisCountdownMinutes`), instead of "+0 IU Gained This Session".
- **Suppress the "Why is my IU staying at 0?" amber hint** while in the intentional low-UV phase — here 0 IU is expected, not a problem. (Keep it for the genuine cloud-blocked case where `uvIndex >= 3 && effective < 3`.)
- **Morph:** when `isSynthesizing` becomes true (track with a ref), swap the hero to the existing "+{currentIU} IU Gained" treatment, fire `Haptics.notification(Success)`, and play a brief accent animation (reuse `animate-fade-in` / a one-shot glow). Reuse the existing goal-celebration styling vocabulary for consistency.

### 6. Analytics (light touch)

- Add `phase_at_start` ('morning_light' | 'low_uv' | 'vitamin_d') to `ANALYTICS_EVENTS.sessionStarted` and a `morning_light_morphed` capture when the morph fires, to measure the feature.

### 7. Live Activity / Dynamic Island — morning-light phase (native iOS)

The lock-screen/Dynamic Island surface must not show "+0 IU" during morning light. Good news: the elapsed timer already renders natively and live via `Text(state.effectiveStartDate, style: .timer)` — so morning light is mostly *hiding IU + showing a phase label*, then flipping the phase on morph. The `ContentState` field names are a strict case-sensitive contract between Swift and the JS plugin params.

- **`ios/App/App/BaskSessionAttributes.swift`** — add a phase to `ContentState`:
  ```swift
  enum SynthesisPhase: String, Codable, Hashable { case morningLight; case vitaminD }
  var phase: SynthesisPhase
  ```
  Keep `isPaused` separate (pause can occur in either phase). All fields stay `Codable`/`Hashable`.
- **`lib/plugins/baskLiveActivity.ts`** — add `phase: 'morningLight' | 'vitaminD'` to `StartLiveActivityOptions` and `UpdateLiveActivityOptions`.
- **`ios/App/App/BaskLiveActivityPlugin.swift`** — read `phase` and forward into the `ContentState` on start/update.
- **`ios/App/BaskWidgetExtension/BaskLiveActivityWidget.swift`** — conditional rendering across lock screen + Dynamic Island expanded/compact/minimal:
  - `phase == .morningLight` → label "Morning light", show the live timer as the hero, **hide the IU value**.
  - `phase == .vitaminD` → current "+\(currentIU) IU" treatment.
- **`hooks/useBaskSession.ts`** — initialize `phase = startingEffectiveUV >= 3 ? 'vitaminD' : 'morningLight'`; include `phase` in the periodic (15s) `updateActivity` calls and the pause/resume calls; and **push an immediate `updateActivity` at the morph moment** (don't wait up to 15s) so the lock screen flips promptly in sync with the in-app celebration.
- **Xcode:** `BaskSessionAttributes.swift` must remain in both the App and BaskWidgetExtension "Compile Sources" build phases (it already is) so the new field compiles into both targets.

Note: `timeToBurnMinutes` is a static start-of-session attribute (raw UV) and is unchanged — acceptable for v1.

## Edge cases & state-machine handling

These resolve issues surfaced by tracing the live paths (UV rising, cloud-block, pause, background, start-in-D, winter no-synthesis day).

### Phase becomes sticky once a session morphs (prevents threshold flicker)
Near `effectiveUV ≈ 3`, cloud noise makes UV oscillate across the threshold. Track in `useBaskSession`:
- `hasSynthesizedRef` — latched `true` the first time live `effectiveUV >= 3`.
- `morphCelebratedRef` — guards the celebration so it fires **exactly once** per session.

Rules:
- **Hero (hysteresis):** once `hasSynthesizedRef` is true, always show the "+IU / vitamin D" hero for the rest of the session — even if effective dips < 3 (show the cloud-blocked card for the dip; do **not** revert to the morning-light hero). Only *before* the first crossing do we show the low-UV/morning-light hero.
- **Accrual is independent:** it pauses (rate 0) whenever live effective < 3 and resumes when ≥ 3, regardless of the hero. Always monotonic.

### Low-UV hero label degrades with time-of-day
Before the first crossing, the in-session low-UV hero uses the **same helper as the idle CTA**: `timeOfDay === 'morning'` → "Morning light"; otherwise generic "Daylight / light session." A pre-synthesis session that runs past the morning stops calling itself "Morning light."

### Don't celebrate sessions that start in synthesis
Initialize `hasSynthesizedRef = startingEffectiveUV >= 3` and `morphCelebratedRef = startingEffectiveUV >= 3` in `startSession`, mirroring the existing `startedAtOrOverGoalRef` guard in `ActiveSessionView`. A session that begins at effective ≥ 3 shows the +IU hero immediately and never fires the morph beat.

### Pause/resume must not credit paused time
The integrator credits `rate × (now − lastAccrualAtMs)`. On **resume**, reset `lastAccrualAtMs = now` (and set it in `startSession`). While paused the timer interval is cleared (no ticks), so the reset prevents the first post-resume tick from crediting the entire pause gap. The `appStateChange` foreground path already early-returns when `status !== 'active'`, so backgrounded-while-paused is safe.

### Reason copy splits raw vs effective (idle and in-session)
Give the CTA helper **both** `rawUV` and `effectiveUV`:
- `effectiveUV >= 3` → vitamin D.
- `0 < effectiveUV < 3` and `rawUV >= 3` → "Clouds are blocking vitamin D right now — but light still helps."
- `0 < effectiveUV < 3` and `rawUV < 3` → morning/low-sun copy ("vitamin D starts in N min" when countdown exists, else "sun isn't high enough yet — great for circadian light").
In-session, reuse the existing cloud-blocked card for the `rawUV >= 3` case and the morning-light subline for `rawUV < 3`.

### Backgrounded morph credits from the forecast, not the latest instant
On foreground reconcile, integrate the backgrounded interval by sampling the hourly `uvCurve` (already on `sunData`) across the gap — sum `rate(effectiveUv(hourUV, hourCloud)) × minutesInThatHour` — instead of crediting the whole gap at the current instant's UV (which would massively over-credit if UV rose during the gap). Fallback when forecast is unavailable: credit at the **lower** of (start-of-gap, end-of-gap) effective UV. Fire the morph celebration on foreground if the crossing happened while backgrounded and wasn't already celebrated.

### Minor / accepted
- **Sunburn countdown** stays on raw UV (conservative, unchanged); a thin-cloud morning may show both "morning light" and a burn countdown — acceptable.
- **Early risers** (>120 min before synthesis) see morning-light framing without a countdown until within 120 min (`getSynthesisCountdown` caps at 120) — accepted.
- **Evening wind-down** (a vitamin-D session drifting below effective 3 near sunset, with raw also < 3) stops accruing silently with no message — out of scope here (evening light), candidate for a later "sun's getting low" note.

## Files to modify

- `lib/dEngine.ts` — `vitaminDRatePerMinute` helper (+ reuse in `calculateTimeToGoal`).
- `hooks/useBaskSession.ts` — live-UV incremental accrual, morph detection, foreground reconcile.
- `app/page.tsx` — idle CTA copy via helper, props to active view.
- `components/home/BaskNowButton.tsx` — phase-aware label/helper/accent.
- `components/home/ActiveSessionView.tsx` — phase hero, suppress zero-IU hint, morph beat.
- New: `lib/lightPhase.ts` — small pure CTA-copy helper (special-cased, not a phase engine).
- `lib/plugins/baskLiveActivity.ts` — add `phase` to start/update options.
- `ios/App/App/BaskSessionAttributes.swift` — add `SynthesisPhase` enum + `phase` field to `ContentState`.
- `ios/App/App/BaskLiveActivityPlugin.swift` — read/forward `phase`.
- `ios/App/BaskWidgetExtension/BaskLiveActivityWidget.swift` — phase-conditional rendering (lock screen + Dynamic Island).

## Verification

- **Unit (fast, deterministic):** add tests for `vitaminDRatePerMinute` (0 below UV 3, positive ≥3) and a focused accrual test proving the integrator is **monotonic across a UV dip** and **does not back-credit** pre-threshold minutes (simulate ticks: UV 2 for 30 min → IU stays 0; UV jumps to 4 → IU climbs only from that point). Run with the repo's existing test runner.
- **Browser preview (`preview_start`):** the dev server can't change real WeatherKit UV, so drive the phases by temporarily stubbing `sunData.uvIndex`/`cloudCover` (or via `preview_eval`) to:
  1. effective UV between 0–3 in the morning → confirm idle hero shows "Get your morning light" + countdown copy; start a session → timer-hero, no "+0 IU", no zero-IU amber hint.
  2. Flip effective UV ≥ 3 mid-session → confirm IU starts climbing from 0 (not a jump crediting prior minutes), hero swaps to "+IU Gained", celebratory accent shows.
  3. effective UV 0–3, afternoon, no synthesis window → confirm generic "light session" copy with the "not strong enough for vitamin D… but sunlight still helps" message.
  4. effective UV 0 (after sunset) → button disabled.
  Use `preview_snapshot` for copy/structure and `preview_screenshot` for the morning-light vs morph visuals.
- **Device pass (manual, before ship):** haptics, Live Activity, and backgrounding ("pocket your phone") need a real device — verify the success haptic fires on morph and the accumulated IU survives a background/foreground cycle without ticking backward.
