# UV Window Projection Range

## TL;DR

The app currently shows UV "D-Windows" for **today and tomorrow only**. This is **not**
a data limitation. Apple WeatherKit provides up to **240 hours (10 days)** of hourly
forecast data. The 48-hour ceiling is a single hardcoded value in the native plugin,
combined with a TypeScript/UI layer that is structurally built around exactly two days.

**Answer to "are we capped at 48 hours?": No — we have the data to go further. The cap is
self-imposed.**

Decision (confirmed with product): extend the horizon to **3 days** (today + 2 days out),
with **free users seeing today only** and **premium users seeing the full 3-day outlook**.

---

## Why we're capped today

Three layers each assume a 48-hour / two-day world:

### 1. Native fetch horizon — `bask/ios/App/App/BaskWeatherPlugin.swift:239-241`
```swift
// Get hourly forecast for next 48 hours
let startDate = Date()
let endDate = Calendar.current.date(byAdding: .hour, value: 48, to: startDate) ?? startDate
```
This is the only thing limiting the *data* to 48 hours. WeatherKit's `.hourly` query
supports up to 240 hours; `.daily` supports 10 days. WeatherKit billing is per call, not
per horizon, so a longer window costs nothing extra. The existing 10-minute cache
(`cacheExpirationMinutes`, lines 14 & 229) amortizes the larger payload.

### 2. Forecast engine — `bask/lib/dWindowForecast.ts:134-259`
`calculateOptimalWindows()` explicitly filters the hourly array into exactly two buckets
(`todayForecast`, `tomorrowForecast`, lines 150-158) and returns a fixed `today`/`tomorrow`
shape. Even if the native layer returned more days, everything past tomorrow would be
silently dropped here. **This is the real work in extending the range.**

### 3. UI — `bask/components/home/DWindowForecastCard.tsx:342-367`
Renders today + tomorrow, with the second day gated behind premium (free users see today
only).

---

## Forecast confidence vs. horizon

- WeatherKit hourly tops out at **240 hours (10 days)**.
- Accuracy degrades past ~3-5 days. Cloud cover is the weakest forecast variable, and the
  window engine relies heavily on `cloudCover` (effective UV = rawUV × (1 − cloudCover ×
  0.7)).
- **3 days** keeps every projected window inside the high-confidence range, so users can
  trust each day shown.

---

## Implementation plan (for when we build it)

Define the horizon as a single constant (e.g. `FORECAST_DAYS = 3`) so it's tunable later
without touching loop logic.

### 1. Native: raise the fetch horizon — `BaskWeatherPlugin.swift`
- `fetchHourlyForecast()` lines 239-241: change `value: 48` → `value: 72` (3 days).
- Update the `// Get hourly forecast for next 48 hours` comment.
- Hourly payload grows ~1.5×; the existing 10-min cache absorbs it. No new entitlement.

### 2. Web-preview mock data — `bask/app/page.tsx` (~lines 76-103)
- The mock generator synthesizes 48 hours. Extend to 72 hours so web preview stays
  representative.

### 3. Generalize the forecast engine — `bask/lib/dWindowForecast.ts` (main effort)
- Introduce a `DayWindow` concept: loop over `FORECAST_DAYS` days, slicing the hourly
  array per calendar day (reuse the existing day-boundary date math at lines 142-158).
- For each day, call the already day-agnostic helpers — `findOptimalWindow()` (line 447),
  `findSynthesisWindow()` (line 264), `findCloudBlockedBand()` (line 302),
  `determineNoWindowReason()` (line 100) — and collect into `days: DayWindowForecast[]`.
- Keep the "null out windows that already passed today" logic (lines 180-194) for the
  first day only.
- Day labels: "Today", "Tomorrow", then the weekday name for day 3 (e.g. "Thursday").
- **Backward compatibility:** keep `today`/`tomorrow` (= `days[0]`/`days[1]`) on the
  returned `DWindowForecast` and add the new `days` array, so existing consumers
  (`notificationService.ts`, `healthKitUvUtils.ts`, `useSunData.ts`) keep working.

### 4. UI — `bask/components/home/DWindowForecastCard.tsx`
- Render the `days` array (3 days).
- **Gating: free = today only; premium = full 3-day outlook.** Reuse the existing
  premium-lock pattern at lines ~342-367, extended from one locked row to two.
- Three stacked day rows fit the current layout — no horizontal scroll needed at this
  horizon.

### Files touched
- `bask/ios/App/App/BaskWeatherPlugin.swift` (horizon constant)
- `bask/lib/dWindowForecast.ts` (engine generalization — main effort)
- `bask/components/home/DWindowForecastCard.tsx` (multi-day rendering + gating)
- `bask/app/page.tsx` (web-preview mock)
- Light review: `bask/lib/services/notificationService.ts`,
  `bask/lib/healthKitUvUtils.ts`, `bask/hooks/useSunData.ts`

### Reuse (don't rewrite)
`findOptimalWindow`, `findSynthesisWindow`, `findCloudBlockedBand`,
`determineNoWindowReason`, and `generateRecommendations` are already per-day pure
functions. The extension is mostly looping over them, not new scoring logic.

### Verification
- **Engine unit test:** feed `calculateOptimalWindows()` a synthetic 3-day hourly array;
  assert `days.length === 3`, correct labels, and that `today`/`tomorrow` still equal
  `days[0]`/`days[1]`.
- **Web preview:** run the Next.js app; confirm the card renders the 3-day outlook from
  extended mock data and premium gating behaves (free = today only).
- **Device/sim (iOS 16+):** with a real location, confirm WeatherKit returns ~72 hourly
  points and the outlook populates beyond tomorrow.
- **Regression:** verify notifications and HealthKit passive sync still target today's
  window.
