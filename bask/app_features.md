# Bask App - Feature Implementation Tracker

This document tracks the implementation status of all features in the Bask vitamin D tracking app. Each section contains checkboxes for completed (✓) and pending items.

---

## Competitive Strategy: The "Passive Intelligence" Moat

To win in 2026, Bask moves away from the **"stopwatch" model** toward a **"Passive Intelligence" model**. The app lives in the background and only alerts the user when they need to act. Most competitors give users data; we give them **decisions** and **zero-touch automation**.

### The Competition Landscape

| Competitor             | Their Angle                                                 | Weakness                                                                                           | **Bask's Advantage**                                                                                            |
| ---------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **dminder**            | Medical utility, Dr. Holick-backed                          | Functional but outdated UI/UX. Manual logging only. Feels like a 2015 app                          | **Passive Intelligence**: Background UV monitoring + HealthKit timeInDaylight = zero-touch tracking             |
| **SunSeeker**          | Sleek minimalism, "Huberman Lab" crowd, circadian health    | High friction: Still requires manual "I'm outside" logging. Feels like another to-do list task     | **Predictive Intelligence**: 48h "D-Window" forecast + automatic outdoor time detection                         |
| **Sun Index / SunDay** | Safety-first (sunburn prevention), excellent UV forecasting | Fear-based messaging (skin cancer warnings). Psychologically draining, not empowering              | **Empowerment**: Focuses on health benefits, optimal exposure, longevity. Positive framing                      |
| **Cronometer / Fitia** | Massive nutrition databases, supplement tracking            | Terrible at sun synthesis calculation. Treats D like a calorie—ignores location, season, skin type | **Synthesis Accuracy**: Full formula accounting for UVI, cloud cover, BSA, Fitzpatrick type, seasonal variation |

### The 2026 Value Gap (Our Entry Point)

| Competitor Gap                                                         | **Bask's Opportunity**                                                                                                                 |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **High Friction** (manual logging, "Start Timer" buttons)              | **Zero-Touch Tracking**: iPhone/Watch "Time in Daylight" API auto-logs sun exposure. User never opens the app unless needed            |
| **Isolated Data** (sun OR supplements OR blood tests, never all three) | **The Full D Stack**: Sun + Supplements + Blood Results + Cofactors (Mg/K2) in one unified system                                      |
| **Boring Notifications** ("Log your vitamin D today!")                 | **Contextual Coaching**: "UV is peaking in 20 mins. A 12-min walk now completes your daily goal." Feels like a personal health advisor |
| **Reactive** (tells you current UV)                                    | **Proactive** (forecasts tomorrow's optimal basking window, catches up with supplement suggestions on cloudy days)                     |

### Key Differentiators (implemented in sections below)

1. **Zero-Touch Tracking** — HealthKit timeInDaylight auto-logs outdoor time. No "Start Timer" needed
2. **D-Window Forecast** — Proactive 48h sun schedule (not reactive UV index)
3. **Contextual Coaching** — Smart notifications: "UV peaking in 20 min. 12-min walk completes your daily goal"
4. **The Full D Stack** — Sun + Supplements + Blood Results + Cofactors (Mg/K2) unified
5. **Weather-Adjusted Supplement Advice** — Dynamic: "Skip tonight, you maxed out" or "No UV today, take 2000 IU"
6. **Blood Test Integration** — Real blood values recalibrate algorithm to medical-grade accuracy
7. **SAD Protocol** — Mood vs D correlation for seasonal affective disorder (mental health positioning)

---

## 1. Core Logic: D-Deposit Engine

The app's value proposition is **Calculation and Education**. It acts as a "bank account" for vitamin D, tracking deposits (sun exposure + supplements) and withdrawals (daily decay).

### Formula Overview

```
D_net = (Sun_gain + Supp_input) - Daily_decay
Sun_gain = UVI × Duration × BSA × SkinTypeFactor
```

### Implementation Status

- [x] **Vitamin D calculation formula** (Holick-based)
      _Location: `lib/dEngine.ts:calculateVitaminD()`_
      Uses industry-standard formula with skin type multipliers

- [x] **Fitzpatrick type derivation**
      _Location: `lib/dEngine.ts:deriveFitzpatrickType()`_
      Maps onboarding answers (skin tone + sun reaction) to Fitzpatrick Type I-VI

- [x] **Time-to-goal calculation**
      _Location: `lib/dEngine.ts:calculateTimeToGoal()`_
      Reverse calculation: minutes needed to reach target IU based on current UV + skin type

- [x] **Burn risk calculation**
      _Location: `lib/dEngine.ts:calculateTimeToBurn()`, `getBurnRiskLevel()`_
      Uses MED (Minimum Erythemal Dose) values for each Fitzpatrick type

- [ ] **Daily decay model**
      Vitamin D has a half-life of ~15 days. Show D-levels dropping slightly each day without sun/supplements to encourage retention behavior

- [ ] **Real UV Index integration**
      Replace mock data with live weather API (WeatherKit or alternative). Currently using `generateMockSunData()` in `lib/mockData.ts`

- [x] **D-Window Forecast engine (MOAT FEATURE)**
      _Location: `lib/dWindowForecast.ts`, `components/home/DWindowForecastCard.tsx`_
      48-hour predictive UV forecast with skin-type-aware optimal windows. Scores hours based on UV, cloud cover, and time of day. Shows today and tomorrow's optimal windows with estimated IU and duration.

- [x] **Weather-adjusted supplement recommendation engine (MOAT FEATURE)**
      Dynamic supplement advice based on daily sun achievement. Logic:
  - If user hit their sun goal today (e.g., 5000 IU from basking) → suggest skipping supplement ("You've maxed out natural production today")
  - If no sun logged or low UV day → suggest "top-up" dose (e.g., "No UV today. Consider a 2,000 IU supplement tonight")
  - Prevents over-supplementation and saves users money

---

## 2. Onboarding: Zero-Friction Profile Builder

A modern onboarding flow that feels like a **"Personal Consultation"**, not a form. Uses HealthKit integration to minimize manual input.

### Strategy: Maximize Conversion

- **Objective-first**: Start with "Why are you here?" to personalize the experience
- **HealthKit integration**: Pull existing blood test data if available
- **Biological context**: Age, weight (D is fat-soluble; higher BMI needs higher dosage)
- **Empowering tone**: Frame permissions as "enabling intelligence" not "surveillance"

### Implementation Status

- [x] **Emotional hook screen (Screen 0)**
      _Location: `components/onboarding/EmotionalHookScreen.tsx`_
      Animated golden sun orb with "Unlock the Power of the Sun" tagline

- [x] **Goal setting (Screen 1)**
      _Location: `components/onboarding/SingleSelectScreen.tsx`_
      Q1: "What brings you here?" → Vitamin D optimization, safe tanning, circadian rhythm, longevity

- [x] **Skin type via color swatches (Screen 2)**
      _Location: `components/onboarding/SkinEyeColorScreen.tsx`_
      Q2: Fitzpatrick scale via 6 skin tone swatches + 5 eye color options

- [x] **Sun reaction (Screen 3)**
      _Location: `components/onboarding/SingleSelectScreen.tsx`_
      Q3: Burn behavior → Always burns, burns then tans, rarely burns

- [x] **Outdoor time baseline (Screen 4)**
      _Location: `components/onboarding/SingleSelectScreen.tsx`_
      Q4: Typical daily outdoor time → <15min, 15-60min, 1-3h, 3+h

- [x] **Supplement baseline (Screen 5)**
      _Location: `components/onboarding/SingleSelectScreen.tsx`_
      Q5: Current supplementation → None, daily, occasionally

- [x] **Processing/completion screen (Screen 6)**
      _Location: `components/onboarding/ProcessingScreen.tsx`_
      3-step animated processing with golden orb, then "Your profile is ready"

- [x] **Onboarding state persistence**
      _Location: `contexts/OnboardingContext.tsx`, `hooks/useOnboarding.ts`_
      Stores answers to SQLite (native) or localStorage (web)

- [x] **Location permission request (new Screen 6)**
      _Location: `components/onboarding/LocationPermissionScreen.tsx`_
      Privacy Nutrition Label style screen with pre-prompt explanation

- [x] **Biological profile (new Screen): Age + Weight**
      _Location: `components/onboarding/BiologicalProfileScreen.tsx`_
      Q: "A few quick details for accurate recommendations"

  - Age (affects vitamin D metabolism)
  - Weight (D is fat-soluble; higher BMI requires higher baseline dosage)
    Store in `bask_user_profile` table

- [ ] **Blood test baseline (new Screen) (MOAT FEATURE)**
      Q: "Do you have a recent vitamin D blood test result?"

  - Option 1: "Yes, pull from Apple Health" → Read HealthKit `HKQuantityType(.dietaryVitaminD)` blood test data
  - Option 2: "Yes, I'll enter it manually" → ng/mL or nmol/L input form
  - Option 3: "No" → Set conservative estimated baseline, suggest ordering test kit
  - Significantly improves algorithm accuracy vs. estimates

- [x] **Typical attire question (new Screen)**
      _Location: `components/onboarding/TypicalAttireScreen.tsx`_
      "When you're outside, what's your standard 'Sun Outfit'?" → Sets default BSA % (Body Surface Area)

- [x] **Pre-prompt permission explanation**
      Custom screen before triggering native permission dialogs. Uses "Privacy Nutrition Label" style transparency:

  - **Location**: "We check local UV Index in the background to alert you of optimal sun windows. Location data is never sold."
  - **HealthKit**: "We track your outdoor time and sync vitamin D data. All processing is on-device."
  - **Always Allow Location**: Request "Always Allow" (not "While Using") to enable background UV monitoring
    Should appear after onboarding answers are collected but before native `requestAuthorization()` calls

- [x] **Medical disclaimer screen (new Screen)**
      _Location: `components/onboarding/MedicalDisclaimerScreen.tsx`_
      **REQUIRED for legal compliance.** Display before or during the processing/completion screen. User must acknowledge before proceeding.

  **Disclaimer text**:

  - "This app is for informational and educational purposes only. It is not a medical device."
  - "Always consult your physician before starting or changing a supplement regimen."
  - "Vitamin D recommendations provided by this app are estimates based on general research and should not replace professional medical advice."
  - "Individual vitamin D needs vary based on age, health conditions, medications, and other factors only your healthcare provider can assess."

  **Implementation**:

  - User taps "I Understand" or "Accept" to proceed
  - Store acceptance timestamp in `bask_user_profile` table
  - Also display abbreviated disclaimer in:
    - Settings page (legal section)
    - Supplement recommendation UI (bottom of any screen suggesting supplement dosages)
    - Weather-adjusted supplement advice cards

---

## 3. Dashboard / Home Screen

Main screen shows daily vitamin D progress, current UV conditions, and session controls.

### Implementation Status

- [x] **BaskRing (circular progress indicator)**
      _Location: `components/home/BaskRing.tsx`, used in `app/page.tsx`_
      300px SVG ring with golden gradient showing IU progress toward daily goal (default 5000 IU)

- [x] **Stat cards (time-to-goal, burn risk)**
      _Location: `components/home/GlassCard.tsx`_
      Two frosted-glass cards showing minutes to reach goal + burn risk level (Low/Moderate/High/etc)

- [x] **BaskNow button with clothing preset selector**
      _Location: `components/home/BaskNowButton.tsx`, `components/home/ClothingPresetSelector.tsx`_
      Large amber CTA button. Tapping opens IonActionSheet with 5 clothing presets (exposure %)

- [x] **Active session view (timer, live IU tracking)**
      _Location: `components/home/ActiveSessionView.tsx`, `hooks/useBaskSession.ts`_
      Full-screen session UI with timer ring (MM:SS), live "+X IU" count, pause/resume/end/cancel buttons. Updates every 1 second using D-Engine calculations

- [x] **Integrate SolarWindowChart**
      _Location: `components/home/SolarWindowChart.tsx` (built but not rendered)_
      UV curve chart showing optimal basking window (10am-2pm "sweet spot"). Add to dashboard below stat cards

- [x] **Integrate SupplementCard quick-log**
      _Location: `components/home/SupplementCard.tsx` (built but not rendered)_
      Quick-add card for supplement intake with checkmark animation. Add to dashboard or as floating action

- [ ] **Notification bell functionality**
      Currently a visual placeholder in header (`app/page.tsx:104`). Wire up to notification center showing recent alerts (solar noon, decay nudges, cofactor reminders)

- [ ] **Daily decay visualization**
      Show D-levels gradually dropping on days without sun/supplements. Could be a subtle ring animation or trend line on BaskRing

- [ ] **HealthKit-synced vitamin D display on dashboard**
      _Location: Add to dashboard stat cards or BaskRing detail_
      Use `BaskHealthPlugin.getDietaryVitaminD()` (backed by `HKStatisticsQuery` with `.cumulativeSum`) to show total vitamin D from supplements logged today. This supplements the BaskRing's manual session data (sun exposure) with HealthKit-sourced data for a complete picture. Example: "Today: 2500 IU from sun + 2000 IU from supplements (HealthKit) = 4500 IU total"

- [x] **D-Window Forecast card (MOAT FEATURE)**
      _Location: `components/home/DWindowForecastCard.tsx`, integrated in `app/page.tsx`_
      Shows 48h sun schedule with optimal basking windows. Displays efficiency rating and personalized recommendations

---

## 4. Manual Loggers

Users manually log sun exposure and supplement intake (no automatic tracking).

### Implementation Status

#### Sun Logger

- [x] **Sun session logger**
      _Location: `hooks/useBaskSession.ts`, `lib/database/repositories/sessionsRepository.ts`_
      Tap "Bask Now" → select clothing preset → start timer → logs to `bask_sessions` table with UV, duration, IU, clothing, exposure%

- [x] **Clothing preset selection**
      _Location: `components/home/ClothingPresetSelector.tsx`_
      5 presets: Tank Top (80% exposed), Gym Clothes (60%), T-Shirt & Shorts (50%), Casual (30%), Long Sleeves (10%)

- [ ] **Sun time slider (retroactive logging)**
      Add UI for "I was outside earlier today for X minutes." Time slider sets duration, app calculates IU based on historical UV data for that time. No timer—instant calculation

#### Supplement Logger

- [x] **Supplement database + repository**
      _Location: `lib/database/repositories/supplementsRepository.ts`, schema in `lib/database/schema.ts`_
      Table: `bask_supplements` (dosage_iu, logged_at, notes)

- [x] **Supplement quick-add UI**
      _Location: `components/home/SupplementCard.tsx` (built but not integrated)_
      Add to dashboard or as drawer. Integrate with `supplementsRepository.create()`

- [x] **Preset supplement buttons**
      Quick-add buttons for common dosages: 1000 IU, 2000 IU, 5000 IU. One-tap logging

- [ ] **Cofactor tip on supplement log**
      When logging a supplement, show educational tip: "Vitamin D is best absorbed with a meal containing fat. Take with breakfast or lunch for optimal results."

- [x] **Weather-adjusted supplement advice UI (MOAT FEATURE)**
      _Location: `components/home/SupplementCard.tsx`_
      Dynamic recommendation based on today's sun achievement with color-coded badges (success/warning/info)

---

## 5. Cofactor Tracking (MOAT FEATURE)

Track complementary nutrients required for vitamin D metabolism. This is **Bask's biggest competitive gap advantage** — most apps ignore cofactors, leading to suboptimal results.

### Expert Edge

- **Magnesium**: Required to convert vitamin D into active form (calcitriol). Without Mg, D levels won't rise as expected
- **Vitamin K2**: Ensures calcium goes to bones, not arteries (works synergistically with D). Critical for users taking high-dose D supplements

### Implementation Status

- [x] **Magnesium daily toggle**
      Simple toggle in daily log or settings. Tracks whether user took Mg supplement today

- [x] **Vitamin K2 daily toggle**
      Same as above for K2

- [ ] **Cofactor reminder notifications**
      If user hasn't toggled Magnesium in 3 days, trigger notification:
      _"Vitamin D needs a buddy. Are you getting enough Magnesium? [Learn Why]"_
      "Learn Why" links to educational content or affiliate link

- [ ] **Intelligent cofactor tip (MOAT FEATURE)**
      When user logs high vitamin D (e.g., 5000 IU from sun/supplement) but hasn't logged Magnesium in 3+ days, show high-value contextual tip:
      _"Your body uses Magnesium to convert Vitamin D into its active form. Without it, your levels won't rise as expected. [Track Magnesium]"_
      Establishes Bask as the **medical expert** in the room, not just a sun timer

- [ ] **Educational content on cofactor importance**
      Explainer screens in Insights tab or inline tips explaining why Mg/K2 matter for D metabolism

---

## 6. History Page

View past sun sessions, supplements, and trends.

### Implementation Status

**Current state:** Stub placeholder (`app/history/page.tsx`) with "Coming Soon" message

- [x] **Daily sun exposure log list**
      Scrollable list of past `bask_sessions` records. Show date, duration, IU gained, UV level, clothing preset

- [x] **Supplement log history**
      List of `bask_supplements` records with date, dosage, notes

- [x] **Calendar view of basking streaks**
      Visual calendar with days highlighted when user logged sun exposure. Show current/longest streak

- [x] **Vitamin D trend chart**
      Line chart showing daily D accumulation over past 7/30/90 days. Visualizes sun + supplement deposits

---

## 7. Insights Page

Educational content and personalized recommendations.

### Implementation Status

**Current state:** Stub placeholder (`app/insights/page.tsx`) with "Coming Soon" message

- [x] **Vitamin D education content**
      _Location: `app/insights/page.tsx`_
      7 comprehensive educational cards with detailed information

- [x] **K2 synergy explainer**
      _Location: `app/insights/page.tsx`_
      Full explainer on K2 + D synergy, arterial calcification prevention

- [x] **Magnesium balance info**
      _Location: `app/insights/page.tsx`_
      Complete Mg guide including deficiency signs, food sources, supplement forms

- [x] **Personalized skin type recommendations**
      _Location: `app/insights/page.tsx`_
      Dynamic content based on user's Fitzpatrick type from onboarding

- [x] **Optimal sun exposure times**
      _Location: `app/insights/page.tsx`_
      Educational content on solar noon, UV sweet spots, and timing strategies

- [ ] **Mood vs D correlation graph (MOAT FEATURE: SAD Protocol)**
      Pull "State of Mind" data from Apple HealthKit and overlay it with vitamin D levels over time (7/30/90 days). Show visual correlation between D intake and mood/energy scores. Positioning: Mental health tool for seasonal affective disorder (SAD), especially valuable for users in Northern latitudes (London, NYC, Seattle) during "dark months"

- [ ] **SAD Protocol educational content (MOAT FEATURE)**
      Explainer screens on Seasonal Affective Disorder, vitamin D's role in mood regulation, and optimal strategies for winter months. Target audience: Users with SAD, low energy, or mood tracking goals from onboarding (Q1: primary goal)

---

## 8. APIs & Native Integration

Connect to Apple services and weather data.

### Architecture: Native-First Plugin Pattern

> **Design Decision**: Bask uses **native Swift APIs** (not REST/web APIs) for all Apple service integrations, bridged to the web layer via **custom Capacitor plugins**. This is the preferred approach because:
>
> 1. **Apple auto-authenticates** via app signature for WeatherKit and HealthKit -- no API keys, .p8 files, JWT tokens, or server infrastructure needed
> 2. **On-device processing** aligns with Apple's privacy guidelines and simplifies App Store review
> 3. **Capacitor's plugin architecture** provides a clean bridge: **Native Swift class → Custom Capacitor Plugin → TypeScript interface → React hook**
> 4. **Same pattern for all native integrations**: WeatherKit and HealthKit follow this identical bridge pattern
>
> **Data Flow (per integration)**:
>
> ```
> Swift Framework (WeatherService / HKHealthStore / etc.)
>   → Custom Capacitor Plugin (BaskWeatherPlugin.swift / BaskHealthPlugin.swift)
>     → Plugin TypeScript definition (registered via @capacitor/core)
>       → React hook (useSunData / useHealthKit / etc.)
>         → React component
> ```
>
> **Web fallback**: When running in browser (development), hooks fall back to mock data generators. The plugin calls are wrapped in platform detection (`Capacitor.isNativePlatform()`).

### Implementation Status

#### Apple WeatherKit (Environmental Data Layer)

> **Native Approach**: We use Swift's `WeatherService` class (iOS 16+, `import WeatherKit`) directly -- NOT the WeatherKit REST API. Apple authenticates requests automatically via the app's code signature and provisioning profile. This means:
>
> - **No .p8 key file** needed
> - **No JWT token generation** needed
> - **No server-side auth proxy** needed
> - **No API key management** at all
> - Just `import WeatherKit` in Swift, call `WeatherService.shared.weather(for: location)`, and Apple handles everything
>
> The native `WeatherService` response includes UV index, cloud cover, sunrise/sunset, hourly forecasts, and more -- all in strongly-typed Swift structs.

- [x] **WeatherKit setup in Developer Portal** -- DONE
      Apple Developer Portal → App ID → Capabilities → WeatherKit is enabled. App Services key for WeatherKit is active.
      _Verified: Entitlement `com.apple.developer.weatherkit` present in `App.entitlements`_

- [x] **WeatherKit Xcode entitlement** -- DONE
      `ios/App/App/App.entitlements` contains `com.apple.developer.weatherkit = true`.
      `CODE_SIGN_ENTITLEMENTS = App/App.entitlements` is set in both Debug and Release build configurations in `project.pbxproj`.

- [x] **Custom Capacitor WeatherKit Plugin (native Swift side)**
      _Location: `ios/App/App/BaskWeatherPlugin.swift`, `ios/App/App/BaskWeatherPlugin.m`_
      The Swift plugin class:

  - `import Capacitor` and `import WeatherKit`
  - Extend `CAPPlugin` with `@objc` methods
  - Expose `getCurrentWeather(call: CAPPluginCall)` -- accepts `lat: Double, lon: Double`, calls `WeatherService.shared.weather(for: CLLocation(...))`, returns JSON with `uvIndex`, `cloudCover`, `temperature`, `condition`, `sunrise`, `sunset`
  - Expose `getHourlyForecast(call: CAPPluginCall)` -- accepts `lat: Double, lon: Double, hours: Int` (default 48), returns array of hourly data points with `hour`, `uvIndex`, `cloudCover`, `precipitationChance`
  - Expose `getSolarEvents(call: CAPPluginCall)` -- returns `sunrise`, `sunset`, `solarNoon` for given location
  - Handle errors gracefully (no WeatherKit entitlement, network failure, location not provided)
  - Register plugin in `AppDelegate.swift` or via Capacitor's auto-registration (`CAP_PLUGIN` macro in .m file)

- [x] **TypeScript plugin interface + hook update (web side)**
      _Location: `lib/plugins/baskWeather.ts`, `hooks/useSunData.ts` updated_
      TypeScript interface created with platform detection for web fallback

- [x] **Real UV Index fetching**
      _Location: `hooks/useSunData.ts`_
      Implemented with native WeatherKit plugin. Refreshes every 5 minutes with platform detection fallback

- [x] **Solar noon calculation**
      _Location: Integrated in `BaskWeatherPlugin.getSolarEvents()`_
      Exposes `solarNoon` from WeatherService sun events data

- [x] **Cloud cover integration**
      _Location: `lib/dWindowForecast.ts`_
      D-Window forecast uses cloud cover in scoring and effective UV calculations

- [x] **48-hour UV forecast data (MOAT FEATURE)**
      _Location: `BaskWeatherPlugin.getHourlyForecast()`, used by D-Window Forecast_
      Fetches 48h hourly UV index forecast via native `WeatherService`

- [ ] **Background weather refresh**
      Use `BGAppRefreshTask` (Background Tasks framework) in native Swift code to call `WeatherService.shared` every 1-2 hours even when app is closed. Store results in shared `UserDefaults` or local DB. Required for proactive UV window notifications. The Capacitor plugin reads cached data when available to minimize redundant fetches

- [ ] **WeatherKit attribution (REQUIRED)**
      Display Apple Weather logo or "Weather from Apple" link in UI whenever showing weather data. Apple rejects apps that don't attribute. Add to dashboard footer and any screen displaying weather-sourced data

#### HealthKit (Exposure Automation + System Sync)

> **Native Approach**: We use Swift's `HKHealthStore` class directly (same pattern as WeatherKit). All HealthKit queries and writes happen in native Swift code, bridged to the web layer via a custom Capacitor plugin (`BaskHealthPlugin`). HealthKit requires native authorization -- there is no web/REST alternative. Apple authenticates via entitlements + provisioning profile.
>
> **Why custom plugin (not third-party)**: Standard Capacitor HealthKit plugins (e.g., `capacitor-health-connect`, `@perfood/capacitor-healthkit`) don't support `timeInDaylight` (iOS 17+), which is **critical for the Zero-Touch Tracking moat feature**. Building a custom native plugin is the only reliable path to accessing this data. Additionally, a custom plugin gives us full control over query patterns (e.g., `HKStatisticsQuery` with `.cumulativeSum` for daily vitamin D totals) and error handling.
>
> **Why native-only**: HealthKit APIs are exclusively available through Apple's native frameworks. There is no JavaScript/web equivalent. The Capacitor plugin pattern is the only viable approach for a hybrid app.

- [x] **HealthKit setup in Xcode** -- DONE
      `ios/App/App/App.entitlements` contains both:

  - `com.apple.developer.healthkit = true`
  - `com.apple.developer.healthkit.background-delivery = true`
    _Both entitlements are wired via `CODE_SIGN_ENTITLEMENTS` in Debug + Release build configs._
    _App category is set to `public.app-category.healthcare-fitness` in build settings._

- [x] **Info.plist usage descriptions**
      _Location: `ios/App/App/Info.plist`_
      Added `NSHealthShareUsageDescription` and `NSHealthUpdateUsageDescription` with clear explanations

- [x] **Custom Capacitor HealthKit Plugin (native Swift side)**
      _Location: `ios/App/App/BaskHealthPlugin.swift`, `ios/App/App/BaskHealthPlugin.m`_

  **Implementation specifics**:

  - **Safety check**: ALWAYS call `HKHealthStore.isHealthDataAvailable()` before executing any HealthKit code. Return graceful error if unavailable (iPad, simulator, etc.)
  - **Authorization scope**: Request `dietaryVitaminD` (read + write) and `timeInDaylight` (read only). Also request `stateOfMind` (read) for SAD Protocol feature
  - **Query pattern**: Use `HKStatisticsQuery` with `HKStatisticsOptions.cumulativeSum` to calculate total vitamin D intake for a date range (e.g., "today"). This is more efficient than fetching all samples and summing manually

  The Swift plugin class should:

  - `import Capacitor` and `import HealthKit`
  - Extend `CAPPlugin` with `@objc` methods
  - Expose `isAvailable(call: CAPPluginCall)` -- checks `HKHealthStore.isHealthDataAvailable()` for device compatibility
  - Expose `requestAuthorization(call: CAPPluginCall)` -- requests read/write access for `timeInDaylight`, `dietaryVitaminD` (both read + write), and `stateOfMind` (read)
  - Expose `getTimeInDaylight(call: CAPPluginCall)` -- accepts `startDate`, `endDate`, returns total minutes outdoors from `HKQuantityType(.timeInDaylight)` (iOS 17+) using `HKStatisticsQuery`
  - Expose `getDietaryVitaminD(call: CAPPluginCall)` -- accepts `startDate`, `endDate`, returns total IU from `HKQuantityType(.dietaryVitaminD)` using `HKStatisticsQuery` with `.cumulativeSum`. This is used for dashboard display of "today's vitamin D from supplements"
  - Expose `writeDietaryVitaminD(call: CAPPluginCall)` -- accepts `dosageIU: Double, date: Date?`, writes supplement intake to HealthKit
  - Expose `getStateOfMind(call: CAPPluginCall)` -- reads mood/energy scores from `HKStateOfMind` (iOS 17+) for SAD Protocol correlation
  - Handle graceful degradation when HealthKit is unavailable (iPad, older iOS versions)

- [x] **TypeScript plugin interface for HealthKit (web side)**
      _Location: `lib/plugins/baskHealth.ts`_
      TypeScript interface created with platform detection (no web implementation as HealthKit is iOS-only)

- [x] **HealthKit: timeInDaylight (read) (MOAT FEATURE: Zero-Touch Tracking)**
      _Location: `BaskHealthPlugin.getTimeInDaylight()` in Swift plugin_
      **This is the killer feature.** iOS 17+ metric from iPhone/Apple Watch sensors. Automatically detects how long user was outdoors.
      All queries go through `BaskHealthPlugin.getTimeInDaylight()` bridge

- [x] **HealthKit: dietaryVitaminD (read/write)**
      _Location: `BaskHealthPlugin.getDietaryVitaminD()`, `BaskHealthPlugin.writeDietaryVitaminD()`_
  - **Read**: Pull existing vitamin D data via native plugin
  - **Write**: Sync supplement logs to Apple Health

- [x] **HealthKit permission flow**
      _Location: `BaskHealthPlugin.requestAuthorization()` and `BaskHealthPlugin.isAvailable()`_
      Native authorization for `dietaryVitaminD` and `timeInDaylight`

- [ ] **HealthKit: State of Mind (read) (MOAT FEATURE: SAD Protocol)**
      iOS 17+ metric. Read user's mood/energy scores via `BaskHealthPlugin.getStateOfMind()` to correlate with vitamin D levels for the Mood vs D graph (Section 7). Enables mental health positioning for SAD (Seasonal Affective Disorder) use case

- [ ] **Background Delivery observers**
      Set up `HKObserverQuery` for `timeInDaylight` **in the native Swift plugin** to receive updates when user's outdoor time changes. Register background delivery in `AppDelegate.swift` via `HKHealthStore.enableBackgroundDelivery()`. Enables real-time "catch-up" notifications

#### Geolocation

> **Implementation Note**: `@capacitor/geolocation` is NOT currently installed (see `package.json`). Two approaches:
>
> - **Option A (Recommended)**: Handle location internally in `BaskWeatherPlugin.swift` using `CLLocationManager`. The weather plugin requests location, fetches weather for that location, and returns results -- all in one native call. This avoids an extra Capacitor plugin dependency and keeps the location lifecycle contained within the weather flow.
> - **Option B**: Install `@capacitor/geolocation`, get lat/lon in TypeScript, then pass coordinates to `BaskWeatherPlugin.getCurrentWeather(lat, lon)`. Simpler separation of concerns but adds a dependency and an extra round-trip across the native bridge.
>
> If Option A is chosen, `BaskWeatherPlugin` methods can accept **optional** lat/lon parameters. If omitted, the plugin uses `CLLocationManager` to get current location internally. If provided, it uses the supplied coordinates directly. This gives flexibility for both "current location weather" and "arbitrary location weather" use cases.
>
> **Either way**, the following Info.plist keys must be added:
>
> - `NSLocationWhenInUseUsageDescription` -- required for basic location access
> - `NSLocationAlwaysAndWhenInUseUsageDescription` -- required for "Always Allow" (background UV monitoring)

- [ ] **Geolocation permission for weather**
      Request "Always Allow" location access during onboarding (not "While Using"). Required for:

  - Fetching local UV Index via native `WeatherService`
  - Background UV window notifications
  - Proactive alerts when UV hits optimal level
    **Currently missing from Info.plist**: Must add `NSLocationWhenInUseUsageDescription` and `NSLocationAlwaysAndWhenInUseUsageDescription`

- [ ] **Background location refresh**
      Use significant location change monitoring (not continuous GPS) via `CLLocationManager.startMonitoringSignificantLocationChanges()`. Only fetch new weather data when user moves >500m. Minimizes battery drain. Can be implemented in `BaskWeatherPlugin.swift` or as a separate background task

---

## 9. Contextual Coaching (Background Logic & Notifications)

**Philosophy**: Move from "boring notifications" to **"Contextual Coaching."** The app monitors conditions in the background and only alerts when there's a **high-value action** to take.

### Implementation Status

#### The UV Window (Proactive Alerts)

- [ ] **Background UV monitoring**
      Monitor local UV Index every 30 min using `BGAppRefreshTask`. When UV hits the user's optimal level (based on Fitzpatrick type), trigger notification

- [ ] **"Perfect Sun Right Now" alert (MOAT FEATURE)**
      When UV reaches sweet spot (e.g., UV 4-7 for Type III):
      _"Perfect sun for you right now! 12 mins outside will hit your daily goal."_

  - Personalized to user's skin type and remaining IU needed today
  - Include "Start Basking" action button that opens app to active session
  - Only send if user hasn't hit goal yet today

- [ ] **"UV Peaking Soon" forecast alert**
      20 minutes before optimal UV window:
      _"UV is peaking in 20 mins. A 12-minute walk now completes your daily goal."_
      Helps users plan ahead vs. reactive "it's good now" alerts

#### The Catch-Up (Intelligent Compensation)

- [ ] **End-of-day catch-up notification (MOAT FEATURE)**
      At 3:00 PM (or user-selected time), check if user has been outside today via `timeInDaylight`:
  - **Scenario 1**: No outdoor time detected + cloudy/low UV day:
    _"Cloudy day? Take an extra 2,000 IU of D3 tonight to stay on track."_
  - **Scenario 2**: User was outside but didn't log manually:
    _"You were outside for 35 minutes today—want to log that as basking time?"_
  - Calculate remaining IU needed and suggest supplement dose dynamically

#### Cofactor Intelligence

- [ ] **Weekly cofactor check (MOAT FEATURE)**
      Every Sunday at 10 AM:
      _"Are you taking Magnesium and K2 this week? Vitamin D can't be absorbed efficiently without them. [Track Cofactors]"_

- [ ] **Cofactor reminder (3-day trigger)**
      After 3 days without Mg/K2 toggle:
      _"Vitamin D needs a buddy. Are you getting enough Magnesium? [Learn Why]"_

#### Passive Tracking Nudges

- [ ] **HealthKit "pudge" notification**
      If `timeInDaylight` > 15 minutes but no session logged:
      _"You were outside for 20 minutes today—want to log it?"_

- [ ] **Daily decay nudge**
      If user hasn't logged sun/supplement in 48 hours:
      _"Your vitamin D levels are dropping. Get 15 minutes of sun today or log a supplement."_

---

## 10. Data Privacy & App Store Compliance

Apple review requirements for HealthKit, WeatherKit, location APIs.

### Implementation Status

#### On-Device Processing (Privacy by Design)

- [ ] **Transparency during permissions**
      Use "Privacy Nutrition Label" style screens (Section 2: Pre-prompt permission explanation). Clearly state:
  - **Location**: "Used only to fetch local UV Index. Never sold or shared. You can revoke anytime in Settings."
  - **HealthKit**: "Tracks outdoor time and syncs vitamin D data. All data stays on your device and in iCloud (if enabled)."

#### WeatherKit

- [ ] **Attribution requirement**
      Display Apple Weather logo or "Weather from Apple" link in UI whenever showing weather data. Automatic rejection if missing

#### HealthKit

- [ ] **Privacy Nutrition Label**
      In App Store Connect → App Privacy:

  - Data Collection: "Health & Fitness" (timeInDaylight, dietaryVitaminD, stateOfMind)
  - Linked to User: Yes
  - Purpose: "App Functionality"
  - Data Not Collected: Location (note: location is used but not collected/stored)

- [ ] **Privacy Policy URL**
      Must have hosted privacy policy explicitly stating:

  - HealthKit data is not shared with third parties for marketing
  - Data is used only for app functionality (vitamin D calculation, mood correlation)
  - Location data is used to fetch UV Index but not stored or transmitted to servers
  - Add to app settings and App Store Connect

- [ ] **App Store description**
      Must clearly state the app is for health/fitness. Emphasize passive tracking and privacy. Example:
      _"Bask helps you optimize vitamin D levels through automatic sun exposure tracking and personalized supplement recommendations. Your health data never leaves your device."_

- [ ] **App Store screenshots**
      Must show health/fitness use case. Include screenshots of:
  - BaskRing (vitamin D progress)
  - Passive tracking ("You were outside for 20 min today")
  - Contextual coaching notifications
  - Mood vs D correlation (if implemented)

---

## 12. Blood Test Integration (MOAT FEATURE)

Direct integration with home blood test kits for medical-grade accuracy. This moves Bask from "toy" to "medical tool."

### Strategy

The gold standard for vitamin D isn't an app's estimate — it's a blood test. By integrating blood test results, we recalibrate our algorithm to be **10X more accurate** for that specific person.

### Implementation Status

- [ ] **Blood test result input UI**
      _Location: Settings or Insights page_
      Simple form for users to input their baseline vitamin D level from a recent blood test (ng/mL or nmol/L). Stores in `bask_user_profile` table. After input, show confirmation: "Your profile has been recalibrated for maximum accuracy."

- [ ] **Lab test partner integration (revenue engine)**
      Partner with home test kit providers (Everlywell, Thriva, LetsGetChecked). In-app "Order Test Kit" button with affiliate link. High-margin revenue stream (typically 20-30% commission on $50-100 kits)

- [ ] **Algorithm recalibration from blood values**
      _Location: `lib/dEngine.ts`_
      When user inputs blood test result, adjust D-Engine calculations:
  - Calculate their actual synthesis rate based on logged sun exposure vs. measured blood level
  - Personalize skin multiplier and daily goal recommendations
  - Show before/after accuracy comparison: "Your personalized synthesis rate is 15% higher than the standard Type III estimate"

---

## 13. Cleanup & Polish

Remove template residue and ensure consistency across the app.

### Implementation Status

#### Database

- [ ] **Rename database from `posture_booster` to `bask`**
      _Location: `lib/database/connection.ts:24`_
      Database name is still from the fitness app template

- [ ] **Remove legacy template tables**
      Tables not used by Bask: `completed_sessions`, `completed_exercises`, `user_progress`, `favorites`
      Clean up `lib/database/schema.ts` migrations

#### Styling

- [ ] **Remove legacy template CSS**
      CSS for unused features: phase badges, program cards, exercise cards, searchbar, filter modals
      _Location: `app/globals.css`_

- [ ] **Update Settings page to dark mode palette**
      _Location: `app/settings/page.tsx`_
      Currently uses old template light-mode colors (limestone, oat, umber). Switch to dark-bg, golden-glow, etc.

#### Links & Placeholders

- [ ] **Fix placeholder links**
  - Privacy policy URL (currently `https://example.com`)
  - Terms of service URL (currently `https://example.com`)
  - Feature request link (currently `mailto:feedback@example.com`)
  - App Store rating link (needs real App Store ID)
    _Locations: `app/settings/page.tsx`, `lib/constants.ts`_

#### Code Deduplication

- [ ] **Consolidate duplicate onboarding logic**
      Two implementations exist:

  - `hooks/useOnboarding.ts` (standalone)
  - `contexts/OnboardingContext.tsx` (context)
    Both have identical logic. Pick one source of truth (context is more widely used). Remove standalone hook

- [ ] **Wire up useTimeOfDay hook**
      _Location: `hooks/useTimeOfDay.ts`_
      Hook exists and works (returns 'morning'/'midday'/'evening'/'night') but is not used anywhere. Consider using for greeting messages or UI theming

---

## Implementation Priority (Suggested Order for Agents)

### Phase 1: Core Functionality + Quick Wins

1. Real UV Index integration (replace mock data) — **Section 1, 8**
2. Location permission + WeatherKit setup — **Section 2, 8**
3. Integrate SolarWindowChart + SupplementCard — **Section 3, 4**
4. Supplement quick-add UI with preset buttons — **Section 4**
5. Cofactor tracking (Mg/K2 toggles + intelligent tips) — **Section 5** (MOAT)

### Phase 2: History & Tracking

1. History page (sessions + supplements list) — **Section 6**
2. Calendar view + streaks — **Section 6**
3. Daily decay model + visualization — **Section 1, 3**

### Phase 3: Strategic Moat Features

1. **D-Window Forecast** (48h engine + dashboard card + 48h API data) — **Section 1, 3, 8** (MOAT)
2. **Weather-Adjusted Supplement Advice** (engine + UI) — **Section 1, 4** (MOAT)
3. **Blood Test Integration** (input UI + recalibration) — **Section 12** (MOAT)
4. **SAD Protocol** (Mood vs D graph + HealthKit State of Mind) — **Section 7, 8** (MOAT)

### Phase 4: Education & Insights

1. Insights page content (D/K2/Mg education) — **Section 7**
2. Personalized recommendations — **Section 7**

### Phase 5: Native Integration

1. HealthKit integration (dietaryVitaminD, timeInDaylight, State of Mind) — **Section 8**
2. Notification system (solar noon, decay nudges, cofactor reminders) — **Section 9**
3. HealthKit "pudge" notifications — **Section 9**

### Phase 6: Monetization & Compliance

1. Lab test partner affiliate integration — **Section 12** (MOAT revenue)
2. App Store compliance (attribution, privacy policy, screenshots) — **Section 10**
3. Cleanup (rename DB, remove template CSS, fix links) — **Section 13**
4. Code deduplication (onboarding logic) — **Section 13**

---

## Notes for Agents

- All checked items are implemented and functional as of the current codebase state
- Unchecked items are pending implementation
- File paths are provided for quick navigation to relevant code
- The app uses **Next.js static export wrapped as a native iOS app via Capacitor** (not SwiftUI -- the UI is web-based, with native Swift code only for platform API bridges)
- Database is **SQLite** (native) with **localStorage** fallback (web)
- UI follows **Apple Human Interface Guidelines** with dark mode + golden accent palette
- Prioritize native iOS components (Capacitor plugins, Ionic React) over web-only solutions
- **Native-First Plugin Pattern**: All Apple framework integrations (WeatherKit, HealthKit) use the same architecture: **Native Swift class → Custom Capacitor Plugin → TypeScript interface → React hook**. See Section 8 "Architecture: Native-First Plugin Pattern" for full details
- **Capacitor plugin creation**: Each native plugin requires two files: a `.swift` file (plugin logic extending `CAPPlugin`) and a `.m` file (Obj-C bridge macro using `CAP_PLUGIN`). Plugins are auto-discovered by Capacitor at build time
- **Platform detection**: Use `Capacitor.isNativePlatform()` in hooks to branch between native plugin calls (iOS) and mock data fallbacks (web/development)
- **Info.plist requirements**: Before implementing WeatherKit or HealthKit plugins, add the required usage description keys to `ios/App/App/Info.plist` (see Section 8 for specifics). Missing keys will cause runtime crashes
- **No `@capacitor/geolocation` installed**: Location access must be handled either internally in the weather plugin via `CLLocationManager` or by installing the Capacitor geolocation plugin first
- **Entitlements are already configured**: `App.entitlements` has WeatherKit + HealthKit + HealthKit Background Delivery. No additional Xcode capability setup needed
- - If APIs or certain features require keys or information that is currently unavailable then mock the data and make a note of it
