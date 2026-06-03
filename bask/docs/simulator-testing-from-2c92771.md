# Simulator Testing Checklist From 2c92771

Base commit: `2c92771c7d792e91dab02bbc916f8bc29da0146f`  
Includes changes through the review-prompt work after `956cef3`.

Use this as a manual simulator checklist. Mark items off as tested.

## Setup

- [x] Build and install the current app in the iOS simulator.
- [ ] Start with a clean app state when testing onboarding-specific behavior.
- [x] For repeat onboarding tests, reset app data or uninstall/reinstall the app.
- [x] Confirm the app opens without startup crashes.

## Onboarding And Review Prompt

- [x] Complete onboarding through the plan-generation screen.
- [ ] Confirm the new Vitamin D goal screen appears after the supplement question.
- [ ] Confirm `2,000 IU` is preselected on the Vitamin D goal screen.
- [ ] Select each goal option (`600`, `1,000`, `2,000`, `4,000`, and `5,000` IU) and confirm the selection state is clear.
- [ ] Continue onboarding and confirm the selected goal is used on Home after onboarding completes.
- [ ] Redo onboarding for an existing install and confirm existing saved users are not silently migrated before choosing a new goal.
- [ ] Confirm the Vitamin D goal note mentions `600 IU` as the baseline NIH recommendation and tells users to ask their healthcare provider.
- [x] Confirm no native App Store review prompt appears automatically before the `Enjoying Bask?` prompt.
- [x] Confirm the custom `Happy with Bask?` prompt appears after the plan is generated.
- [x] Tap the heart button and confirm the app requests the native App Store review prompt. Apple may suppress the visible native prompt in simulator.
- [x] After tapping `Yes`, confirm future `Enjoying Bask?` prompts are suppressed after app relaunch.
- [ ] Repeat from clean state, tap the unhappy button, and confirm the feedback confirmation appears with the same dark custom modal style.
- [ ] Tap `No thanks` and confirm the app stays on the plan screen without opening the Tally feedback form.
- [ ] Repeat from clean state, tap `Not really`, then `Send feedback`, and confirm the Tally feedback form opens to `https://tally.so/r/9qMbjE`.
- [ ] After tapping `Not really`, confirm future `Enjoying Bask?` prompts are suppressed after app relaunch.
- [x] Confirm `See my plan` still works after either prompt response.
- [x] Confirm the post-onboarding paywall flow still appears as expected after onboarding completion.

## Location Prompt After Onboarding Opt-Out

- [x] Complete onboarding without granting location permission.
- [x] Confirm the Home header shows a clear prompt to connect location for live UV data.
- [x] Tap the location prompt and confirm it opens the expected location permission/settings flow.
- [x] Grant location permission if available and confirm Home updates from fallback/simulated state toward live location state.

## D-Window Forecast Timing

- [x] Test during an active or mocked D-window hour, such as a 10:00-11:00 viable block at about 10:05.
- [x] Confirm the recommended start is a near-future rounded time, such as about 10:10, not 10:00.
- [ ] Test near the end of a viable hour, such as about 10:55.
- [ ] Confirm the app does not recommend starting at the already-passed hour.
- [ ] Confirm notification scheduling does not produce a past D-window start time.
- [x] Confirm tomorrow’s D-window still displays normally.
- [ ] Before sunset, force or observe a no-window Today state and confirm it still shows `No window right now` with check-back-later copy.
- [ ] After local sunset, force or observe a no-window Today state and confirm it shows `Sun has set` with `No D-window is available for the rest of today.`
- [ ] Confirm the after-sunset state does not direct free-tier users toward tomorrow’s locked forecast.

## Apple Health And Supplements

- [x] Complete a sun session with nonzero IU.
- [x] Confirm the session still saves locally in History with duration and IU.
- [x] Confirm completing a sun session does not write dietary Vitamin D to Apple Health.
- [x] Log a Vitamin D supplement.
- [x] Confirm the supplement still saves locally.
- [x] If HealthKit sync is enabled and available, confirm supplement logging still writes dietary Vitamin D to Apple Health.
- [x] Confirm Apple Health permission/settings copy describes Time in Daylight reads and supplement sync.

## Passive Daylight HealthKit Sync

- [ ] If HealthKit Time in Daylight is available, enable Apple Health sync.
- [ ] Confirm meaningful passive daylight can still appear in daily totals.
- [ ] Confirm tiny or negligible passive daylight amounts do not create noisy HealthKit-derived sessions.
- [ ] Confirm manual sun sessions are not double-counted against passive daylight estimates.

## Home Value-Driven Review Touchpoint

- [ ] If the onboarding `Enjoying Bask?` prompt was skipped or suppressed only by cooldown, complete enough value events to qualify: multiple app opens plus sun sessions or supplement logs.
- [ ] Confirm the Home value-driven `Happy with Bask?` prompt appears only after eligibility is met.
- [ ] Confirm the Home prompt does not appear during an active or paused sun session.
- [ ] Confirm the Home prompt does not appear within 24 hours of dismissing a paywall.
- [ ] Confirm tapping the heart button requests native review and suppresses future review prompts.
- [ ] Confirm tapping the unhappy button shows the same dark custom feedback confirmation and suppresses future review prompts.
- [ ] Confirm `No thanks` keeps the user in the app.
- [ ] Confirm `Send feedback` opens the Tally feedback form at `https://tally.so/r/9qMbjE`.

## Home Trial Offer

- [ ] As a free user, confirm the free trial offer card appears directly below `Daily Goal Streak` with the warm solar-gradient CTA styling.
- [ ] Tap the free trial offer card and confirm the RevenueCat paywall opens.
- [ ] Dismiss the paywall and confirm Home remains usable.
- [ ] As a premium user, confirm the free trial offer card is hidden.

## Leaderboard And Session Completion Regression

- [ ] Complete a normal sun session.
- [ ] Confirm the session completion flow is stable and does not hang.
- [ ] Confirm leaderboard opt-in users still submit completed session score data.
- [ ] Confirm non-opted-in users do not unexpectedly join or upload personal data.
- [ ] Confirm History still shows completed sun sessions correctly.

## Hold-To-Stop And Active Session Regression

- [x] Start a sun session.
- [x] Pause and resume the session.
- [x] End the session through the current stop/end control.
- [x] Confirm the active session UI exits cleanly.
- [x] Confirm no removed hold-to-stop behavior is still referenced in the UI.

## Sunburn Risk Pro Gate

- [ ] As a new free user after `SUNBURN_RISK_PRO_GATE_CUTOFF_ISO`, confirm Home still shows the `Sunburn Risk` label but the dynamic value is replaced by the Pro lock treatment.
- [ ] Confirm the locked Home Pro badge and `Unlock Sunburn Risk` label are left-aligned under the `Sunburn Risk` heading.
- [ ] Confirm the locked Home sunburn value does not reveal the real risk label or time behind the lock.
- [ ] Tap the locked Home sunburn value and confirm the RevenueCat paywall opens.
- [ ] Dismiss the paywall and confirm Home remains usable.
- [ ] Start a live sun session as a locked free user.
- [ ] Confirm the live-session `Sunburn Risk In` tile still shows its label and pink accent, but the countdown value is replaced by the Pro lock treatment.
- [ ] Confirm the locked live-session Pro badge and `Unlock Sunburn Risk` label are left-aligned inside the tile.
- [ ] Confirm the locked live-session value does not reveal the real countdown behind the lock.
- [ ] Tap the locked live-session value and dismiss the RevenueCat paywall.
- [ ] Confirm the live session remains active, the elapsed timer continues, IU tracking continues, and Pause/Stop still work.
- [ ] If testing purchase or restore, complete it from the live-session paywall and confirm the session stays active while the sunburn countdown unlocks.
- [ ] If Live Activities are available in the simulator/device build, confirm the Lock Screen/Dynamic Island does not show the real burn timing for locked free users.
- [ ] Confirm an existing/grandfathered free install with a profile created before `SUNBURN_RISK_PRO_GATE_CUTOFF_ISO` still sees the real Home and live-session sunburn values.
- [ ] On a real phone that previously downloaded Bask, confirm visible Sunburn Risk is expected only when the local profile `created_at` predates `SUNBURN_RISK_PRO_GATE_CUTOFF_ISO`.

## Settings And Feedback

- [ ] Open Settings.
- [ ] Tap `Share a Link to Bask` and confirm the native share sheet opens with `https://apps.apple.com/us/app/bask-vitamin-d-sun-tracker/id6758405235`.
- [ ] Tap Rate App and confirm it requests the native App Store review prompt on iOS. Apple may suppress the visible prompt in simulator.
- [ ] Tap Report Issue and confirm the Tally feedback form opens to `https://tally.so/r/9qMbjE`.
- [ ] Open premium-gated controls and dismiss the paywall.
- [ ] Confirm dismissing the paywall does not break Settings interaction.

## Backlog Status

- [ ] Confirm `APP_BACKLOG.md` shows completed items for HealthKit dietary writes, D-window timing, value-based review prompts, the sunburn risk Pro gate, and the onboarding/trial/share/review prompt update.
- [ ] Confirm the next open backlog item is `Add UV Data Confidence Labels To Add Session`.
