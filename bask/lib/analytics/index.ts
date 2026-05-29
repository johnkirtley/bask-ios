export {
  initAnalytics,
  identifyUser,
  capture,
  trackPageview,
} from './posthog';
export type { AnalyticsPersonProperties } from './posthog';
export {
  ANALYTICS_EVENTS,
  ONBOARDING_STEP_NAMES,
  getOnboardingStepName,
} from './events';
export type { AnalyticsEventName, AnalyticsEventProps } from './events';
