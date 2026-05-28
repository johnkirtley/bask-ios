# App Store Review Audit — Bask

**Audit date:** May 27, 2026  
**App version audited:** 3.1 (`MARKETING_VERSION` in Xcode)  
**Bundle ID:** `io.bask`

Use this doc to track fixes before App Store submission. Check off items as they are resolved.

---

## Audit Progress

- [x] Step 1: Scan critical config files
- [x] Step 2: Map features to guidelines
- [x] Step 3: Deep-check implementations
- [x] Step 4: Scan for common rejection patterns
- [x] Step 5: Capacitor/hybrid-specific checks
- [x] Step 6: Self-verification
- [x] Step 7: Write structured report

---

## Fix Tracker

| # | Severity | Issue | Status |
|---|----------|-------|--------|
| C1 | Critical | Empty `healthkit.access` entitlement | ✅ Fixed |
| C2 | Critical | Privacy policy contradicts leaderboard / Supabase | ⬜ Open (website) |
| C3 | Critical | Delete All Data doesn't remove server leaderboard data | ✅ Fixed |
| H1 | High | Onboarding falsely reports UV sync on failure | ✅ Fixed |
| H2 | High | No explicit Terms / Privacy acceptance in onboarding | ⏭️ Skipped (approved previously) |
| H3 | High | Privacy policy deletion instructions incomplete | ⬜ Open (website) |
| H4 | High | iOS 15 deployment target vs iOS 16+ core features | ⏭️ Skipped (approved previously) |
| H5 | High | In-app review prompted during first-run onboarding | ⏭️ Skipped (intentional UX) |
| H6 | High | Post-onboarding paywall — add App Store review notes | ⬜ Open (ASC notes) |
| R1 | Recommendation | Dead background-task plugin scaffolding | ✅ Fixed |
| R2 | Recommendation | `BaskBackgroundTaskPlugin` missing from patch script | ✅ Fixed (plugin removed) |
| R3 | Recommendation | Placeholder App Store URL in code | ⏭️ Skipped (already handled) |
| R4 | Recommendation | Feature-request URL is a parked domain | ⏭️ Skipped (already handled) |
| R5 | Recommendation | Notification permission vs premium gating mismatch | ✅ Fixed |
| R6 | Recommendation | Verify production env vars at build time | ⏭️ Skipped (already built) |
| R7 | Recommendation | Soft medical language in onboarding hook | ✅ Fixed |

**Suggested fix order:** C1 → C2 → C3 → H1 → H5 → H2 → H3 → H4 → H6 → recommendations

---

## Critical Issues (Will Likely Cause Rejection)

### C1. Empty `healthkit.access` entitlement may block upload

- [ ] **Fixed**

- **What:** `App.entitlements` includes `com.apple.developer.healthkit.access` as an empty array (`[]`). Apple's upload validation often rejects empty-array entitlement values (ITMS-90164), even when the app only uses standard HealthKit types (not clinical records).
- **Why:** Guideline 2.1 — app must be submittable and functional; this can fail before review. The `healthkit.access` key is for clinical health records, not dietary vitamin D / Time in Daylight.
- **Where:** `bask/ios/App/App/App.entitlements` lines 7–8
- **Fix:** Remove the entire `com.apple.developer.healthkit.access` key/array. Keep only `com.apple.developer.healthkit` = true and `com.apple.developer.weatherkit` = true. Re-archive and upload to verify.

---

### C2. Privacy policy contradicts leaderboard data collection

- [ ] **Fixed**

- **What:** The live privacy policy states: *"We do not transmit your personal health data to our servers"* and lists only WeatherKit, RevenueCat, and HealthKit as third parties. The app now sends opt-in leaderboard data (anonymous name, session IU, duration, optional location labels) to Supabase.
- **Why:** Guideline 5.1.1 — privacy disclosures must match actual collection; App Privacy labels in App Store Connect must align or review will flag a mismatch.
- **Where:**
  - https://www.getbask.app/privacy (sections 2.3, 4, 5)
  - `bask/lib/supabase/leaderboardService.ts`
  - `bask/components/settings/LeaderboardSettings.tsx`
- **Fix:** Update the privacy policy to describe the Touch Grass Leaderboard (what is sent, when, retention, deletion). Add Supabase to third-party services. Update App Store Connect Privacy Nutrition Labels accordingly.

---

### C3. "Delete All Data" does not remove server-side leaderboard data

- [ ] **Fixed**

- **What:** Settings → "Delete All Data" wipes local SQLite (including leaderboard credentials/tokens) but never calls `leaderboardService.deleteLeaderboardData()`, so Supabase records can remain after the user believes everything was deleted.
- **Why:** Guideline 5.1.1 — users must be able to delete data they provided; orphaned server data after local wipe is a common rejection trigger.
- **Where:**
  - `bask/lib/database/repositories/resetRepository.ts` lines 15–63
  - `bask/lib/supabase/leaderboardService.ts` lines 348–372
- **Fix:** Before clearing settings in `deleteAllUserData()`, call `leaderboardService.deleteLeaderboardData()` (or equivalent RPC) while credentials still exist. Handle offline/errors with a clear message if server deletion fails.

---

## High-Risk Issues (May Cause Rejection)

### H1. Onboarding falsely reports UV sync on failure

- [ ] **Fixed**

- **What:** On native, if WeatherKit fails, `ProcessingScreen` still sets `isReady = true` and shows "Local UV conditions synced" even though no real data was fetched.
- **Why:** Guideline 2.1 — misleading "success" states during onboarding suggest broken or incomplete functionality.
- **Where:** `bask/components/onboarding/ProcessingScreen.tsx` lines 103–108, 33–36
- **Fix:** On WeatherKit failure, don't mark the UV row complete; show a retry or "Couldn't load UV — you can continue and enable location in Settings" state instead.

---

### H2. No explicit Terms / Privacy acceptance during onboarding

- [ ] **Fixed**

- **What:** Onboarding requires a medical disclaimer but has no screen or checkbox for Privacy Policy / Terms of Service. `agreedToTermsAt` is auto-set at completion without user action on legal links.
- **Why:** Guideline 5.1.1 — apps collecting health-adjacent profile data (symptoms, blood tests, skin type) should obtain clear consent to privacy terms before collection.
- **Where:**
  - `bask/contexts/OnboardingContext.tsx` lines 165–174
  - `bask/components/onboarding/OnboardingFlow.tsx`
- **Fix:** Add a final onboarding step with links to `legalContent.links.privacyPolicy` and `termsOfService`, requiring explicit acceptance before `completeOnboarding()`.

---

### H3. Privacy policy deletion instructions are incomplete

- [ ] **Fixed**

- **What:** Policy section 6 only mentions "Redo Onboarding" for deletion. The app also offers "Delete All Data" and separate leaderboard deletion — neither is documented on the live policy.
- **Why:** Guideline 5.1.1 — inaccurate data-rights documentation.
- **Where:**
  - https://www.getbask.app/privacy section 6
  - `bask/app/settings/page.tsx` lines 830–892
- **Fix:** Document all three paths: Redo Onboarding, Delete All Data, and Delete Leaderboard Data (Community settings).

---

### H4. iOS 15 deployment target vs iOS 16+ core features

- [ ] **Fixed**

- **What:** Main app targets iOS 15.0, but WeatherKit requires iOS 16.0+ and Live Activities require iOS 16.2+. On iOS 15 devices, core UV features fail silently into empty states.
- **Why:** Guideline 2.1 — shipping on OS versions where primary functionality doesn't work can be treated as incomplete.
- **Where:**
  - `bask/ios/App/App.xcodeproj/project.pbxproj` (`IPHONEOS_DEPLOYMENT_TARGET = 15.0`)
  - `bask/ios/App/App/BaskWeatherPlugin.swift` lines 152–154
  - `bask/ios/App/App/BaskLiveActivityPlugin.swift` lines 35–37
- **Fix:** Raise minimum deployment target to iOS 16.2 (aligns with widget extension), or show a clear "Requires iOS 16+" screen on unsupported versions.

---

### H5. In-app review prompted during first-run onboarding

- [ ] **Fixed**

- **What:** `ProcessingScreen` calls `requestOnboardingReview()` immediately after the processing animation, before the user has used the app.
- **Why:** Guideline 2.1 / Review HIG — early review prompts frustrate reviewers and can contribute to negative review outcomes; Apple expects prompts after meaningful engagement.
- **Where:**
  - `bask/components/onboarding/ProcessingScreen.tsx` lines 160–165
  - `bask/lib/services/inAppReviewService.ts` lines 27–47
- **Fix:** Remove the onboarding review prompt. Keep user-initiated review (Settings) and milestone-based prompts only after real usage.

---

### H6. Post-onboarding paywall gates first app access

- [ ] **Fixed**

- **What:** `IonicProvider` shows the RevenueCat paywall immediately after onboarding completes, before the home screen.
- **Why:** Not a direct violation, but reviewers must dismiss the paywall to test the app; unclear notes can slow or confuse review.
- **Where:** `bask/components/IonicProvider.tsx` lines 39–60
- **Fix:** Add App Store Connect review notes: *"Dismiss the subscription paywall to access the full free tier. Restore Purchases is in Settings → Subscription."*

---

## Recommendations (Best Practices)

### R1. Dead background-task plugin scaffolding

- [ ] **Fixed**

- **What:** `BaskBackgroundTaskPlugin` references BGTask IDs and claims handlers live in `AppDelegate`, but `AppDelegate.swift` has no BGTask registration, Info.plist has no `BGTaskSchedulerPermittedIdentifiers`, and JS never calls `scheduleBackgroundRefresh()`.
- **Why:** Guideline 2.5.4 — if enabled later without full implementation, background modes are a rejection vector.
- **Where:**
  - `bask/ios/App/App/BaskBackgroundTaskPlugin.swift`
  - `bask/ios/App/App/AppDelegate.swift`
  - `bask/lib/plugins/baskBackgroundTask.ts`
- **Fix:** Remove unused plugin code, or fully wire Info.plist + AppDelegate handlers before shipping.

---

### R2. `BaskBackgroundTaskPlugin` missing from Capacitor patch script

- [ ] **Fixed**

- **What:** `patch-capacitor-config.js` registers Weather, Health, and Live Activity plugins but not BackgroundTask (low risk since unused).
- **Why:** Capacitor hybrid consistency — incomplete plugin registration causes silent failures if the feature is enabled later.
- **Where:** `bask/scripts/patch-capacitor-config.js` lines 7–8
- **Fix:** Add to `localPlugins` if the plugin stays, or remove the plugin entirely.

---

### R3. Placeholder App Store URL in code

- [ ] **Fixed**

- **What:** `handleRateApp` falls back to `https://apps.apple.com/us/app/bask-app-id` on non-iOS. The Settings "Rate the App" button is commented out, but the dead URL remains.
- **Why:** Guideline 2.1 — placeholder URLs are a common rejection pattern if ever exposed.
- **Where:** `bask/app/settings/page.tsx` line 358
- **Fix:** Replace with the real App Store URL or remove the fallback until the app is live.

---

### R4. Feature-request URL is a parked domain

- [ ] **Fixed**

- **What:** `handleSuggestFeature` points to `https://www.bask.io/feature-requests`, which is a domain-for-sale page. The UI button is commented out, but the handler remains.
- **Why:** Guideline 2.1 — dead links if re-enabled.
- **Where:** `bask/app/settings/page.tsx` lines 348–351, 692–704
- **Fix:** Point to a real feedback channel (e.g. `mailto:support@getbask.app`) or remove the handler.

---

### R5. Notification permission during onboarding vs premium gating

- [ ] **Fixed**

- **What:** Onboarding can enable notifications and save `enabled: true`, but D-Window notifications require Premium in Settings.
- **Why:** Not a blocker, but permission requests should match what free users receive (Guideline 5.1.5 / UX clarity).
- **Where:**
  - `bask/components/onboarding/NotificationPermissionScreen.tsx`
  - `bask/app/settings/page.tsx` lines 370–375
- **Fix:** Either gate the onboarding notification prompt behind Premium, or clarify that alerts require Premium and only request iOS permission when the user subscribes.

---

### R6. Verify production env vars at build time

- [ ] **Fixed**

- **What:** `REVENUECAT_API_KEY` and Supabase vars come from `NEXT_PUBLIC_*` env vars; empty strings fail silently or at runtime.
- **Why:** Guideline 3.1.2 — broken subscriptions fail review.
- **Where:**
  - `bask/lib/constants.ts` lines 11–12
  - `bask/.env.example`
- **Fix:** Ensure CI/release builds inject real keys; add a build-time check that fails if keys are missing for production iOS builds.

---

### R7. Soft medical language in marketing copy

- [ ] **Fixed**

- **What:** Onboarding hook says *"optimal health"*; supplement card uses appropriately soft language ("you might consider").
- **Why:** Guideline 5.1.3 — health apps should avoid therapeutic claims.
- **Where:** `bask/components/onboarding/EmotionalHookScreen.tsx` lines 38–42
- **Fix:** Prefer "vitamin D tracking" / "sun exposure guidance" over "optimal health."

---

## Compliant Areas

These were verified and need no action unless related code changes:

- **Subscriptions:** Restore Purchases in Settings; RevenueCat uses `LOG_LEVEL.ERROR`; RevenueCatUI paywall with restore path
- **Mock data isolation:** `useSunData` uses mocks on web only; native shows empty/error states on WeatherKit failure
- **Location:** When-in-use only; usage string matches behavior; no Always authorization
- **Medical disclaimer:** Required during onboarding; accessible again in Settings
- **Legal links:** Privacy (`getbask.app/privacy`) and Terms (`getbask.app/terms`) are live and linked in Settings
- **WeatherKit attribution:** Linked in Settings footer on native
- **Leaderboard opt-in:** Clear in-app disclosure, separate delete control, no GPS — user-chosen labels only
- **Data deletion (local):** "Delete All Data" and "Redo Onboarding" exist in Settings
- **HealthKit usage strings:** Present and accurately describe read (daylight, vitamin D) and write (supplements)
- **No third-party login:** Sign in with Apple not required
- **No ATT / tracking SDKs:** No App Tracking Transparency usage detected
- **Live Activities:** Native plugin + widget extension implemented; `NSSupportsLiveActivities` declared
- **Insights content:** Informational disclaimers present; supplement recommendations use soft language

---

## App Store Connect Checklist

Use when submitting:

- [ ] Privacy Nutrition Labels updated for Supabase leaderboard (opt-in data)
- [ ] Review notes mention dismissing post-onboarding paywall
- [ ] Review notes mention Restore Purchases location (Settings → Subscription)
- [ ] Test account / demo instructions provided if any feature needs explanation
- [ ] Archive uploads successfully (verify C1 entitlement fix)
- [ ] HealthKit, WeatherKit, Live Activities tested on real device (iOS 16.2+)

---

## Notes

_Add implementation notes, PR links, or re-audit dates below._

| Date | Note |
|------|------|
| 2026-05-27 | Initial audit |
