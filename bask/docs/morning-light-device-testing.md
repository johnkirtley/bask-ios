# Morning Light — on-device test checklist

These paths can't be exercised in the web preview (no WeatherKit, no SQLite sessions,
no Live Activity, no haptics, no real backgrounding). Run them on a physical iOS device
with Live Activities enabled. The pure accrual math + idle CTA states are already covered
by `scripts/scenario-tests/*.mts` and were verified in the browser preview.

## Setup
- [ ] Physical iPhone, iOS 16.2+, Live Activities enabled (Settings → Bask).
- [ ] Location permission granted so WeatherKit returns live UV + cloud cover.
- [ ] Ideally test across a real day, or use a low-UV morning + a high-UV midday.

## 1. Morning light → vitamin D morph (the headline flow)
- [ ] Open the app in the morning while **effective UV < 3**. Idle hero shows **"Get morning light"** with the sunrise glyph + dawn gradient; helper shows the circadian copy or **"vitamin D starts in N min"** if a synthesis window is coming.
- [ ] Start the session. Active screen shows the **timer as the hero** under a **"MORNING LIGHT"** label, with a subline (countdown / "Vitamin D begins when the sun climbs higher"). **No "+0 IU"**, and **no "Why is my IU at 0?" hint** after 60s.
- [ ] When effective UV crosses 3 (sun climbs / clouds clear), confirm:
  - [ ] The **"☀️ Vitamin D activated"** celebration appears (≈3s).
  - [ ] A **success haptic** fires at that moment.
  - [ ] The hero switches to **"+IU Gained This Session"** and IU starts climbing **from 0** (it does not jump to credit the pre-threshold minutes).

## 2. IU accrual correctness (live UV)
- [ ] During vitamin D, IU climbs smoothly and **never ticks backward** when a cloud passes (it holds flat, then resumes).
- [ ] "UV Now" stat shows **effective** (cloud-adjusted) UV, and agrees with whether IU is accruing. When clouds dim it, it shows "Raw UV X · clouds dimming"; when fully blocking (raw ≥ 3, effective < 3) it shows "Vitamin D blocked by clouds".
- [ ] Pause for a minute, resume → the paused time is **not** credited as IU (counter doesn't jump on resume).
- [ ] End a pure morning-light session that never reached UV 3 → it saves with **0 IU** and shows its **duration** in History, and does **not** change the daily goal/streak.

## 3. Backgrounding ("pocket your phone")
- [ ] Start a session, lock the phone / background the app for several minutes during vitamin D, return → IU reconciles forward and the timer is correct (no backward tick).
- [ ] Start in **morning light**, background it, and let UV cross 3 while backgrounded. On return, IU is credited **conservatively** (not the whole gap at the latest UV) and the morph celebration fires once if it hadn't already.

## 4. Live Activity / Dynamic Island (native)
- [ ] On session start in morning light: Lock Screen + Dynamic Island show **"Morning light"** with the **sunrise icon** and the **timer** — **no "0 IU"** (a sunrise glyph sits where IU normally is).
- [ ] At the morph, the Live Activity flips **promptly** (not after a 15s lag) to the **sun icon + "Basking" + accumulating IU**.
- [ ] Compact + minimal Dynamic Island presentations use the sunrise icon during morning light, sun icon during vitamin D.
- [ ] Pause/resume reflects correctly in the Live Activity in both phases.
- [ ] Sessions that **start** already in vitamin D show the IU view immediately and **never** show a morning-light morph.

## 5. Idle CTA states (real conditions)
- [ ] **After sunset / before sunrise** (no daylight): button disabled, "No daylight right now — check back when the sun's up".
- [ ] **Cloudy midday / winter afternoon** (effective UV < 3, not morning): **"Get some light"**, muted gradient, "...but getting sunlight still helps".
- [ ] **Effective UV ≥ 3**: normal **"Bask Now"**, gold gradient.
- [ ] Every CTA label stays on **one line** (no wrapping) across device sizes and Dynamic Type.

## 6. Regression sanity
- [ ] A normal high-UV session (start and stay ≥ 3) behaves exactly as before: IU accrues, goal progress + goal-reached celebration work, sunburn countdown works.
- [ ] Leaderboard/HealthKit sync of completed sessions still works.

## Notes / known v1 scope
- IU integration omits the post-burn diminishing-returns taper (matches the old model for any session shorter than time-to-burn). Follow-up if needed.
- `timeToBurnMinutes` in the Live Activity stays a start-of-session value (raw UV) — unchanged.
