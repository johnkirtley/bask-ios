# Bask App Backlog

Last updated: 2026-06-01

Use this as the running list for app fixes and feature work. Higher-priority open items stay higher in the list. When an item ships, move it to `Completed` with the completion date and a short note about what changed.

Maintenance rule: every finalized plan or approved plan change should update this file in the same turn. When an implementation item is completed and validated, move it from `Open` or `Later` to `Completed` with the completion date.

## Open

### 1. Add UV Data Confidence Labels To Add Session

Priority: High  
Risk: Low  
Status: Ready

Add labels to Add Session that reflect the actual state of UV data used for the calculation.

Implementation notes:

- Show `UV data available` only when direct hourly UV data exists for the selected session time.
- Show `Estimated from nearby forecast` when the calculation relies on fallback or nearby forecast data.
- Do not add caching, interpolation, or native WeatherKit changes in the first pass.
- Do not show confidence labels that are not backed by the fetched data state.

Validation:

- Selecting a time with direct hourly UV data shows `UV data available`.
- Selecting a time without direct hourly UV data shows `Estimated from nearby forecast`.
- The IU calculation behavior remains unchanged in this first pass.

### 2. Preserve And Harden Apple Watch Daylight IU Estimation

Priority: Medium  
Risk: Medium  
Status: Needs design and tests

Keep Apple Watch Time in Daylight as part of the premium daily IU feature, but make the estimate more honest and bounded.

Implementation notes:

- Keep reading cumulative HealthKit `timeInDaylight`.
- Continue subtracting manually logged sun-session minutes to reduce double-counting.
- Use WeatherKit UV data for the UV side of the estimate, since HealthKit daylight duration does not include UV intensity.
- Bound passive IU credit to viable UV windows instead of applying one representative UV value to all daylight minutes.
- Add user-facing copy such as `Estimated from Apple Health daylight and local UV forecast`.

Validation:

- Apple Watch daylight still contributes to daily IU.
- Manual sun sessions are not double-counted against passive daylight minutes.
- Low-UV daylight does not receive the same IU estimate as high-UV daylight.
- Existing premium behavior remains understandable and stable.

## Later

### Active Session Recovery

Priority: Later  
Risk: Higher  
Status: Deferred

Persist active-session checkpoints and recover interrupted sessions after app kill, crash, or OS eviction.

Reason for deferral:

- This touches app lifecycle, session state, local persistence, and duplicate sync/leaderboard behavior.
- It should be implemented as a dedicated project with focused force-kill/background testing.

### Leaderboard Local-Day Consistency

Priority: Later  
Risk: Medium  
Status: Not a priority

Only revisit if the live product again shows today/week leaderboard tabs, daily leaderboard IU/minutes, or daily leaderboard aggregates that affect rewards, streaks, or caps.

Reason for deferral:

- Current product direction is all-time aggregate ranking by highest app streaks.
- The previous UTC/local-day concern is much less important for streak-only ranking.

## Completed

### Fix Stale Current-Hour D-Window Recommendations

Completed: 2026-06-01  
Priority: High  
Risk: Low

Clamped same-day D-window starts to a near-future rounded time and skipped candidate windows with too little usable time remaining. Notification scheduling continues to use the adjusted `startTime`, preventing past starts. Validated with `npx tsc --noEmit --incremental false`, `npm run lint`, and targeted code-path inspection.

### Stop Writing Sun Sessions As Dietary Vitamin D

Completed: 2026-06-01  
Priority: High  
Risk: Low

Removed HealthKit dietary Vitamin D writes from completed sun sessions while leaving supplement HealthKit writes unchanged. Updated HealthKit copy to describe Time in Daylight reads and Vitamin D supplement sync. Validated with `npm run lint`, `npx tsc --noEmit --incremental false`, and code-path inspection.
