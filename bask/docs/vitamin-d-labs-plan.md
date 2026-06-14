# Plan: Track Vitamin D Labs Over Time

## Context

The **"Track Vitamin D labs over time"** Linear project (Bask App team, 10 issues: BASKAPP-7 → 16) asks users to log 25(OH)D blood results after lab work and watch their serum levels trend over time. This is positioned as a **retention / switching-cost driver** (the longer a user logs, the more valuable the chart) and a **PRO conversion lever**. A sibling project ("Estimate user's vitamin D levels", no issues yet) will later consume this lab data to calibrate IU→serum estimates, so the data layer must be reusable.

**Today the app already has a *single* blood-test value** — `blood_test_value/unit/date/source` columns on the single-row `bask_user_profile` table (schema migration 3). It is surfaced in Settings (`BloodTestModal`) and onboarding (`BloodTestScreen`), and feeds:
- `getBloodTestCalibration()` (`bask/lib/bloodTestUtils.ts`) → supplement recommendations in `SupplementCard.tsx`
- the physician report export (`bask/lib/services/physicianReportService.ts`)

This feature **evolves that single value into a multi-record history** with charting, reference-range interpretation, an empty state, and PRO gating.

### Confirmed product decisions
1. **Placement:** new **"Labs"** segment on the Insights tab → `Trends | Labs | Learn`. The serum chart lives alongside the existing IU trend chart; the Settings blood-test row deep-links here.
2. **PRO gating:** **free teaser** = view single most-recent result + status band; **PRO** = logging multiple results, full history list, and the trend chart. Mirrors the existing 7-day-free / 30-90-day-PRO pattern.
3. **Data model:** new `bask_lab_results` table is the **source of truth**. Migrate the existing single value in as the first row. On every add/edit/delete, mirror the *most-recent* result back into the existing `blood_test_*` profile columns so `getBloodTestCalibration`, `SupplementCard`, and `physicianReportService` keep working **untouched**.

---

## Architecture & data layer

**Stack:** Next.js 13 + React + Ionic React + Tailwind/DaisyUI, wrapped by Capacitor; local **SQLite** via `@capacitor/sqlite`. Data access is a **repository pattern** (`bask/lib/database/repositories/*`), with a web/dev fallback to seeded data via `bask/lib/database/devSeed.ts`.

### 1. Schema migration — BASKAPP-9 (foundation, do first)
Add migration **version 7** to `bask/lib/database/schema.ts` (append to the `migrations` array; the runner is non-destructive and version-gated):

```sql
CREATE TABLE IF NOT EXISTS bask_lab_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  value_ng_ml REAL NOT NULL,            -- canonical internal unit (ng/mL)
  entered_value REAL NOT NULL,          -- value as the user typed it
  entered_unit TEXT NOT NULL DEFAULT 'ng/mL' CHECK (entered_unit IN ('ng/mL','nmol/L')),
  test_date TEXT NOT NULL,              -- YYYY-MM-DD
  source TEXT NOT NULL DEFAULT 'manual',
  lab_name TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_bask_lab_results_test_date ON bask_lab_results(test_date);
```
- **Seed the existing baseline:** in the same migration, `INSERT ... SELECT` the current `bask_user_profile` row into `bask_lab_results` when `blood_test_value IS NOT NULL` (convert to ng/mL inline, mirror `entered_value/unit`, `test_date`, `source`). This is the non-destructive bridge required by BASKAPP-9's acceptance criteria.
- Store **canonical ng/mL** internally; convert on display (BASKAPP-11).

### 2. Repository — BASKAPP-9
New `bask/lib/database/repositories/labResultsRepository.ts`, modeled on `sessionsRepository.ts`:
- `LabResult` / `NewLabResult` interfaces.
- `create`, `update`, `delete`, `getById`, `getAll()` (ordered by `test_date` ASC for charts / DESC for the list), `getMostRecent()`.
- **`syncLatestToProfile()`** private helper called after every mutation: read most-recent row, write `blood_test_value/unit/date/source` via `userProfileRepository.update(...)` (or `clearBloodTest()` when the last row is deleted). This keeps the calibration/supplement/physician-export consumers working with zero changes.
- Add a web/dev seed branch in `devSeed.ts` and export from `bask/lib/database/index.ts`.

### 3. Units — BASKAPP-11
- Reuse the existing constant **1 ng/mL = 2.5 nmol/L** already encoded in `normalizeToNgMl()` (`bask/lib/bloodTestUtils.ts`). Add the inverse `ngMlToNmol()` + a `formatLabValue(ngMl, unit)` helper there (single source of truth).
- Add a **user-level preferred unit**: reuse the key-value `settings` table via `settingsRepository.ts` (`labUnitPreference`), defaulting from device locale (US → ng/mL, else nmol/L). Entry, list, chart, and interpretation all read it.

### 4. Interpretation + compliance copy — BASKAPP-14 (compliance-sensitive)
New `bask/lib/labInterpretation.ts` holding the **only** copy of thresholds + bands. Reuse the existing `BloodTestStatus` union and `classifyNgMl` thresholds already in `bloodTestUtils.ts` (deficient <20, insufficient <30, sufficient <50, optimal ≥50 ng/mL) — promote them here as exported config so they're adjustable without touching copy.
- Per-band `{ label, color, helperCopy }` using **hedged, non-diagnostic** language ("in the range generally considered…", "associated with…"), never diagnosis/treatment/dosing.
- Reuse the existing standard disclaimer string pattern already shown on Insights (`bask/app/insights/page.tsx` bottom disclaimer) wherever interpretation appears.
- Band colors map to existing tokens: deficient→`bask-pink`/red, insufficient→`solar-warm`, sufficient→`solar-flare`, optimal→`grove-green`.

---

## UI / components (matching the Bask aesthetic)

**Design tokens** (from `bask/tailwind.config.ts`): warm cream surfaces (`light-bg #FBF6EB`), white cards `rounded-card` (28px), warm `text-primary/secondary`, accent `solar-flare #FFC93C`, charts in `bask-teal #1AA1A2`, success `grove-green #5BB47A`. Eyebrow labels are `text-[11px] font-extrabold uppercase tracking-[0.12em]`; numbers use `tabular-nums`; sheets are `IonModal` with `initialBreakpoint`; selected pills use `bg-[#572A19] text-white`; PRO-locked controls show the small lock SVG + route through `presentPaywall()` from `useSubscription()`.

### A. Labs tab on Insights — BASKAPP-8/13/16
Edit `bask/app/insights/page.tsx`: widen `activeTab` to `'trends' | 'labs' | 'learn'`, add the third segment button, and render a new `<LabResultsPanel />` for `labs`. The panel orchestrates empty-state vs teaser vs full view based on result count + `isPremium`.

New components under `bask/components/labs/`:

- **`LabResultsPanel.tsx`** — loads results + unit pref; decides which state to show; owns the add/edit modal and refresh.
- **`LabSerumChart.tsx`** — **BASKAPP-13 (hero visual, High).** Fork the proven SVG approach from `bask/components/history/VitaminDTrendChart.tsx` (viewBox scaling, gradient area, `#1AA1A2` line, cream-stroked points). Differences:
  - Y-axis = serum ng/mL (respect unit pref); X-axis = `test_date` (irregular spacing — scale by actual date, not even index).
  - **Shaded horizontal reference-range bands** behind the line (deficient/insufficient/sufficient/optimal) pulled from `labInterpretation.ts` — no thresholds hardcoded in the chart.
  - **Sparse-data handling:** 1 point → render a single labeled dot + "add another to see your trend"; 2 points → straight segment. Must read well at 1, 2, many points (acceptance).
- **`LabResultCard.tsx` + `LabHistoryList.tsx`** — **BASKAPP-12 (edit & delete).** Reverse-chronological list reusing `SwipeableCard` (`bask/components/history/SwipeableCard.tsx`) for swipe-to-delete and `IonAlert` for delete confirmation, exactly like `bask/app/history/page.tsx`. Each card: value in preferred unit, status band chip, test date, lab/notes preview. Tap → edit modal. Edits/deletes refresh chart + interpretation immediately (optimistic update pattern already used in history page).
- **`LabResultModal.tsx`** — **BASKAPP-10 (entry) + BASKAPP-7 (form).** Extend the existing `bask/components/settings/BloodTestModal.tsx` pattern (same `IonModal`, unit toggle, date input, haptics) and add: optional **lab/source name** + **notes**, **no future dates** (`max=today`), numeric sanity-range validation with friendly inline errors, and edit-mode (prefill + delete). Recommend generalizing `BloodTestModal` into this shared modal so Settings and Labs use one component.
- **`LabsEmptyState.tsx`** — **BASKAPP-16 (Low).** Never-blank zero state: Mascot + hedged explainer of what/why to log, a light informational note on how/when to get a 25(OH)D test (non-prescriptive), and a prominent **"Add your first result"** CTA → entry modal. Reuse the empty-state styling from `history/page.tsx` and `VitaminDTrendChart`'s `Mascot` usage.

### B. Free teaser vs PRO — BASKAPP-15 (Medium)
In `LabResultsPanel`, gate with `useSubscription()` (`isPremium`, `presentPaywall`):
- **Free:** most-recent value + status band chip + disclaimer; "Add result" and the chart/history show the existing **lock SVG**; tapping → `presentPaywall()`. Empty state CTA stays reachable so activation isn't paywalled.
- **PRO:** full add/edit/list/chart. Unlock is reactive via the subscription context (no relaunch) — same behavior as the 30/90-day toggles.

### C. Settings entry point
Update the existing blood-test row in `bask/app/settings/page.tsx` to deep-link to Insights → Labs (router push) instead of (or in addition to) opening the single-value modal, so there's one coherent home. Keep `handleSaveBloodTest`/`handleRemoveBloodTest` working through the synced profile columns.

---

## Suggested build order (issue → dependency)
1. **BASKAPP-9** data model + repository + profile-sync + baseline migration *(unblocks everything)*
2. **BASKAPP-11** unit conversion + preference *(used by all surfaces)*
3. **BASKAPP-14** interpretation/thresholds + hedged copy *(chart + list depend on bands)*
4. **BASKAPP-10 / 7** entry/edit modal
5. **BASKAPP-12** history list (edit/delete)
6. **BASKAPP-13 / 8** serum trend chart with bands *(hero)*
7. **BASKAPP-16** empty state / activation
8. **BASKAPP-15** PRO gating wrapper

## Critical files
- New: `bask/lib/database/repositories/labResultsRepository.ts`, `bask/lib/labInterpretation.ts`, `bask/components/labs/{LabResultsPanel,LabSerumChart,LabHistoryList,LabResultCard,LabResultModal,LabsEmptyState}.tsx`
- Edit: `bask/lib/database/schema.ts` (migration 7), `bask/lib/database/index.ts`, `bask/lib/database/devSeed.ts`, `bask/lib/bloodTestUtils.ts` (promote thresholds + add inverse/format helpers), `bask/app/insights/page.tsx` (Labs tab), `bask/app/settings/page.tsx` (deep-link), `bask/lib/database/repositories/settingsRepository.ts` (unit pref)
- Reuse (unchanged): `components/history/{VitaminDTrendChart,SwipeableCard}.tsx`, `components/settings/BloodTestModal.tsx` (generalize), `hooks/useSubscription.ts`, `components/ui/{ProBadge,Mascot,LoadingSpinner}.tsx`, `lib/services/physicianReportService.ts`, `components/home/SupplementCard.tsx`

## Verification
- **Migrations:** launch native build; confirm schema version reaches 7, `bask_lab_results` exists, and a pre-existing single blood test appears as the first row (no profile data loss).
- **CRUD round-trip:** add → appears instantly in list + chart; edit value/date → chart & status update; delete with confirm → removed and most-recent re-synced to profile (or cleared when last). Confirm `SupplementCard` lab hint + physician report still reflect the latest value.
- **Units:** toggle ng/mL ↔ nmol/L; every surface re-renders; round-trip is lossless to display precision.
- **Chart edge cases:** render with 0 (empty state), 1, 2, and many points; reference bands shade correctly; respects unit pref.
- **PRO gating:** as free user, confirm teaser + lock + paywall; simulate purchase and confirm immediate unlock without relaunch (mirror existing 30/90-day toggle test).
- **Compliance:** every band shows hedged, non-diagnostic copy + visible disclaimer; no future dates accepted.
- Run the project's typecheck/lint/build (`bask/` Next.js) before pushing.

## Out of scope (noted, not built here)
- The sibling **"Estimate user's vitamin D levels"** project (IU→serum calibration) — the repository's `getAll()` is designed to feed it later.
- HealthKit/lab-API auto-import (the `source` column leaves room for it).
