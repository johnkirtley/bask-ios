# Simulator Testing Checklist From 2c92771

Base commit: `2c92771c7d792e91dab02bbc916f8bc29da0146f`  
Includes changes through the review-prompt work after `956cef3`.

Use this as a manual simulator checklist. Mark items off as tested.

## Setup

- [ ] Build and install the current app in the iOS simulator.
- [ ] Start with a clean app state when testing onboarding-specific behavior.
- [ ] For repeat onboarding tests, reset app data or uninstall/reinstall the app.
- [ ] Confirm the app opens without startup crashes.

## Onboarding And Review Prompt

- [ ] Complete onboarding through the plan-generation screen.
- [ ] Confirm no native App Store review prompt appears automatically before the `Enjoying Bask?` prompt.
- [ ] Confirm the `Enjoying Bask?` prompt appears after the plan is generated.
- [ ] Tap `Yes` and confirm the app requests the native App Store review prompt. Apple may suppress the visible native prompt in simulator.
- [ ] After tapping `Yes`, confirm future `Enjoying Bask?` prompts are suppressed after app relaunch.
- [ ] Repeat from clean state, tap `Not really`, and confirm the feedback confirmation appears.
- [ ] Tap `No thanks` and confirm the app stays on the plan screen without opening Mail.
- [ ] Repeat from clean state, tap `Not really`, then `Send feedback`, and confirm feedback email routing opens.
- [ ] After tapping `Not really`, confirm future `Enjoying Bask?` prompts are suppressed after app relaunch.
- [ ] Confirm `See my plan` still works after either prompt response.
- [ ] Confirm the post-onboarding paywall flow still appears as expected after onboarding completion.

## Location Prompt After Onboarding Opt-Out

- [ ] Complete onboarding without granting location permission.
- [ ] Confirm the Home header shows a clear prompt to connect location for live UV data.
- [ ] Tap the location prompt and confirm it opens the expected location permission/settings flow.
- [ ] Grant location permission if available and confirm Home updates from fallback/simulated state toward live location state.

## D-Window Forecast Timing

- [ ] Test during an active or mocked D-window hour, such as a 10:00-11:00 viable block at about 10:05.
- [ ] Confirm the recommended start is a near-future rounded time, such as about 10:10, not 10:00.
- [ ] Test near the end of a viable hour, such as about 10:55.
- [ ] Confirm the app does not recommend starting at the already-passed hour.
- [ ] Confirm notification scheduling does not produce a past D-window start time.
- [ ] Confirm tomorrow’s D-window still displays normally.

## Apple Health And Supplements

- [ ] Complete a sun session with nonzero IU.
- [ ] Confirm the session still saves locally in History with duration and IU.
- [ ] Confirm completing a sun session does not write dietary Vitamin D to Apple Health.
- [ ] Log a Vitamin D supplement.
- [ ] Confirm the supplement still saves locally.
- [ ] If HealthKit sync is enabled and available, confirm supplement logging still writes dietary Vitamin D to Apple Health.
- [ ] Confirm Apple Health permission/settings copy describes Time in Daylight reads and supplement sync.

## Passive Daylight HealthKit Sync

- [ ] If HealthKit Time in Daylight is available, enable Apple Health sync.
- [ ] Confirm meaningful passive daylight can still appear in daily totals.
- [ ] Confirm tiny or negligible passive daylight amounts do not create noisy HealthKit-derived sessions.
- [ ] Confirm manual sun sessions are not double-counted against passive daylight estimates.

## Home Value-Driven Review Touchpoint

- [ ] If the onboarding `Enjoying Bask?` prompt was skipped or suppressed only by cooldown, complete enough value events to qualify: multiple app opens plus sun sessions or supplement logs.
- [ ] Confirm the Home value-driven `Enjoying Bask?` prompt appears only after eligibility is met.
- [ ] Confirm the Home prompt does not appear during an active or paused sun session.
- [ ] Confirm the Home prompt does not appear within 24 hours of dismissing a paywall.
- [ ] Confirm a positive response requests native review and suppresses future review prompts.
- [ ] Confirm a negative response shows the feedback confirmation and suppresses future review prompts.
- [ ] Confirm `No thanks` keeps the user in the app.
- [ ] Confirm `Send feedback` opens feedback email.

## Leaderboard And Session Completion Regression

- [ ] Complete a normal sun session.
- [ ] Confirm the session completion flow is stable and does not hang.
- [ ] Confirm leaderboard opt-in users still submit completed session score data.
- [ ] Confirm non-opted-in users do not unexpectedly join or upload personal data.
- [ ] Confirm History still shows completed sun sessions correctly.

## Hold-To-Stop And Active Session Regression

- [ ] Start a sun session.
- [ ] Pause and resume the session.
- [ ] End the session through the current stop/end control.
- [ ] Confirm the active session UI exits cleanly.
- [ ] Confirm no removed hold-to-stop behavior is still referenced in the UI.

## Settings And Feedback

- [ ] Open Settings.
- [ ] Tap Rate App and confirm it requests the native App Store review prompt on iOS. Apple may suppress the visible prompt in simulator.
- [ ] Tap Report Issue and confirm feedback email routing opens.
- [ ] Open premium-gated controls and dismiss the paywall.
- [ ] Confirm dismissing the paywall does not break Settings interaction.

## Backlog Status

- [ ] Confirm `APP_BACKLOG.md` shows completed items for HealthKit dietary writes, D-window timing, and value-based review prompts.
- [ ] Confirm the next open backlog item is `Add UV Data Confidence Labels To Add Session`.
