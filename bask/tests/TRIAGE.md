# Test Triage — Bugs Discovered by Test Suite

These tests currently fail because they assert **correct expected behavior** that the code does not yet produce. Each is a real bug, not a test error.

## Run the suite
```bash
npm test             # green gate (pre-Xcode check) — excludes triage
npm run test:triage  # known-bug assertions only
npm run test:all     # everything including triage
```

## Bug #1 — `formatDurationMinutes` rounds to "60m" instead of "1h"

**Severity:** Low (cosmetic display)
**File:** `lib/dEngine.ts:256-264`

### Problem
`formatDurationMinutes(59.7)` returns `"60m"` instead of `"1h"`. The function rounds sub-hour values before checking the `>= 60` threshold:

```ts
if (minutes >= 60) {          // 59.7 < 60, takes the else branch
  // ...
}
return `${Math.round(minutes)}m`;  // Math.round(59.7) = 60 → "60m"
```

### Expected
Any value that rounds to 60+ minutes should display as "1h" (or "1h 0m" → "1h"), not "60m".

### Fix
Round first, then branch:
```ts
const rounded = Math.round(minutes);
if (!isFinite(rounded) || rounded <= 0) return '—';
if (rounded >= 60) { ... }
return `${rounded}m`;
```

### Test
`tests/dEngine/formatting.test.ts > formatDurationMinutes > TRIAGE: 59.7 min rounds to "60m" instead of "1h"`

---

## Bug #2 — "Perfect sun right now!" recommendation is unreachable

**Severity:** High (dead feature — users never see this message)
**File:** `lib/dWindowForecast.ts:939-955` (generateRecommendations) + `dWindowForecast.ts:489-495` (roundedSameDayRecommendationStart)

### Problem
The "Perfect sun right now!" message requires `isNowInOpportunityWindow(today, now)` to return true, meaning `now >= windowStartTime`. But `windowStartTime` is always set to `recommendedStartAt`, which is `max(naturalWindowStart, sameDayStart)`. And `sameDayStart` = `roundedSameDayRecommendationStart(now)` always pushes **at least 5 minutes into the future** from `now`:

```ts
const earliest = new Date(now.getTime() + SAME_DAY_RECOMMENDATION_LEAD_MINUTES * 60_000); // now + 5min
const intervalMs = SAME_DAY_RECOMMENDATION_ROUNDING_MINUTES * 60_000; // 5min
return new Date(Math.ceil(earliest.getTime() / intervalMs) * intervalMs); // rounds UP
```

Since `generateRecommendations` is called inside `calculateOptimalWindows` with the same `now`, `windowStartTime` is always > `now`. The condition `now >= windowStartTime` can **never** be true.

### Expected
When effective UV >= 5 and the user is currently inside the day's viable basking hours, they should see "Perfect sun right now!" instead of "Good UV today from {future time}".

### Fix options
1. Compare against the **natural** window start (before same-day rounding), not the recommended start
2. Use a tolerance: `now >= windowStartTime - SOME_TOLERANCE`
3. Check `isInSynthesisWindow(synthesis, now)` instead of `isNowInOpportunityWindow`

### Test
`tests/dWindowForecast/generateRecommendations.test.ts > "Perfect sun right now!" > TRIAGE: appears unreachable...`

---

## Bug #3 — "UV is weak this week" recommendation appears unreachable

**Severity:** Medium (dead code path — users never see this message)
**File:** `lib/dWindowForecast.ts:1023-1032`

### Problem
The "UV is weak this week" message requires:
- `efficiency === 'poor'` (best effective UV < 2)
- `!isLowUvScenario` (maxForecastedUV >= 3 AND noWindowReason !== 'clouds-blocking')
- `!isExposureLimited` (noWindowReason !== 'low-exposure')

But these conditions are contradictory:
- If best effective UV < 2, no hour has effective UV >= 3
- If raw UV >= 3 (required for !isLowUvScenario), `determineNoWindowReason` will find that effective UV < 3 → returns `'clouds-blocking'`
- If raw UV < 3, then maxForecastedUV < 3 → `isLowUvScenario` is true → message skipped

The only escape hatch would be `reconcileExposureReason` turning 'low-exposure' into undefined, but that requires effective UV >= 3 somewhere (which contradicts efficiency = poor).

### Expected
The "UV is weak this week" alert should appear during sustained low-UV periods (e.g., late autumn where UV hovers at 2-3) to inform users that natural vitamin D production will be limited.

### Fix options
1. Relax the `!isLowUvScenario` condition (e.g., only skip for `maxForecastedUV < 2`)
2. Gate on raw UV bands instead of effective UV
3. Remove the dead code if the scenario is genuinely impossible

### Test
`tests/dWindowForecast/generateRecommendations.test.ts > "UV is weak this week" > TRIAGE: this message appears unreachable...`
