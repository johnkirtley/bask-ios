# Ralph Fix Plan

## High Priority

- [x] Review codebase and understand architecture
- [x] Identify and document key components
- [ ] Set up development environment

## Medium Priority

- [x] Integrate SolarWindowChart into dashboard (Phase 1, Section 3)
- [x] Integrate SupplementCard into dashboard with database persistence (Phase 1, Section 4)
- [x] Add supplement preset buttons (1000, 2000, 5000 IU) (Phase 1, Section 4)
- [x] Implement cofactor tracking (Mg/K2 toggles) (Phase 1, Section 5 - MOAT)
- [ ] Implement remaining features found in app_features.md
- [ ] Update documentation

## Low Priority

- [ ] Performance optimization
- [ ] Code cleanup and refactoring

## Completed

- [x] Project enabled for Ralph
- [x] Reviewed codebase architecture (Loop 1)
  - D-Engine calculations working (Holick formula)
  - Dashboard with BaskRing, stat cards, active session tracking
  - Onboarding flow complete
  - Database layer (SQLite/localStorage) implemented
- [x] Integrated SolarWindowChart component (Loop 1)
  - Shows UV intensity curve throughout the day
  - Highlights optimal vitamin D synthesis window (10am-2pm)
  - Displays current time with pulsing dot
- [x] Integrated SupplementCard component with database (Loop 1)
  - Quick-add 2000 IU supplement logging
  - Persistent storage via supplementsRepository
  - Real-time dashboard updates when supplement logged
  - Allows multiple doses per day
- [x] Enhanced SupplementCard with preset dosage buttons (Loop 2)
  - Three preset buttons: 1000 IU, 2000 IU, 5000 IU
  - Expandable/collapsible UI for clean dashboard
  - Educational tip about vitamin D absorption with fat
  - One-tap logging for common dosages
- [x] Implemented cofactor tracking system (Loop 3) - MOAT FEATURE
  - Database migration v5 for bask_cofactors table
  - CofactorsRepository with full CRUD operations
  - CofactorCard component with Magnesium and Vitamin K2 toggles
  - Educational content explaining cofactor importance
  - Visual status indicators (logged vs not logged)
  - Expandable info section with detailed explanations
  - One-tap daily logging for each cofactor
- [x] Implemented History page (Loop 4)
  - Unified timeline view showing all activity (sun sessions, supplements, cofactors)
  - Date range filters (7 days, 30 days, all time)
  - Distinct visual cards for each entry type with color-coded icons
  - Detailed information for each entry (IU gained, duration, UV index, dosage, etc.)
  - Smart date formatting (Today, Yesterday, date with time)
  - Empty state for new users
  - Loading state with spinner
  - Fully responsive design with dark mode palette
- [x] Implemented Calendar Streak view (Loop 5)
  - Interactive monthly calendar showing days with sun exposure
  - Visual streak tracking (current streak & longest streak)
  - Month navigation with prev/next arrows
  - "Go to Today" quick navigation button
  - Activity indicators (golden highlight for active days)
  - Today indicator with ring highlight
  - Automatic streak calculation from all-time data
  - Tab-based navigation (Timeline vs Calendar views)
  - Fully integrated into History page
- [x] Implemented Vitamin D Trend Chart (Loop 6)
  - Line chart showing daily vitamin D totals over time
  - Time range filters (7 days, 30 days, 90 days)
  - Combines sun exposure + supplement intake
  - Stats cards: Average daily IU, Peak day, Days tracked
  - Visual goal line at 5000 IU
  - Responsive SVG chart with gradient fill
  - Smart x-axis labeling (fewer labels for 90-day view)
  - Y-axis grid lines and value labels
  - Data points highlighted on active days
  - Third tab in History page navigation
- [x] Implemented Daily Decay Model (Loop 7)
  - Decay calculation functions in D-Engine (15-day half-life)
  - calculateDecay(): exponential decay over N days
  - calculateDailyDecayAmount(): ~4.5% daily loss
  - Dashboard stat card showing daily IU loss
  - Educational subtext explaining natural half-life
  - Based on scientific vitamin D metabolism (15-day half-life)

## Notes

- Focus on MVP functionality first
- Ensure each feature is properly tested
- Update this file after each major milestone
- If an API key is required or other external setup is required (ex: Weather API), continue to implement and assume proper credentials will be provided later.

## Next Priority Tasks (from app_features.md Phase 1)

1. ~~History page implementation - Section 6 (sessions + supplements list + cofactors)~~ ✅ COMPLETED (Loop 4)
2. Cofactor reminder notifications (3-day trigger) - Section 5, 9 (MOAT)
3. Real UV Index integration (replace mock data) - Section 1, 8 (requires WeatherKit)
4. Location permission + WeatherKit setup - Section 2, 8 (requires native Swift plugin)
