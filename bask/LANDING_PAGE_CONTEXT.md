# Bask Landing Page Context

> **Purpose:** This document contains all the information needed to build a marketing landing page, privacy policy, terms of service, FAQ section, and other marketing/SEO content for the Bask iOS app.

---

## 1. App Overview & Branding

### Identity
- **App Name:** Bask
- **Bundle ID:** `io.bask`
- **Domain:** `bask.io`
- **Support Email:** `feedback@bask.io`
- **Version:** 1.0.0
- **Platform:** iOS (iPhone & iPad)
- **iOS Version Required:** iOS 14.0+

### Tagline & Messaging
- **Primary Tagline:** "Track your vitamin D and sun exposure with intelligent UV monitoring"
- **Emotional Hook:** "Get your daily vitamin D—naturally"
- **Value Proposition:** "Personalized sun exposure guidance for optimal health, safely"
- **Call to Action:** "Start My Personalization"

### Visual Identity

#### Logo
- **File Path:** `/assets/bask-logo.png`

#### Typography
- **Primary Font:** DM Sans (Google Font)

#### Color Palette: "Solar Vitality Light Mode"

| Color Token | Hex Value | Usage |
|-------------|-----------|-------|
| `cloud-dancer` | `#F0EDE9` | Warm off-white background |
| `light-surface` | `#FAFAF7` | Card surfaces |
| `solar-flare` | `#FFB347` | Primary accent (orange-gold) |
| `solar-warm` | `#FF9F1C` | Active/warm accent |
| `ember-alert` | `#E86F1B` | Warning/danger states |
| `vitality-mint` | `#A8DADC` | Wellness green for cofactors |
| `text-primary` | `#2D3436` | Deep slate for high legibility |
| `text-secondary` | `#545B64` | WCAG AA compliant |
| `text-muted` | `#6B7075` | WCAG AA compliant |

#### Gradient System (Time-of-Day Themes)
- **Morning:** Peach and Gold
- **Midday:** Amber and White
- **Evening:** Indigo and Copper
- **Night:** Grey and Dark

The UI automatically shifts gradients based on the time of day for contextual atmosphere.

---

## 2. Features Section (Marketing Copy Ready)

### Core Features

#### 🌞 Real-Time UV Monitoring
Get live UV index data for your exact location, updated every 5 minutes. See your city, current conditions, and know the perfect moment to step outside.

#### 🎯 Personalized D-Engine™
Our proprietary algorithm calculates vitamin D synthesis based on **your** skin type, age, clothing, and current UV conditions. Based on Dr. Michael Holick's peer-reviewed photobiology research.

#### ⏱️ Smart Sun Sessions
Start a timed session and watch your vitamin D accumulate in real-time. See your IU count, burn risk countdown, and clothing coverage—all in one elegant interface.

#### 📱 iOS Live Activities
Track your sun session right from your Lock Screen or Dynamic Island (iOS 16.1+). See your timer, UV index, and IU gained without unlocking your phone.

#### 🔮 48-Hour D-Window Forecast™
Our **MOAT feature**: Get intelligent predictions for the best sun exposure windows over the next 2 days. Bask analyzes hourly UV forecasts and cloud cover to recommend optimal 1-3 hour windows.

#### 🌡️ Never Burn
Built-in biological saturation model caps recommendations at your personalized burn threshold. See real-time burn risk indicators and get alerts before you exceed safe exposure.

#### 📊 Bask Ring Progress
A beautiful circular visualization showing your daily vitamin D intake vs. your personalized goal (default: 5,000 IU/day).

#### 💊 Smart Supplement Recommendations
When UV is too low for effective synthesis (UV < 3), get weather-adjusted supplement dose recommendations. Quick-add supplements with one tap.

#### 🧬 The Full D-Stack Protocol
Track not just vitamin D, but also:
- **Vitamin K2** (100-200 mcg recommended per 5,000 IU of D)
- **Magnesium** (300-400 mg daily for optimal D metabolism)

#### 🩺 Blood Test Integration
Enter your 25(OH)D baseline from lab work (ng/mL or nmol/L) to calibrate recommendations. Future: Auto-sync from Apple Health.

#### 🍎 Apple Health Integration
**Bidirectional sync:**
- **Read:** Automatically import "Time in Daylight" to estimate passive vitamin D
- **Write:** Export your vitamin D supplement intake so other health apps can see your complete nutritional data

#### 📈 History & Trends
- Timeline view of all sessions, supplements, and cofactors
- Calendar streak visualization
- Vitamin D trend chart with contextual insights
- Summary stats: Total IU, session count, supplement count, cofactor count

#### 📚 Education Hub
8 deep-dive health topics:
- Vitamin D Basics
- Vitamin K2 Synergy
- Magnesium Balance
- Your Skin Type Guide (personalized to your Fitzpatrick type)
- Optimal Sun Exposure Timing
- The Full D-Stack Protocol
- Winter Strategy
- SAD Protocol (Seasonal Affective Disorder)

#### 🩺 Physician Report Export
Generate a professional PDF report summarizing your vitamin D tracking for doctor appointments. Export via email or share directly.

#### 🔔 Smart Notifications
Get alerted 10-30 minutes before optimal D-Windows open. Opt-in with customizable lead time.

#### 👕 Clothing Presets
5 quick-select presets:
- Tank Top (20% coverage)
- Gym Clothes (40% coverage)
- T-Shirt & Shorts (50% coverage)
- Casual Wear (70% coverage)
- Long Sleeves (90% coverage)

#### ⚙️ Advanced Settings
- Subscription management (monthly/yearly/lifetime)
- Permission controls (Location, HealthKit, Notifications)
- Feature requests & issue reporting
- Privacy policy & terms of service
- Redo onboarding to re-personalize

---

## 3. Science & How It Works

### Scientific Foundation

Bask is built on **Dr. Michael Holick's formula** for vitamin D photobiology—the gold standard in dermatological research.

#### Core Formula
```
IU = (UV Index / 10) × Minutes × Exposure % × (1 / Skin Multiplier) × Age Factor × Base Rate
```
- **Base Rate:** 100 IU per minute at UV 10, 100% exposure, Type I skin, peak age

### Fitzpatrick Skin Type System

Bask personalizes recommendations based on your Fitzpatrick skin type (derived from skin tone + sun reaction):

| Type | Multiplier | Description |
|------|------------|-------------|
| **I** | 1.0x | Very fair; always burns, never tans |
| **II** | 1.3x | Fair; burns easily, tans minimally |
| **III** | 1.6x | Medium; sometimes burns, tans gradually |
| **IV** | 2.5x | Olive; rarely burns, tans easily |
| **V** | 4.0x | Brown; very rarely burns |
| **VI** | 5.0x | Dark brown to black; never burns |

Higher multipliers mean you need **more** sun exposure to produce the same amount of vitamin D.

### Age-Based Synthesis Adjustment

Vitamin D synthesis declines with age due to reduced 7-dehydrocholesterol in the skin:

| Age Range | Synthesis Capacity |
|-----------|-------------------|
| **< 30** | 100% (peak) |
| **30-49** | 80% |
| **50-69** | 50% |
| **70+** | 30% |

Bask adjusts your recommendations accordingly—older adults need longer exposure times.

### The Shadow Rule (UV < 3 = Zero Synthesis)

Below **UV index 3**, UVB rays are fully scattered by the atmosphere. You get UVA (skin damage) but **zero vitamin D**.

Bask enforces this threshold: no vitamin D credit is awarded when UV < 3.

### Biological Saturation & Burn Safety

Vitamin D synthesis is **self-limiting** at ~1 MED (Minimum Erythemal Dose / time to burn). Beyond this threshold, pre-vitamin D3 converts to inert isomers (lumisterol, tachysterol).

**Burn time at UV index 1:**
| Type | Minutes |
|------|---------|
| I | 67 |
| II | 100 |
| III | 200 |
| IV | 300 |
| V | 400 |
| VI | 500 |

Burn time scales inversely with UV: `Burn Time = Base Time / UV Index`

Bask caps all synthesis calculations at your burn threshold to keep you safe.

### Vitamin D Decay Model

Vitamin D has a **half-life of 15 days** in the body. This means you lose ~4.48% of your stores per day:

```
Remaining = Initial × 0.5^(days/15)
```

Bask shows your "daily decay" amount to motivate consistent replenishment.

### Cloud Cover Heuristic

```
Effective UV = UV Index × (1 - Cloud Cover × 0.7)
```

Thin clouds block less UV than storm clouds—this is an approximation, but generally reliable.

### D-Window Forecast Logic

Our proprietary algorithm:
1. Scores each hour by UV index (0-10 points) + cloud cover (0-5 points)
2. Finds the best contiguous 1-3 hour window
3. Caps session duration at 60 minutes for safety
4. Minimum viable window: 100 IU estimated
5. Generates structured recommendations: action, alert, tip, window types
6. Recommends supplements + SAD lamps when UV is too low

### Key Health Numbers

- **Daily Goal:** 5,000 IU (default, customizable)
- **Optimal Blood Level:** 40-60 ng/mL (100-150 nmol/L)
- **Vitamin D Half-Life:** 15 days
- **K2 Recommendation:** 100-200 mcg per 5,000 IU of vitamin D
- **Magnesium Recommendation:** 300-400 mg daily
- **Sweet Spot UV Range:** 3-8 (typically 10am-2pm)

---

## 4. Privacy Policy (Draft)

> **Note to LLM:** Use this as a foundation, but consult a lawyer for final legal review.

### Last Updated: [Insert Date]

**Bask** ("we," "us," "our") operates the Bask mobile application (the "App"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our App.

---

### 1. Information We Collect

#### 1.1 Personal Information You Provide

During onboarding, we collect:
- **Biological Profile:** Age, weight, weight unit preference
- **Skin & Eye Color:** Visual color selection (6 skin tones, 5 eye colors)
- **Sun Reaction Assessment:** Always burns / Burns then tans / Rarely burns
- **Outdoor Time Assessment:** Daily outdoor time ranges
- **Supplementation Status:** Daily / Occasionally / None
- **Blood Test Baseline (Optional):** 25(OH)D level (ng/mL or nmol/L), test date
- **Primary Goals (Multi-select):** Optimizing Vitamin D Levels, Safe Tanning & Burn Prevention, Circadian Rhythm & Better Sleep, Longevity & Natural Immunity

#### 1.2 Automatically Collected Information

- **Location Data (When In Use):** We access your precise location to fetch real-time UV index and weather data for your area. Location is only used when the app is active.
- **HealthKit Data (If Authorized):**
  - **Read:** "Time in Daylight" to automatically track sun exposure
  - **Write:** Dietary vitamin D to sync your supplement intake with Apple Health
- **Usage Data:** We collect data about your sun exposure sessions, supplement logs, and cofactor tracking (stored locally on your device).

#### 1.3 Third-Party Services

We integrate with:
- **Apple WeatherKit:** For real-time UV index, weather forecasts, and solar event data. Subject to [Apple's Privacy Policy](https://www.apple.com/legal/privacy/).
- **RevenueCat:** For in-app subscription management. Subject to [RevenueCat's Privacy Policy](https://www.revenuecat.com/privacy).
- **Apple HealthKit:** For bidirectional sync of vitamin D and daylight data. Subject to [Apple's Privacy Policy](https://www.apple.com/legal/privacy/).
- **Supabase (optional leaderboard only):** If you opt into the Touch Grass Leaderboard, anonymous session scores are stored for public rankings. Subject to [Supabase's Privacy Policy](https://supabase.com/privacy).

---

### 2. How We Use Your Information

We use your information to:
- **Personalize Recommendations:** Calculate vitamin D synthesis based on your skin type, age, weight, and clothing
- **Provide Real-Time UV Data:** Fetch accurate UV index for your location
- **Track Progress:** Store your sun exposure sessions, supplements, and cofactors
- **Generate Reports:** Create physician reports for medical appointments
- **Send Notifications:** Alert you before optimal D-Windows (if you opt in)
- **Improve the App:** Analyze aggregated, anonymized usage data to enhance features

---

### 3. Data Storage & Security

- **Local Storage:** All personal data is stored **locally on your device** using SQLite. We do **not** transmit your personal health data to our servers by default.
- **Optional Leaderboard:** If you opt into the Touch Grass Leaderboard, only an anonymous name, a random public ID, per-session sun-exposure IU/duration, and optional coarse location labels (country/region/city you choose) are sent to our leaderboard service (Supabase). Supplements and Apple Health data are never included.
- **Cloud Backup:** If you use iCloud backup, your device data may be included in your iCloud backups (controlled by your iOS settings).
- **Security Measures:** We use industry-standard encryption and security practices to protect your data.

---

### 4. Data Sharing & Disclosure

We **do not sell** your personal data. We may share data in the following limited circumstances:
- **With Your Consent:** If you export a physician report, you control where it's shared.
- **Service Providers:** We use Apple WeatherKit and RevenueCat to provide core features (subject to their privacy policies).
- **Legal Obligations:** We may disclose data if required by law or to protect our rights.

---

### 5. Your Rights & Choices

- **Access & Deletion:** You can delete your onboarding data by using "Redo Onboarding" in Settings, which resets your profile.
- **Location Permissions:** You can revoke location access in iOS Settings > Privacy & Security > Location Services > Bask.
- **HealthKit Permissions:** You can revoke HealthKit access in iOS Settings > Privacy & Security > Health > Bask.
- **Notification Permissions:** You can disable notifications in iOS Settings > Notifications > Bask.

---

### 6. Children's Privacy

Bask is not intended for users under 13. We do not knowingly collect data from children under 13. If you believe we have collected data from a child, contact us at `feedback@bask.io`.

---

### 7. Changes to This Policy

We may update this Privacy Policy from time to time. Changes will be posted in the App with an updated "Last Updated" date.

---

### 8. Contact Us

If you have questions about this Privacy Policy, contact us at:
- **Email:** `feedback@bask.io`
- **Website:** [bask.io/privacy](https://bask.io/privacy)

---

## 5. Terms of Service (Draft)

> **Note to LLM:** Consult a lawyer for final legal review.

### Last Updated: [Insert Date]

**Bask** ("we," "us," "our") provides the Bask mobile application (the "App"). By using the App, you agree to these Terms of Service ("Terms").

---

### 1. Acceptance of Terms

By downloading, installing, or using the App, you agree to be bound by these Terms. If you do not agree, do not use the App.

---

### 2. Medical Disclaimer

**IMPORTANT: BASK IS NOT A MEDICAL DEVICE. THE APP IS FOR INFORMATIONAL AND EDUCATIONAL PURPOSES ONLY.**

- The App provides **estimates** of vitamin D synthesis based on scientific models (Holick's formula), but these are **not medical advice**.
- **Do not** rely solely on the App for medical decisions. Consult a licensed healthcare provider before making changes to your vitamin D supplementation or sun exposure habits.
- The App is **not** a substitute for professional medical advice, diagnosis, or treatment.
- **Skin Cancer Risk:** Excessive sun exposure increases skin cancer risk. Always follow safe sun practices. Bask includes burn risk indicators, but you are responsible for your own safety.
- **Supplement Safety:** Vitamin D toxicity is rare but possible at very high doses (>10,000 IU/day for extended periods). Consult a doctor before taking high-dose supplements.

**By accepting the Medical Disclaimer during onboarding, you acknowledge these risks.**

---

### 3. Accuracy of Information

- **UV Data:** We use Apple WeatherKit for real-time UV data. While generally accurate, weather services may occasionally provide incorrect or delayed data.
- **Vitamin D Calculations:** Our D-Engine™ is based on peer-reviewed research, but individual variation exists. Factors like sunscreen, altitude, pollution, and genetics can affect actual vitamin D synthesis.
- **Blood Test Integration:** If you enter a blood test baseline, you are responsible for accuracy. We do not verify lab results.

---

### 4. User Responsibilities

You agree to:
- Provide accurate information during onboarding (age, weight, skin type)
- Use the App responsibly and not exceed safe sun exposure
- Not rely on the App as medical advice
- Comply with all applicable laws

---

### 5. Subscriptions & Payments

- **Premium Plans:** The App offers optional paid subscriptions (monthly, yearly, lifetime) via RevenueCat and Apple's In-App Purchase system.
- **Billing:** Subscriptions auto-renew unless canceled at least 24 hours before the end of the current period.
- **Refunds:** Managed by Apple's App Store. Contact Apple for refund requests.
- **Changes to Pricing:** We reserve the right to change subscription pricing with advance notice.

---

### 6. Intellectual Property

- The App, including all text, graphics, logos, and software, is owned by Bask and protected by copyright and trademark laws.
- You may not copy, modify, distribute, or reverse-engineer the App.

---

### 7. Limitation of Liability

**TO THE MAXIMUM EXTENT PERMITTED BY LAW:**
- Bask is provided "as is" without warranties of any kind, express or implied.
- We are **not liable** for:
  - Sunburns, skin damage, or health issues resulting from App use
  - Inaccurate UV data or vitamin D calculations
  - Data loss or technical issues
  - Any indirect, incidental, or consequential damages

**YOUR USE OF THE APP IS AT YOUR OWN RISK.**

---

### 8. Indemnification

You agree to indemnify and hold harmless Bask, its developers, and affiliates from any claims, damages, or expenses arising from your use of the App or violation of these Terms.

---

### 9. Termination

We may terminate or suspend your access to the App at any time, with or without cause, with or without notice.

---

### 10. Governing Law

These Terms are governed by the laws of [Your Jurisdiction]. Any disputes will be resolved in the courts of [Your Jurisdiction].

---

### 11. Changes to Terms

We may update these Terms from time to time. Continued use of the App after changes constitutes acceptance of the new Terms.

---

### 12. Contact Us

If you have questions about these Terms, contact us at:
- **Email:** `feedback@bask.io`
- **Website:** [bask.io/terms](https://bask.io/terms)

---

## 6. FAQ Section (Marketing & SEO)

### General

**Q: What is Bask?**
A: Bask is an iOS app that helps you track vitamin D from sun exposure and supplements. It uses real-time UV data and personalized calculations to recommend safe sun exposure times and supplement doses.

**Q: Is Bask free?**
A: Bask offers a free tier with core features. Premium plans (monthly, yearly, lifetime) unlock advanced features like D-Window Forecast and physician report export.

**Q: Does Bask work on Android?**
A: Currently, Bask is iOS-only (iPhone & iPad). Android support may come in the future.

---

### Science & Accuracy

**Q: How accurate are the vitamin D calculations?**
A: Bask uses Dr. Michael Holick's peer-reviewed formula, which is the gold standard in photobiology. However, individual variation exists due to factors like sunscreen, altitude, pollution, and genetics. Treat estimates as guidelines, not absolutes.

**Q: Why does Bask ask for my skin color?**
A: Skin type (Fitzpatrick I-VI) dramatically affects vitamin D synthesis. Darker skin requires more sun exposure to produce the same amount of vitamin D as lighter skin.

**Q: Why does Bask ask for my age?**
A: Vitamin D synthesis declines with age. People 70+ produce ~70% less vitamin D than those under 30, even with the same sun exposure.

**Q: What's the "Shadow Rule"?**
A: Below UV index 3, UVB rays are scattered by the atmosphere, so you produce zero vitamin D (but still get UVA damage). Bask only credits vitamin D when UV ≥ 3.

**Q: Can I get vitamin D through a window?**
A: No. Glass blocks UVB rays, so you cannot produce vitamin D through windows.

---

### Safety

**Q: Will Bask prevent me from burning?**
A: Bask includes burn risk indicators and caps recommendations at your personalized burn threshold. However, you are responsible for your own safety. Always monitor your skin and leave the sun if you feel uncomfortable.

**Q: Is sun exposure safe?**
A: Moderate, controlled sun exposure is beneficial for vitamin D production. However, excessive exposure increases skin cancer risk. Bask helps you find the balance—enough sun for vitamin D, but not so much that you burn.

**Q: Should I use sunscreen with Bask?**
A: Sunscreen with SPF 15+ blocks ~99% of vitamin D synthesis. For vitamin D, expose skin **without** sunscreen during short, controlled sessions (10-30 minutes depending on skin type and UV). Apply sunscreen after your vitamin D session if you plan to stay outside longer.

---

### Features

**Q: What is the D-Window Forecast?**
A: Our proprietary feature that analyzes 48 hours of UV and cloud cover data to recommend the best 1-3 hour window for sun exposure. Get alerts before optimal windows open.

**Q: What is the Bask Ring?**
A: A circular progress visualization showing your daily vitamin D intake vs. your goal (default: 5,000 IU). It includes sun sessions, supplements, and cofactors.

**Q: Does Bask track supplements?**
A: Yes! You can log vitamin D supplements (with IU dosage) and cofactors (vitamin K2, magnesium). Bask syncs vitamin D intake to Apple Health.

**Q: Can I export my data for my doctor?**
A: Yes! Use the "Export Physician Report" feature in Settings to generate a professional PDF summarizing your vitamin D tracking.

**Q: Does Bask work with Apple Health?**
A: Yes! Bask reads "Time in Daylight" to estimate passive vitamin D and writes dietary vitamin D back to Apple Health.

---

### Subscriptions

**Q: What's included in Premium?**
A: Premium unlocks:
- D-Window Forecast (48-hour predictions)
- Physician report export
- Advanced insights & trends
- Priority support
- No ads

**Q: How do I cancel my subscription?**
A: Subscriptions are managed through the App Store. Go to Settings > [Your Name] > Subscriptions > Bask > Cancel Subscription.

**Q: Can I get a refund?**
A: Refunds are handled by Apple. Contact Apple Support for refund requests.

---

### Privacy & Security

**Q: Is my health data private?**
A: Yes. All personal data is stored **locally on your device** using encrypted SQLite. We do not transmit your health data to our servers.

**Q: Does Bask sell my data?**
A: **Never.** We do not sell or share your personal data with third parties (except Apple WeatherKit and RevenueCat for core features, subject to their privacy policies).

**Q: Can I delete my data?**
A: Yes. Use "Redo Onboarding" in Settings to reset your profile, or uninstall the app to delete all local data.

---

### Vitamin D Basics

**Q: How much vitamin D do I need?**
A: The default goal is 5,000 IU/day, which aligns with recommendations for optimal blood levels (40-60 ng/mL). Consult your doctor for personalized advice.

**Q: What's a healthy vitamin D blood level?**
A: 40-60 ng/mL (100-150 nmol/L) is considered optimal by many functional medicine practitioners. However, the Endocrine Society's guideline is 30 ng/mL (75 nmol/L).

**Q: Can I get too much vitamin D from the sun?**
A: No. Vitamin D synthesis is self-limiting. Once you reach ~1 MED (time to burn), your body stops producing vitamin D and converts it to inert isomers. This is why Bask caps recommendations at burn threshold.

**Q: Can I get vitamin D toxicity from supplements?**
A: Toxicity is rare but possible at very high doses (>10,000 IU/day for extended periods). Symptoms include nausea, kidney damage, and hypercalcemia. Always consult a doctor before taking high-dose supplements.

**Q: Why does Bask recommend vitamin K2 and magnesium?**
A: Vitamin D, K2, and magnesium work synergistically:
- **K2** directs calcium to bones (not arteries), reducing cardiovascular risk
- **Magnesium** activates vitamin D and prevents deficiency-related side effects
- The "Full D-Stack" is K2 (100-200 mcg) + Magnesium (300-400 mg) per 5,000 IU of D

---

### Troubleshooting

**Q: Why is my vitamin D count at 0 IU?**
A: This happens when UV < 3 (Shadow Rule). Below UV 3, you produce zero vitamin D. Try later in the day when the sun is higher, or supplement instead.

**Q: Why isn't Bask tracking my Apple Health daylight?**
A: Make sure you've granted HealthKit permissions in Settings > Privacy & Security > Health > Bask. Also, ensure your iPhone supports "Time in Daylight" (iOS 17+).

**Q: Why am I not getting D-Window notifications?**
A: Check Settings > Notifications to ensure alerts are enabled. Also verify notification permissions in iOS Settings > Notifications > Bask.

---

## 7. SEO Keywords & Meta

### Primary Keywords
- Vitamin D tracker app
- Sun exposure tracker
- UV index app
- Vitamin D calculator
- Vitamin D from sunlight
- Safe tanning app
- Burn risk calculator

### Secondary Keywords
- Fitzpatrick skin type calculator
- Vitamin D supplement tracker
- Apple Health vitamin D
- Vitamin K2 and magnesium
- Seasonal Affective Disorder (SAD) protocol
- Vitamin D blood test tracking
- Physician vitamin D report

### Long-Tail Keywords
- How much sun exposure for vitamin D
- Best time of day for vitamin D
- Vitamin D synthesis by skin type
- Can you get vitamin D through a window
- Vitamin D and age
- Winter vitamin D strategy
- D-Window forecast
- Safe sun exposure app

### Meta Description (Landing Page)
"Bask: Personalized vitamin D tracking with real-time UV monitoring. Get safe sun exposure recommendations based on your skin type, age, and location. Export reports for your doctor. iOS app with Apple Health sync."

### Meta Description (App Store)
"Track vitamin D from sun & supplements. Personalized for your skin type & age. Real-time UV data, burn risk alerts, D-Window Forecast, Apple Health sync, physician reports. Based on peer-reviewed science."

---

## 8. Social Proof & Trust Signals

### Science-Based
- Built on **Dr. Michael Holick's formula** (gold standard in vitamin D photobiology)
- Peer-reviewed research foundation
- Fitzpatrick skin type system (dermatological standard)
- Transparent calculation methodology

### Apple Ecosystem
- **Apple WeatherKit** integration (official Apple weather data)
- **Apple Health** bidirectional sync
- **Live Activities** (Dynamic Island + Lock Screen)
- Native iOS design with Ionic React
- Haptic feedback throughout

### Medical Integration
- **Physician Report Export** (PDF for doctor visits)
- **Blood Test Baseline** (25(OH)D level calibration)
- Medical disclaimer (transparency about limitations)

### Privacy-First
- **Local storage only** (no cloud servers for health data)
- **No data selling** (explicit commitment)
- **Transparent permissions** (location when in use, HealthKit opt-in)

### Professional Development
- Built with Next.js, Capacitor, SQLite
- Native iOS plugins (not just web wrappers)
- Continuous updates and bug fixes

---

## 9. Pricing & Monetization

### Free Tier
- Real-time UV monitoring
- Sun exposure session tracking
- Supplement & cofactor logging
- Basic Bask Ring progress visualization
- History timeline view
- Apple Health sync

### Premium Tiers

**Monthly Subscription**
- Price: [Set in RevenueCat]
- All free features +
- D-Window Forecast (48-hour predictions)
- Physician report export
- Advanced insights & trends
- Priority support
- Ad-free experience

**Yearly Subscription**
- Price: [Set in RevenueCat]
- All Premium features
- [Discount vs. monthly]

**Lifetime Purchase**
- Price: [Set in RevenueCat]
- All Premium features
- One-time payment, lifetime access
- No recurring fees

### Restore Purchases
- Users can restore purchases if they reinstall the app or use multiple devices

---

## 10. User Journey (Onboarding Flow)

Understanding the onboarding flow helps marketers map the user experience:

1. **Emotional Hook Screen** - Logo + "Get your daily vitamin D—naturally" + "Start My Personalization"
2. **Goal Selection** - Multi-select: Optimizing Vitamin D Levels, Safe Tanning & Burn Prevention, Circadian Rhythm & Better Sleep, Longevity & Natural Immunity
3. **Skin & Eye Color Picker** - Visual swatches (6 skin tones, 5 eye colors)
4. **Sun Reaction Assessment** - Always burns / Burns then tans / Rarely burns
5. **Outdoor Time Assessment** - <15 min / 15-60 min / 1-3 hours / 3+ hours
6. **Supplementation Status** - No / Daily / Occasionally
7. **Biological Profile** - Age, weight (lbs/kg)
8. **Blood Test Baseline** - Optional 25(OH)D level entry (ng/mL or nmol/L) with date
9. **Medical Disclaimer** - Explicit acceptance of "not medical advice"
10. **Location Permission** - Request with explanation
11. **Notification Permission** - Request with explanation
12. **HealthKit Permission** - Request with explanation
13. **Processing Screen** - Animated steps: "Calculating your optimal solar windows...", "Syncing with local UV data...", "Building your [year] Vitamin D plan."

**Total Time:** ~2-3 minutes
**Drop-off Points:** Permission screens (location, notifications, HealthKit)
**Optimization Tips:** Clearly communicate value before permission requests; make blood test optional; reduce friction

---

## 11. Competitor Differentiation

### What Makes Bask Unique

#### vs. General UV Apps (e.g., UV Index Widget)
- **Bask:** Personalized vitamin D calculations based on skin type, age, clothing
- **Competitors:** Generic UV index display (not personalized)

#### vs. Supplement Trackers (e.g., MyFitnessPal)
- **Bask:** Tracks vitamin D from **both sun and supplements**, with real-time synthesis
- **Competitors:** Only track supplements, no sun exposure

#### vs. Sun Safety Apps (e.g., SunSmart)
- **Bask:** Focus on **optimal health** (vitamin D) not just burn prevention
- **Competitors:** Only warn about burns, don't track vitamin D

#### vs. Apple Health
- **Bask:** **Writes** vitamin D data back to Health (supplements + sun), not just reads
- **Apple Health:** Only tracks dietary intake, no sun exposure

---

## 12. Technical Details (For Developer Handoff)

If the landing page includes a developer blog or technical FAQ:

### Tech Stack
- **Frontend:** Next.js 13 (App Router), React 18, TypeScript
- **UI Framework:** Ionic React + Tailwind CSS + DaisyUI
- **Native Bridge:** Capacitor 6.x
- **Database:** SQLite (`@capacitor-community/sqlite`)
- **State Management:** React Context API
- **Charts:** Custom SVG visualizations
- **PDF Generation:** jsPDF + jspdf-autotable
- **Monetization:** RevenueCat + Apple IAP
- **Weather:** Apple WeatherKit (native plugin)
- **Health:** Apple HealthKit (native plugin)

### Custom Capacitor Plugins
- **BaskWeather** - Wraps WeatherKit for UV, forecast, solar events
- **BaskHealth** - Wraps HealthKit for Time in Daylight, dietary vitamin D
- **BaskLiveActivity** - Lock Screen + Dynamic Island Live Activities
- **BaskBackgroundTask** - BGTaskScheduler for background weather refresh

### iOS Permissions Required
- Location When In Use
- HealthKit Read (Time in Daylight, Vitamin D)
- HealthKit Write (Vitamin D)
- Local Notifications
- Background Modes (fetch, processing)

---

## 13. Content Opportunities (Blog/SEO)

Suggested blog post topics to drive organic traffic:

1. **"How Much Sun Exposure Do You Need for Vitamin D? (Based on Your Skin Type)"**
2. **"The Shadow Rule: Why You Can't Get Vitamin D Through a Window"**
3. **"Vitamin D Deficiency in Winter: Science-Based Strategies"**
4. **"The Full D-Stack: Vitamin D, K2, and Magnesium Explained"**
5. **"Fitzpatrick Skin Types: How Your Skin Color Affects Vitamin D Synthesis"**
6. **"Can You Get Vitamin D on a Cloudy Day?"**
7. **"Vitamin D and Aging: Why Older Adults Need More Sun"**
8. **"The Best Time of Day for Vitamin D (UV Index Sweet Spot)"**
9. **"Sunscreen vs. Vitamin D: How to Balance Sun Safety and Nutrition"**
10. **"Vitamin D Blood Test: What Your 25(OH)D Level Means"**

---

## 14. Press Kit (Media Assets)

### Boilerplate Description
"Bask is an iOS app that helps users track vitamin D from sun exposure and supplements. Using real-time UV data and personalized calculations based on skin type and age, Bask recommends safe sun exposure times and supplement doses. Built on Dr. Michael Holick's peer-reviewed photobiology research, Bask integrates with Apple Health and WeatherKit for seamless tracking. Features include Live Activities, D-Window Forecast, physician report export, and the Full D-Stack protocol (vitamin D + K2 + magnesium)."

### Screenshots to Include
1. Home screen with Bask Ring + Bask Now button
2. Active session view with timer + IU counter
3. D-Window Forecast card
4. History timeline view
5. Vitamin D trend chart
6. Onboarding screens (skin color picker, biological profile)
7. Settings page
8. Live Activity (Lock Screen widget)

### Logo Formats
- PNG (transparent background)
- SVG (vector)
- App icon (rounded square)

### Media Contact
- **Email:** `feedback@bask.io`
- **Website:** `bask.io`

---

## 15. Call-to-Action (CTA) Variations

### Landing Page Hero
- "Start Tracking Your Vitamin D Today"
- "Get Your Personalized Solar Plan"
- "Download Now – Free on iOS"

### Feature Section CTAs
- "See How It Works"
- "Explore the D-Engine"
- "Learn More About D-Windows"

### Pricing Page CTAs
- "Start Free Trial"
- "Upgrade to Premium"
- "Get Lifetime Access"

### Blog Post CTAs
- "Track Your Vitamin D with Bask"
- "Download the Free App"
- "Try Bask Today"

---

## 16. App Store Optimization (ASO)

### App Name
"Bask – Vitamin D Tracker"

### Subtitle (30 characters)
"Sun Exposure & UV Monitor"

### Keywords (100 characters)
"vitamin d,uv index,sun exposure,vitamin k2,magnesium,health,supplements,apple health,weather,skin"

### Promotional Text (170 characters)
"NEW: D-Window Forecast predicts the best sun exposure times for the next 48 hours. Get alerts before optimal windows open. Upgrade to Premium today!"

### Description (First 2 Lines - Critical for Conversion)
"Track vitamin D from sun exposure and supplements. Personalized for your skin type and age with real-time UV monitoring."

---

## 17. Legal Disclaimers (Reinforce Throughout Site)

**Medical Disclaimer Footer:**
"Bask is not a medical device. The app is for informational purposes only and does not provide medical advice. Consult a licensed healthcare provider before making changes to your vitamin D supplementation or sun exposure habits."

**Skin Cancer Warning Footer:**
"Excessive sun exposure increases skin cancer risk. Always follow safe sun practices and monitor your skin for changes."

**Accuracy Disclaimer:**
"Vitamin D calculations are estimates based on scientific models (Holick's formula). Individual variation exists due to factors like sunscreen, altitude, pollution, and genetics."

---

## 18. Localization Notes (Future Expansion)

Currently, Bask is **English-only** (US). Potential future markets:

- **UK/Europe:** Use nmol/L as default (not ng/mL)
- **Australia:** High UV index, strong sun safety culture
- **Scandinavia:** Vitamin D deficiency common due to low winter sun
- **Middle East:** High UV but cultural clothing coverage (adjust for modesty)

---

## 19. Partnership Opportunities

### Healthcare Providers
- Offer Bask as a patient tool for vitamin D optimization
- Physician report export facilitates doctor-patient communication

### Supplement Brands
- Co-marketing with vitamin D, K2, magnesium brands
- Affiliate partnerships for recommended products

### Fitness & Wellness Influencers
- Longevity community (Peter Attia, Andrew Huberman listeners)
- Functional medicine practitioners
- Circadian rhythm optimization enthusiasts

### Dermatology Clinics
- Partner with clinics for safe sun exposure education
- Balance sun safety with vitamin D needs

---

## 20. Success Metrics (For Marketing Teams)

### Acquisition Metrics
- App Store impressions
- App Store conversion rate
- Organic search traffic (SEO)
- Referral traffic (influencers, press)

### Activation Metrics
- Onboarding completion rate
- First session logged within 24 hours
- HealthKit connection rate
- Location permission grant rate

### Retention Metrics
- Day 1, 7, 30 retention
- Weekly active users (WAU)
- Average sessions per week
- Streak days (daily usage)

### Monetization Metrics
- Free-to-paid conversion rate
- Premium subscriber count
- Average revenue per user (ARPU)
- Lifetime value (LTV)

### Referral Metrics
- App Store rating (target: 4.8+)
- App Store reviews
- Social shares (physician reports, streaks)

---

## 21. Testimonials & User Stories (To Collect)

Suggested user personas for testimonials:

1. **The Longevity Optimizer** - "I track my vitamin D as closely as my sleep and HRV. Bask makes it effortless."
2. **The Vitamin D Deficient** - "My doctor said my levels were dangerously low. Bask helped me get them back up without overdoing supplements."
3. **The Skin Type IV-VI User** - "Finally, an app that understands darker skin needs more sun. Bask is personalized for me."
4. **The Seasonal Affective Disorder (SAD) Sufferer** - "Bask's winter strategy and SAD protocol have been game-changing for my mood."
5. **The Parent** - "I use Bask to make sure my kids get enough vitamin D without burning. The burn risk indicator is invaluable."

---

## 22. Feature Roadmap (Tease Future Features)

Mention "coming soon" features to generate excitement:

- **Android version** (requested by users)
- **Auto-sync blood test results from Apple Health** (already mentioned in onboarding)
- **Wearable integration** (Apple Watch app for quick session starts)
- **Community challenges** (streaks, leaderboards)
- **Food-based vitamin D tracking** (salmon, fortified milk, etc.)
- **Advanced lab markers** (PTH, calcium, magnesium levels)
- **Family sharing** (track multiple family members)

---

## 23. Exit Intent Popup (Landing Page)

**Headline:** "Wait! Get Your Free Vitamin D Guide"
**Subheadline:** "Enter your email to download our 10-page guide: *Optimizing Vitamin D Naturally*"
**CTA:** "Send Me the Guide"
**Incentive:** PDF guide with:
- Fitzpatrick skin type quiz
- Optimal sun exposure times by latitude
- Supplement dosing strategies
- Full D-Stack protocol
- Winter optimization tips

---

## Conclusion

This document contains **everything** needed to build a comprehensive, SEO-optimized landing page for Bask. Use it to create:

✅ Features section (organized by category)
✅ Privacy policy (based on actual data collection)
✅ Terms of service (with medical disclaimers)
✅ FAQ section (marketing & troubleshooting)
✅ SEO keywords & meta descriptions
✅ Social proof / trust signals
✅ Pricing page
✅ Blog post ideas
✅ Press kit
✅ ASO optimization

**Good luck building the landing page!** 🌞
