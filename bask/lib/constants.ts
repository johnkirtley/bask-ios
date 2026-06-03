/** Default daily vitamin D goal (IU) when user has not set a custom goal */
export const DEFAULT_DAILY_GOAL_IU = 2000;

/** Conservative NIH baseline shown during onboarding for general education. */
export const NIH_BASELINE_DAILY_GOAL_IU = 600;

/** Public App Store URL used by Settings sharing. */
export const BASK_APP_STORE_URL =
  'https://apps.apple.com/us/app/bask-vitamin-d-sun-tracker/id6758405235';

// Database Configuration
export const DB_CONFIG = {
  name: 'bask',
  version: 1,
} as const;

// RevenueCat Configuration
export const REVENUECAT_API_KEY =
  process.env.NEXT_PUBLIC_REVENUECAT_API_KEY || '';

// PostHog Analytics Configuration.
// When the key is empty, analytics is fully disabled (no-op) — keeps dev/CI clean.
export const POSTHOG = {
  key: process.env.NEXT_PUBLIC_POSTHOG_KEY || '',
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
} as const;

// Analytics settings keys (stored in local SQLite `settings` table)
export const ANALYTICS_SETTINGS = {
  distinctId: 'analytics_distinct_id',
} as const;
// RevenueCat Entitlement IDs
export const ENTITLEMENTS = {
  pro: 'Bask Pro',
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  userProgress: 'bask_progress',
  settings: 'bask_settings',
  onboarding: 'bask_onboarding',
  reviewMilestone1: 'review_milestone_1',
  reviewMilestone2: 'review_milestone_2',
  reviewMilestone3: 'review_milestone_3',
  reviewCompleted: 'review_completed',
  onboardingReviewRequested: 'onboarding_review_requested',
  reviewAppOpenCount: 'review_app_open_count',
  reviewLastAppOpenDate: 'review_last_app_open_date',
  reviewValueEventCount: 'review_value_event_count',
  reviewLastPromptAt: 'review_last_prompt_at',
  reviewNativeRequested: 'review_native_requested',
  reviewNegativeFeedback: 'review_negative_feedback',
  reviewLastPaywallDismissedAt: 'review_last_paywall_dismissed_at',
} as const;

// App Routes
export const ROUTES = {
  home: '/',
  history: '/history',
  insights: '/insights',
  settings: '/settings',
} as const;

// Review Milestones Configuration
export const REVIEW_MILESTONES = {
  milestone1: {
    id: 'milestone1',
    storageKey: 'review_milestone_1',
    threshold: 7,
    headline: "How's it going? 👋",
    body: "You've been using the app for a bit now. Are you enjoying the experience?",
  },
  milestone2: {
    id: 'milestone2',
    storageKey: 'review_milestone_2',
    headline: 'Enjoying the app? 👋',
    body: "We'd love to hear your feedback. Are you finding the app useful?",
  },
  milestone3: {
    id: 'milestone3',
    storageKey: 'review_milestone_3',
    threshold: 30,
    headline: 'Thanks for sticking with us! 👋',
    body: "We're glad you've been using the app. Would you mind leaving a review?",
  },
} as const;

// Feedback
export const REVIEW_FEEDBACK_FORM_URL = 'https://tally.so/r/9qMbjE';

// Leaderboard Settings Keys (stored in local SQLite `settings` table)
export const LEADERBOARD_SETTINGS = {
  optedIn: 'leaderboard_opted_in',
  publicUserId: 'leaderboard_public_user_id',
  writeToken: 'leaderboard_write_token',
  anonymousName: 'leaderboard_anonymous_name',
  countryCode: 'leaderboard_country_code',
  regionLabel: 'leaderboard_region_label',
  cityLabel: 'leaderboard_city_label',
  locationPrecision: 'leaderboard_location_precision',
  nudgeDismissed: 'leaderboard_nudge_dismissed',
} as const;

// Public URL of the separately deployed leaderboard site
export const LEADERBOARD_URL = 'https://leaderboard.getbask.app';
