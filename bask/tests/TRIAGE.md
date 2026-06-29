# Test Triage — Bugs Discovered by Test Suite

> **Status: All clear.** Every triage bug below has been fixed and its assertion
> promoted into the green-gate suite (`npm test`). This file is kept as a
> historical record of the bugs the test suite caught.

## Run the suite
```bash
npm test             # green gate (pre-Xcode check) — includes the former triage cases
npm run test:all     # everything (triage dir is now empty/removed)
```

---

## ✅ Resolved — Bug #1 — `formatDurationMinutes` rounded to "60m" instead of "1h"

**Severity:** Low (cosmetic display)
**File:** `lib/dEngine.ts` (`formatDurationMinutes`)

### Problem
`formatDurationMinutes(59.7)` returned `"60m"` instead of `"1h"`. The function
branched on `minutes >= 60` *before* rounding, so `59.7` took the `< 60` branch
and then `Math.round(59.7)` produced `60` → `"60m"`.

### Fix
Round first, then branch on the rounded value. Any value that rounds to 60+
minutes now displays as `"1h"`.

### Coverage
`tests/dEngine/formatting.test.ts > formatDurationMinutes > "treats sub-hour
values that round up to 60 as '1h'"`

---

## ✅ Resolved — Bug #2 — "Perfect sun right now!" recommendation was unreachable

**Severity:** High (dead feature — users never saw this message)
**File:** `lib/dWindowForecast.ts` (`isNowInOpportunityWindow`)

### Problem
The message required `isNowInOpportunityWindow(today, now)` to be true, i.e.
`now >= windowStartTime`. But `windowStartTime` is always set to
`recommendedStartAt = max(naturalStart, sameDayStart)`, and `sameDayStart`
(`roundedSameDayRecommendationStart`) always pushes at least 5 minutes into the
future. So for today, `now >= windowStartTime` could never be true.

### Fix
`isNowInOpportunityWindow` now floors the parsed `windowStartTime` back to the
top of the hour, recovering the natural UV-viable band start (today's displayed
start is the natural hour boundary rounded up by the same-day lead). Tomorrow
windows are already on the hour, so the floor is a no-op for them.

### Coverage
`tests/dWindowForecast/generateRecommendations.test.ts > "Perfect sun right
now!" > "appears when effective UV >= 5 and the user is inside the natural band"`

---

## ✅ Resolved — Bug #3 — "UV is weak this week" recommendation was unreachable

**Severity:** Medium (dead code path — users never saw this message)
**File:** `lib/dWindowForecast.ts` (`generateRecommendations`)

### Problem
The message was guarded by `!isLowUvScenario`, where
`isLowUvScenario = maxForecastedUV < 3 || clouds-blocking`. Any forecast below
the synthesis threshold (UV < 3) was tagged `isLowUvScenario`, which suppressed
the "weak this week" alert and instead showed the harsher "too weak /
supplement" action — even for the marginal 2–3 band where the softer alert was
intended.

### Fix
Introduced `WEAK_UV_SYNTHESIS_FLOOR = 2` and changed the UV condition in
`isLowUvScenario` from `< 3` to `<= WEAK_UV_SYNTHESIS_FLOOR`. Now:
- UV ≤ 2 → "UV too weak for vitamin D synthesis" (negligible → supplement)
- UV 2–3 → "UV is weak this week" (marginal → limited D production)

The winter golden scenario (UV peaks at 2.0) still correctly surfaces the
"too weak" action.

### Coverage
`tests/dWindowForecast/generateRecommendations.test.ts > "UV is weak this week"
> "appears for sustained marginal UV (2–3)..."`
