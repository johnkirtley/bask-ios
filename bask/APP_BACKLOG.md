# Bask App Backlog

Last updated: 2026-06-21

Use this as the running list for app fixes and feature work. Higher-priority open items stay higher in the list. When an item ships, move it to `Completed` with the completion date and a short note about what changed.

Maintenance rule: every finalized plan or approved plan change should update this file in the same turn. When an implementation item is completed and validated, move it from `Open` or `Later` to `Completed` with the completion date.

## Open

### 1. Active Session Recovery

Priority: High  
Risk: Higher  
Status: Implemented on `claude/live-session-recording-bug-68psu9` — pending device force-kill QA & merge

Persist active-session checkpoints to `localStorage` and recover interrupted sessions after iOS reclaims the suspended app process mid-session. Previously the session lived only in React state and was silently lost on a cold reload, bouncing the user to the home screen, leaving an orphaned `bask_sessions` row (`ended_at IS NULL`), and dismissing the still-running Live Activity.

Implementation notes (branch + review fixes):

- `bask/lib/sessionPersistence.ts`: snapshots the full `BaskSessionState` (Dates → ISO) to `localStorage` and rehydrates on mount. Strictly validates the persisted shape (all integrator/UI fields, finite numbers) so a corrupt or partial blob cannot feed `undefined`/`NaN` into the IU rate.
- `bask/hooks/useBaskSession.ts`: restore happens in a mount **layout effect** (not a lazy `useState` initializer) so the first render matches the statically-exported HTML (no React hydration mismatch) while still re-rendering before paint (no home-screen flash). Reuses the pure `integrateAccrual` integrator; a `restorePendingRef` holds the background gap until live UV loads so a cold reload at UV 0 cannot under-credit it to zero. Live Activities are re-synced on restore (falling back to a fresh start if the activity died) instead of destroyed, and the key is cleared on both `completed` and `idle` to prevent double-recording.

Validation:

- `npx tsc --noEmit --incremental false` clean; `npm run lint` clean (no new warnings in changed files); `npm run build` succeeds (static export).
- NOT run: on-device force-terminate QA (Xcode kill mid-session → reopen) to confirm `localStorage` survives WKWebView process reclaim, correct IU crediting across the gap, Live Activity re-sync, and no orphaned `ended_at IS NULL` rows. This is the linchpin device test and is required before release.

### 2. Add UV Data Confidence Labels To Add Session

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

### 3. Preserve And Harden Apple Watch Daylight IU Estimation

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

### Leaderboard Local-Day Consistency

Priority: Later  
Risk: Medium  
Status: Not a priority

Only revisit if the live product again shows today/week leaderboard tabs, daily leaderboard IU/minutes, or daily leaderboard aggregates that affect rewards, streaks, or caps.

Reason for deferral:

- Current product direction is all-time aggregate ranking by highest app streaks.
- The previous UTC/local-day concern is much less important for streak-only ranking.

## Completed

### Format D Synthesis Starts In

Completed: 2026-06-18
Priority: Low
Risk: Low

Updated the pre-synthesis countdown copy for BASKAPP-18 so active-session and Home stat countdown labels use the shared hour/minute duration formatter instead of raw minute counts. Code-path inspection confirmed 45 -> 45m, 60 -> 1h, 90 -> 1h 30m, 110 -> 1h 50m, and the existing >120 minute suppression remains unchanged. Automated validation was not run because project instructions say not to run tests unless requested.

### Wire Apple Search Ads Attribution Into RevenueCat

Completed: 2026-06-14
Priority: Medium
Risk: Low

Enabled Apple Search Ads attribution for the RevenueCat integration (BASKAPP-20). The dashboard Basic and Advanced integrations were already connected, but the SDK does not collect or send the Apple AdServices attribution token by default. Added a single `Purchases.enableAdServicesAttributionTokenCollection()` call in `contexts/SubscriptionContext.tsx`, immediately after `Purchases.configure(...)`, guarded to iOS only (`Capacitor.getPlatform() === 'ios'`) and wrapped in its own try/catch so a token-collection failure cannot abort the rest of subscription init. No ATT prompt, IDFA collection, Info.plist, or native framework changes were needed — the AdServices token does not depend on tracking consent and RevenueCat links AdServices internally. App min target is iOS 16, above the iOS 14.3+ requirement. Validated with `npx tsc --noEmit --incremental false` (clean) and `npm run lint` (pre-existing warnings only, none in the edited file). Device/dashboard attribution flow requires a real-device Search Ads install and was not run here.

### Add Onboarding Goal Choice, Trial Offer, Sharing, And Review Prompt Polish

Completed: 2026-06-03
Priority: High
Risk: Medium

Added an onboarding daily Vitamin D goal choice with a 2,000 IU default, NIH baseline guidance, and healthcare-provider copy, then persisted the selected goal into the local profile for new onboarding completions without migrating existing saved users. Added a Home free-trial offer card for non-premium users that opens the existing RevenueCat paywall, a Settings share card for the Bask App Store link, and shared custom review and feedback confirmation modals for both onboarding and Home value prompts while preserving the existing positive review and negative feedback flows. Restyled the Home trial offer card on 2026-06-03 with a warmer solar-gradient CTA treatment so it stands out below the streak card. Automated validation was not run because project instructions say not to run tests unless requested.

### Gate Sunburn Risk Timing For New Free Users

Completed: 2026-06-03
Priority: Medium
Risk: Medium

Made sunburn-risk timing a Pro feature for new free users while grandfathering existing local installs by profile creation date. The Home sunburn metric, in-app live-session countdown, and iOS Live Activity now use generic Pro placeholders for locked users instead of rendering real burn timing behind the lock. Locked in-app values open the existing RevenueCat paywall without touching live-session pause/end state. Added simulator QA checks for the locked Home value, live-session paywall flow, Live Activity leakage, and grandfathered-user behavior. Refined the locked Home and live-session placeholder on 2026-06-03 so the Pro badge and unlock label are left-aligned under the Sunburn Risk heading. Automated validation was not run because project instructions say not to run tests unless requested.

### Add After-Sunset No-Window Copy

Completed: 2026-06-03
Priority: Low
Risk: Low

Added a dedicated after-sunset Today empty state for the D-window forecast: `Sun has set` with `No D-window is available for the rest of today.` The card uses the existing Home sunset time and keeps pre-sunset no-window copy unchanged. Forecast eligibility logic was unchanged. Validated with `npx tsc --noEmit --incremental false` and `npm run lint` (warnings only).

### Soften Forecast And Time-To-Goal Copy

Completed: 2026-06-03  
Priority: Low  
Risk: Low

Changed the Today D-window empty state from an all-day-sounding message to `No window right now`, with reason-specific subtext that notes current UV/cloud conditions and asks the user to check back later because forecasts can change. Also shortened the low-UV Time to Goal subtext by removing the midday aside. Forecast eligibility logic was unchanged. Validated with `npx tsc --noEmit --incremental false` and `npm run lint` (warnings only).

### Clarify Cloud-Blocked Vitamin D States

Completed: 2026-06-02  
Priority: High  
Risk: Low

Aligned the D-window card and active-session UI when raw UV is high but cloud-adjusted UV is below the vitamin D threshold. The D-window card no longer says vitamin D is available now during cloud-blocked conditions, replaces misleading low-exposure recommendation copy with cloud-blocked guidance, removed the ambiguous forecast-wide efficiency badge, and the active-session view now shows a prominent cloud-blocking notice instead of only a tiny `D-rays` caption. Validated with `npx tsc --noEmit --incremental false` and `npm run lint`.

### Replace Onboarding Review Prompt With Value-Based Review System

Completed: 2026-06-01  
Priority: High  
Risk: Medium

Replaced the automatic native onboarding review request with an `Enjoying Bask?` feedback prompt after plan generation, then request native review only after a positive response. Kept a later value-driven review touchpoint based on app opens plus sun-session or supplement value events, with paywall and active-session suppression, review analytics, and softer negative paths that ask before opening the Tally feedback form. Validated with `npx tsc --noEmit --incremental false`, `npm run lint`, and code-path inspection. Refined the negative onboarding and Home value-prompt paths on 2026-06-02, then switched explicit review-feedback and Settings Report Issue routing from support email to Tally on 2026-06-03 without running automated validation per project instructions.

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
