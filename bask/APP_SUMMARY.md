# Bask App — Code-Based Summary (for App Store Metadata Drafting)

## App Overview
Bask is an iOS app that tracks vitamin D from sun exposure and supplements using live UV/weather data and a personalized vitamin D “D‑Engine.” It combines manual sun sessions with passive outdoor time from Apple Health (Time in Daylight), recommends safe exposure windows, and helps users balance sun, supplements, and cofactors (magnesium + K2).

## Core User Flow
- **Onboarding** collects goals, skin tone/eye color, sun reaction, outdoor time, supplement habits, age/weight, optional blood test baseline; then shows a medical disclaimer and requests permissions (Location, Notifications, HealthKit).
- **Home** shows daily vitamin D progress (Bask ring), time‑to‑goal, burn risk, daily decay, solar window chart, and a “Bask Now” session button.
- Users can **start a timed sun session**; the app calculates IU in real time, shows time‑to‑burn, and (on iOS 16.1+) shows a Live Activity.
- Users **log supplements** (preset IU buttons) and **cofactors**; the app gives weather‑adjusted supplement suggestions.
- **History/Insights** provide timelines, calendar streaks, trend charts, and an education hub.

## Key Features (Implemented in Code)
- **Real‑time UV + weather** via Apple WeatherKit (current UV, hourly forecast, sunrise/sunset, cloud cover).
- **Personalized vitamin D math** (Holick‑style formula, Fitzpatrick skin type, age multiplier, clothing exposure, UV ≥ 3 “shadow rule,” burn‑time cap).
- **D‑Window Forecast**: 48‑hour optimal sun windows with recommendations and local notification alerts (lead time 10/20/30 minutes).
- **Manual “Bask session” timer** with pause/resume/cancel, IU gained, burn‑time indicator, and Live Activities.
- **Passive tracking**: Apple Health “Time in Daylight” sync to auto‑estimate sun IU; writes vitamin D supplement intake back to HealthKit.
- **Supplement recommendations**: “skip/take” guidance based on sun exposure + UV conditions; quick‑log 1k/2k/5k IU.
- **Cofactor tracking** for Magnesium + Vitamin K2 with educational context.
- **History & trends**: timeline of sessions/supplements/cofactors, edit notes/dosage, calendar streaks, 7/30/90‑day IU trend chart.
- **Education / Insights hub**: topic cards (Vitamin D basics, K2 synergy, magnesium, skin type guide, optimal timing, winter strategy, SAD protocol, etc.).
- **PDF export**: “Physician report” PDF for 30/90/all‑time stats (sessions, supplements, cofactors, streaks, weekly totals).

## Integrations & Permissions
- **Location**: required for WeatherKit UV/forecast and location labels.
- **Notifications**: local notifications for D‑Window alerts.
- **Apple Health (HealthKit)**: read Time in Daylight, read/write dietary Vitamin D.
- **Live Activities**: session tracking on Lock Screen / Dynamic Island.

## Data Stored (Local)
- User profile (Fitzpatrick type, age, weight, daily goal, blood test values).
- Sun sessions, supplements, cofactors, notes.
- Settings (notifications, HealthKit enabled, onboarding answers).

## Monetization
- RevenueCat subscriptions with a post‑onboarding paywall; restore purchases available in Settings.

## Platform Notes
- Built with Next.js + Ionic + Capacitor; primary target is iOS.
- Live Activities require iOS 16.1+; Time in Daylight requires iOS 17+.
