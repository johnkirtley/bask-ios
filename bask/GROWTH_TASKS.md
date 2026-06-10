# Bask Growth Tasks

Last updated: 2026-06-01

Use this file to track growth, monetization, reviews, App Store conversion, and acquisition work. `APP_BACKLOG.md` remains the source of truth for implementation tasks that need to land in the app.

## Current Focus

### 1. Improve App Store Review Ask Timing

Priority: P0  
Status: Ready for implementation  
Primary KPI: App Store review count and average rating

Goal:

- Stop spending Apple's limited review prompt opportunities immediately after onboarding.
- Ask only after users have experienced real product value.
- Route unhappy or blocked users toward support/feedback instead of repeated review asks.

Implementation scope:

- Remove the automatic review request from the onboarding results flow.
- Add a `ReviewPromptManager` or equivalent review eligibility service.
- Track app opens, sun-session completions, supplement logs, review ask attempts, and recent paywall dismissal timing.
- Trigger review eligibility only after a value moment, such as:
  - 3+ app opens across at least 3 days.
  - 2+ completed sun sessions, or 5+ supplement logs for supplement-focused users.
  - No paywall dismissal in the last 24 hours.
  - No active sun timer/session.
  - At least 45 days since the last internal review ask.
  - Fewer than 3 internal asks in the last year.
- Use a lightweight feedback prompt before requesting an App Store review:
  - Positive response: request the native Apple review prompt.
  - Negative response: open feedback/support.
- Track review-related analytics events.

Acceptance criteria:

- No native review request fires during onboarding.
- Review request can only happen through the new eligibility rules.
- Review prompt state persists across app launches.
- Review flow never interrupts an active sun session.
- Review analytics are emitted without storing personal health data.

Notes:

- Avoid copy or behavior that feels like rating manipulation. The first prompt should be framed as product feedback, not as a direct request to rate the app.
- Do not mark a user as having reviewed the app just because the native review API was requested; Apple may choose not to show the prompt.

## Open Growth Tasks

### 2. Instrument Full Funnel Analytics

Priority: P0  
Status: Planned  
Primary KPI: install -> onboarding -> paywall -> trial/purchase -> retention visibility

Track missing funnel events around paywall outcomes, trial starts, purchase success/failure, restore success, review prompt behavior, and core activation events.

### 3. Improve Onboarding Intent Capture

Priority: P0  
Status: Planned  
Primary KPI: onboarding completion rate and paywall conversion

Capture why the user installed Bask so the plan, paywall, and follow-up messaging can match intent.

### 4. Personalize Paywall Messaging By Intent

Priority: P0  
Status: Planned  
Primary KPI: paywall conversion rate

Use onboarding intent to emphasize the right value angle: low bloodwork, winter sunlight, supplement consistency, safe sun exposure, or longevity.

### 5. Test Annual Default And Trial Offer

Priority: P0  
Status: Planned  
Primary KPI: annual purchase share, trial start rate, trial-to-paid conversion

Test annual as the default plan and validate whether a trial improves conversion without lowering subscriber quality.

### 6. Package Blood Test Logging As Premium Value

Priority: P1  
Status: Planned  
Primary KPI: premium conversion among users with low or recent bloodwork

Bask already has blood test capture. The growth task is to make it clearer, more useful, and more monetizable through trends, reminders, and paywall messaging.

### 7. Add Methodology And Accuracy Screen

Priority: P1  
Status: Planned  
Primary KPI: paywall conversion, support questions, App Review confidence

Explain how Bask estimates vitamin D from sunlight, UV/weather, user profile, supplements, and bloodwork while keeping medical claims appropriately bounded.

### 8. Rewrite App Store Screenshots Around Outcomes

Priority: P1  
Status: Planned  
Primary KPI: App Store product page conversion

Use outcome-led screenshot titles such as:

- Know if today is worth going outside.
- Find your best vitamin D window.
- Track sunlight and supplements together.
- Avoid overexposure with burn awareness.
- See your 7, 30, and 90-day trends.

### 9. Create App Store Custom Product Pages

Priority: P1  
Status: Planned  
Primary KPI: custom product page conversion vs. default page

Create intent-specific pages for vitamin D tracking, UV for vitamin D, winter vitamin D, low vitamin D, sun exposure tracking, supplement tracking, and safe sun timing.

### 10. Run Exact-Match Apple Search Ads Tests

Priority: P1  
Status: Planned  
Primary KPI: CPI, CAC, payback period, ROAS

Start with tightly scoped high-intent keywords only after funnel tracking is trustworthy.

### 11. Build Winter / Low-D Content Funnel

Priority: P1  
Status: Planned  
Primary KPI: organic installs and qualified App Store visits

Focus content around winter sunlight, low vitamin D, and practical daily decisions like whether today is worth going outside.

## Later

### Shareable Daily D-Window Card

Priority: P2  
Status: Later

Create a lightweight organic loop from a visually shareable daily sunlight/vitamin D window.

### Smart Reminders

Priority: P2  
Status: Later

Add contextual reminders once core review, onboarding, analytics, and paywall work is measurable.

### Competitor Comparison Pages

Priority: P2  
Status: Later

Target high-intent searches such as `Bask vs D Minder` and `best vitamin D tracker app`.

### Seasonal Paywalls

Priority: P2  
Status: Later

Test after the base paywall and onboarding intent messaging are instrumented.

## Completed

No growth tasks completed yet.
