# UV Window Projection Range

## TL;DR

The app currently surfaces D-Window forecasts for **today and tomorrow only**. That is a
product/code limitation, not a WeatherKit data limitation. WeatherKit can return a larger
hourly forecast horizon, but D-Window quality depends on UV and cloud-cover forecasts, so
we should avoid pretending far-future windows are precise.

Decision: extend the visible forecast to **3 days**:

- Free users see **today only**.
- Premium users see **today + 2 days out**.
- D-Window notifications fire for the **current local day only**.
- HealthKit/passive daylight sync continues to use the **current local day only**.

A 3-day horizon is the right first implementation: useful for planning, still inside the
higher-confidence forecast window, and small enough to keep the UI simple.

---

## Product Rules

### Forecast visibility

- Show at least 3 calendar days of optimal windows in the D-Window forecast card.
- Use local calendar days, not rolling 24-hour chunks.
- Day 0 label: `Today`.
- Day 1 label: `Tomorrow`.
- Day 2+ label: weekday name, for example `Thursday`.

### Premium gating

- Free users should see the current day forecast only.
- Premium users should see all forecast days.
- Locked future-day rows should use the existing paywall interaction pattern.

### Notifications

Notifications should **not** follow the full forecast horizon.

Only schedule current-day notifications for:

- Optimal D-Window start reminder.
- D synthesis start.
- D synthesis ending.
- Cloud-blocked fallback nudge, if applicable.

Remove or disable tomorrow notification scheduling as part of this work if product intent
is current-day only. Future-day rows are planning information, not scheduled reminders.

### HealthKit/passive sync

HealthKit UV estimation must remain today-only. Extending the hourly payload to 72 hours
must not let tomorrow/day-3 UV values influence today's passive daylight IU estimate.

---

## Current Constraints In Code

### Native fetch horizon

`ios/App/App/BaskWeatherPlugin.swift` currently requests 48 hours:

```swift
// Get hourly forecast for next 48 hours
let startDate = Date()
let endDate = Calendar.current.date(byAdding: .hour, value: 48, to: startDate) ?? startDate
```

This should become 72 hours for the 3-day UI horizon.

### Forecast engine shape

`lib/dWindowForecast.ts` currently returns a fixed two-day shape:

```ts
interface DWindowForecast {
  today: OptimalWindow | null;
  tomorrow: OptimalWindow | null;
  todaySynthesis: SynthesisWindow | null;
  tomorrowSynthesis: SynthesisWindow | null;
  todayCloudBlocked: SynthesisWindow | null;
  tomorrowCloudBlocked: SynthesisWindow | null;
  todayNoWindowReason?: NoWindowReason;
  tomorrowNoWindowReason?: NoWindowReason;
}
```

That shape is the core limitation. A true multi-day implementation should add a day array
that carries every per-day output, not just optimal windows.

### UI rendering

`components/home/DWindowForecastCard.tsx` manually renders `forecast.today` and
`forecast.tomorrow`. It should render the forecast day array instead.

### Notification scheduling

`lib/services/notificationService.ts` is hardcoded around today/tomorrow notification IDs
and fields. Because the intended behavior is current-day only, this should be simplified
to consume only day 0 instead of expanding notification IDs to future days.

### `useSunData` current-day assumptions

`hooks/useSunData.ts` builds the UV curve and sweet spot from the entire hourly forecast.
After the native payload expands to 72 hours, this path must filter to the current local
day before deriving chart data or `hasOptimalWindow`.

---

## Proposed Data Model

Add explicit constants:

```ts
export const DWINDOW_FORECAST_DAYS = 3;
export const DWINDOW_NOTIFICATION_DAYS = 1;
```

Recommended location: `lib/constants.ts`, unless we want these scoped only to
`lib/dWindowForecast.ts`.

Add a day-level forecast model:

```ts
type NoWindowReason = 'uv-too-low' | 'clouds-blocking' | 'low-exposure';

interface DayWindowForecast {
  dateKey: string; // local YYYY-MM-DD
  dayLabel: string; // Today, Tomorrow, weekday
  dayOffset: number; // 0 = today
  window: OptimalWindow | null;
  synthesis: SynthesisWindow | null;
  cloudBlocked: SynthesisWindow | null;
  noWindowReason?: NoWindowReason;
}

interface DWindowForecast {
  days: DayWindowForecast[];

  // Backward-compatible aliases during migration.
  today: OptimalWindow | null;
  tomorrow: OptimalWindow | null;
  todaySynthesis: SynthesisWindow | null;
  tomorrowSynthesis: SynthesisWindow | null;
  todayCloudBlocked: SynthesisWindow | null;
  tomorrowCloudBlocked: SynthesisWindow | null;
  todayNoWindowReason?: NoWindowReason;
  tomorrowNoWindowReason?: NoWindowReason;

  efficiency: 'excellent' | 'good' | 'moderate' | 'poor';
  recommendations: Recommendation[];
  noWindowReason?: NoWindowReason;
}
```

Why this shape:

- The UI can render `forecast.days` directly.
- Existing consumers can keep using today/tomorrow aliases while we migrate.
- Notifications can explicitly use `forecast.days[0]`.
- Future day 3 gets synthesis/no-window/cloud-blocked state without inventing more fields
  like `dayAfterTomorrowSynthesis`.

---

## Implementation Plan

### 1. Add horizon constants

Files:

- `lib/constants.ts`
- `lib/dWindowForecast.ts`

Work:

- Add `DWINDOW_FORECAST_DAYS = 3`.
- Add `DWINDOW_NOTIFICATION_DAYS = 1`.
- Use `DWINDOW_FORECAST_DAYS` in TypeScript loops and mock data generation.
- Keep the native Swift value in sync at 72 hours. Swift cannot import TS constants, so
  use a clear Swift-side constant/comment.

### 2. Raise native hourly fetch to 72 hours

File:

- `ios/App/App/BaskWeatherPlugin.swift`

Work:

- Change the hourly query from 48 to 72 hours.
- Update the comment from `next 48 hours` to `next 72 hours` or `next 3 days`.
- Optionally introduce a local Swift constant:

```swift
let forecastHours = 72
let endDate = Calendar.current.date(byAdding: .hour, value: forecastHours, to: startDate) ?? startDate
```

Notes:

- Existing cache behavior can remain unchanged.
- No entitlement change is needed.

### 3. Extend web-preview mock data

File:

- `app/page.tsx`

Work:

- Generate 72 hours instead of 48.
- Prefer deriving this from `DWINDOW_FORECAST_DAYS * 24`.
- Update comments that mention 48 hours.

### 4. Filter `useSunData` calculations to today

File:

- `hooks/useSunData.ts`

Work:

- Before building `uvCurve`, filter `hourlyForecast.forecast` to the current local day.
- Use the filtered today-only list for:
  - `uvCurve`
  - `peakUVHours`
  - `hasOptimalWindow`
  - `sweetSpotStart`
  - `sweetSpotEnd`

Reason:

- The expanded forecast payload is for the D-Window card.
- The home chart and current conditions should remain today-scoped.

### 5. Generalize forecast engine to day array

File:

- `lib/dWindowForecast.ts`

Work:

- Add `NoWindowReason` and `DayWindowForecast` types.
- Replace the two manual buckets with a `for dayOffset in 0..<DWINDOW_FORECAST_DAYS` loop.
- Slice hourly data by local calendar day boundaries.
- For each day:
  - Build day label.
  - Run `findOptimalWindow()`.
  - Run `findSynthesisWindow()`.
  - Determine no-window reason.
  - Run `findCloudBlockedBand()` only when reason is `clouds-blocking`.
  - Null out already-passed `window`, `synthesis`, and `cloudBlocked` only for day 0.
- Return `days` plus backward-compatible aliases.

Important adjustment:

- Do not let `findOptimalWindow()` infer current-day behavior from `dayLabel === 'Today'`.
- Pass an explicit `isToday` or `dayOffset` option instead.

Suggested helper extraction:

```ts
function buildDayForecast(params: {
  dayForecast: HourlyForecastItem[];
  dayLabel: string;
  dayOffset: number;
  now: Date;
  fitzpatrickType: number;
  exposurePercent: number;
  targetIU: number;
  age: number | null;
}): DayWindowForecast
```

### 6. Keep recommendations intentionally near-term

File:

- `lib/dWindowForecast.ts`

Work:

- Keep recommendation copy focused on today and tomorrow for now.
- Use `days[0]` and `days[1]` as inputs to avoid expanding notification-like urgency to
  day 3.
- Compute `efficiency` from all visible forecast days or from today/tomorrow only.

Recommendation:

- Compute `efficiency` from all `days` so the card header reflects the premium 3-day
  outlook.
- Keep action-oriented recommendation copy focused on today/tomorrow so it does not become
  noisy.

### 7. Render forecast days in the card

File:

- `components/home/DWindowForecastCard.tsx`

Work:

- Replace the manual Today/Tomorrow sections with a `forecast.days.map(...)` render.
- For free users:
  - Render day 0 normally.
  - Render locked placeholders for day 1 and day 2.
- For premium users:
  - Render all days normally.
- Make active indicators apply only to day 0.
- Reuse `WindowDisplay`, `SynthesisOnlyDisplay`, and locked-row UI.
- Update paywall copy from `Unlock tomorrow's D-Window` to something that works for both
  locked future rows, for example `Unlock future D-Windows`.

### 8. Make notifications today-only

File:

- `lib/services/notificationService.ts`

Work:

- Use `const today = forecast.days?.[0]` when available.
- Schedule only:
  - `today.window`
  - `today.synthesis`
  - `today.cloudBlocked`
- Stop scheduling tomorrow notifications.
- Update `hashForecastForNotifications()` to hash only day 0 fields.
- Update `hasSchedulableForecast()` to check only day 0 fields.
- Simplify or leave unused tomorrow IDs only if removing them is risky. Prefer removing
  tomorrow scheduling paths so behavior matches product intent.

Also fix while touching this file:

- `parseWindowStartTime()` should not append `T00:00:00` to a full ISO timestamp.
- Use `new Date(window.date)` as the base and then set parsed local hours/minutes.

### 9. Keep HealthKit passive sync today-only

Files:

- `lib/healthKitUvUtils.ts`
- `app/page.tsx`

Work:

- `getRepresentativeUvForPassiveSync()` already filters to today's local date. Keep this
  behavior.
- Add a regression test or explicit verification because the expanded hourly payload makes
  this path more important.

### 10. Update type comments and docs

Files:

- `lib/plugins/baskWeather.ts`
- `lib/dWindowForecast.ts`
- Any UI comments that mention 48 hours or two days.

Work:

- Update `getHourlyForecast()` comment from `next 24 hours` to `next 72 hours` or `next 3
  days`.
- Update `calculateOptimalWindows()` comments from 48-hour language to 3-day forecast
  language.

---

## Verification Plan

### Type/build checks

Run:

```bash
npm run build
```

If lint is functional in this Next version, also run:

```bash
npm run lint
```

### Forecast engine checks

There is no dedicated test runner currently configured. Either add a lightweight test
setup or verify with a temporary script during implementation.

Minimum cases:

- Synthetic 72-hour forecast returns `days.length === 3`.
- Labels are `Today`, `Tomorrow`, and the weekday for day 2.
- `forecast.today === forecast.days[0].window`.
- `forecast.tomorrow === forecast.days[1].window`.
- Passed windows are nulled only for day 0.
- Day 1 and day 2 windows are not nulled based on current time-of-day.
- Cloud-blocked and synthesis-only cases work per day.

### UI checks

In web preview:

- Free state shows today plus locked future rows.
- Premium state shows all 3 days.
- Day 3 label is a weekday.
- No horizontal scroll is introduced.
- Active dot/countdown appears only for today's synthesis state.

### Notification checks

On native/simulator:

- Only today's D-Window notification is scheduled.
- Only today's synthesis start/ending notifications are scheduled.
- Tomorrow/day-3 forecast rows do not create pending notifications.
- `parseWindowStartTime()` schedules valid dates from WeatherKit ISO timestamps.
- Notification dedupe hash changes when today's forecast changes, not when only day 2/day
  3 changes.

### HealthKit/passive sync checks

- With a 72-hour payload, representative UV is computed only from today's viable hours.
- Tomorrow/day-3 high UV does not affect today's passive daylight IU estimate.

### Native data checks

On iOS 16+ with location permission:

- `BaskWeather.getHourlyForecast()` returns roughly 72 hourly points, depending on
  WeatherKit boundary behavior.
- Forecast card has enough data to populate day 2.
- App still behaves correctly if WeatherKit returns fewer than 72 points.

---

## Risks And Decisions

### Accuracy beyond 3 days

We can technically request more data, but cloud-cover accuracy is the weak link for this
feature. Because D-Window scoring depends on cloud attenuation, 3 days is a better product
promise than 5-10 days.

Decision: keep `DWINDOW_FORECAST_DAYS = 3` for now.

### Notifications beyond today

Future-day notifications can become noisy and stale as forecasts change. They also create
more scheduling complexity and more edge cases around cancellation/dedupe.

Decision: current-day notifications only.

### Backward compatibility

Keeping today/tomorrow aliases avoids a broad migration in one patch. New UI should use
`days`; operational consumers can migrate gradually.

Decision: add `days`, keep aliases.

### Test infrastructure

The repo does not currently have an app-wide unit test runner configured. This change is
engine-heavy enough that adding Vitest would be valuable, but it is not strictly required
for the first implementation if we run build checks and targeted manual verification.

Decision: prefer adding engine unit tests if scope allows; otherwise document manual test
cases clearly in the PR.
