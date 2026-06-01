/**
 * Analytics event taxonomy — the single source of truth for every event name
 * and its property shape. Call sites import `ANALYTICS_EVENTS` and pass typed
 * properties to `capture()` (see ./posthog), so a typo or wrong payload is a
 * compile error rather than a silent data-quality bug.
 *
 * Privacy: never put PII here (no names, raw locations, or blood-test values) —
 * only enums, units, counts, and IU numbers.
 */

export const ANALYTICS_EVENTS = {
  // Onboarding funnel
  onboardingStarted: 'onboarding_started',
  onboardingStepViewed: 'onboarding_step_viewed',
  onboardingCompleted: 'onboarding_completed',

  // Sessions
  sessionStarted: 'session_started',
  sessionPaused: 'session_paused',
  sessionResumed: 'session_resumed',
  sessionEnded: 'session_ended',
  sessionCancelled: 'session_cancelled',

  // Logging
  supplementLogged: 'supplement_logged',
  cofactorLogged: 'cofactor_logged',

  // Clothing / attire
  clothingEditorOpened: 'clothing_editor_opened',
  clothingPresetChanged: 'clothing_preset_changed',

  // Navigation
  navTabClicked: 'nav_tab_clicked',

  // Other meaningful actions
  dailyGoalChanged: 'daily_goal_changed',
  paywallPresented: 'paywall_presented',
  locationPermissionRequested: 'location_permission_requested',
  appOpened: 'app_opened',
  reviewPromptShown: 'review_prompt_shown',
  reviewPositiveResponse: 'review_positive_response',
  reviewNegativeResponse: 'review_negative_response',
  reviewNativePromptRequested: 'review_native_prompt_requested',
  reviewFeedbackOpened: 'review_feedback_opened',
} as const;

export type AnalyticsEventName =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

/**
 * Human-readable labels for each onboarding screen index (0–16), so the
 * `onboarding_step_viewed` funnel reads clearly in PostHog instead of raw numbers.
 * Mirrors the `switch (currentScreen)` in components/onboarding/OnboardingFlow.tsx.
 */
export const ONBOARDING_STEP_NAMES = [
  'emotional_hook', // 0
  'symptoms', // 1
  'skin_eye_color', // 2
  'skin_reflection', // 3
  'sun_reaction', // 4
  'outdoor_time', // 5
  'outdoor_reflection', // 6
  'sunscreen_frequency', // 7
  'sunscreen_reflection', // 8
  'supplementation', // 9
  'biological_profile', // 10
  'medical_disclaimer', // 11
  'location_permission', // 12
  'notification_permission', // 13
  'healthkit_permission', // 14
  'generating', // 15
  'plan_ready', // 16
] as const;

export function getOnboardingStepName(index: number): string {
  return ONBOARDING_STEP_NAMES[index] ?? `step_${index}`;
}

/**
 * Property shape for each event. `void` means the event takes no properties.
 */
export interface AnalyticsEventProps {
  onboarding_started: void;
  onboarding_step_viewed: {
    step_index: number;
    step_name: string;
    direction: 'forward' | 'back';
  };
  onboarding_completed: {
    fitzpatrick_type: number | null;
    age: number | null;
    weight_unit: string | null;
    symptom_count: number;
    location_permission_granted: boolean;
    notification_permission_granted: boolean;
    healthkit_permission_granted: boolean;
  };

  session_started: {
    clothing_preset_id: string;
    exposure_percent: number;
    uv_index: number;
  };
  session_paused: { elapsed_seconds: number; current_iu: number };
  session_resumed: { pause_duration_seconds: number };
  session_ended: { duration_seconds: number; iu_gained: number };
  session_cancelled: { elapsed_seconds: number; iu_gained: number };

  supplement_logged: {
    dosage_iu: number;
    total_iu_today: number;
  };
  cofactor_logged: {
    cofactor_type: string; // 'magnesium' | 'vitamin_k2'
  };

  clothing_editor_opened: void;
  clothing_preset_changed: {
    preset_id: string;
    coverage_percent?: number;
  };

  nav_tab_clicked: { tab: string };

  daily_goal_changed: { new_goal_iu: number; previous_goal_iu: number };
  paywall_presented: { source: string };
  location_permission_requested: { source: string };
  app_opened: void;
  review_prompt_shown: { app_open_count: number; value_event_count: number };
  review_positive_response: { app_open_count: number; value_event_count: number };
  review_negative_response: { app_open_count: number; value_event_count: number };
  review_native_prompt_requested: { source: 'onboarding' | 'value_prompt' | 'manual' };
  review_feedback_opened: { source: 'onboarding' | 'value_prompt' | 'settings' };
}
