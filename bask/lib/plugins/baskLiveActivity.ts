import { registerPlugin } from '@capacitor/core';

/**
 * Live Activity support check result
 */
export interface LiveActivitySupportResult {
  supported: boolean;
}

/**
 * Live Activity start result
 */
export interface LiveActivityStartResult {
  activityId: string;
}

/**
 * Options for starting a Live Activity
 */
export interface StartLiveActivityOptions {
  uvIndex: number;
  timeToBurnMinutes: number;
  canAccessSunburnRisk: boolean;
  startTimeMs: number; // Date.now() epoch milliseconds
}

/**
 * Options for updating a Live Activity
 */
export interface UpdateLiveActivityOptions {
  activityId?: string;
  currentIU: number;
  isPaused: boolean;
  canAccessSunburnRisk: boolean;
  effectiveStartTimeMs: number; // Adjusted start time for timer calculation
  elapsedSecondsAtPause: number; // Frozen elapsed seconds when paused
}

/**
 * Options for ending a Live Activity
 */
export interface EndLiveActivityOptions {
  activityId?: string;
  finalIU?: number;
}

/**
 * Bask Live Activity Plugin interface
 * Native iOS plugin for managing Lock Screen and Dynamic Island Live Activities
 */
export interface BaskLiveActivityPlugin {
  /**
   * Check if Live Activities are supported and enabled
   * Returns false on iOS < 16.1 or if user has disabled Live Activities
   */
  isSupported(): Promise<LiveActivitySupportResult>;

  /**
   * Start a new Live Activity for a bask session
   * @param options Session parameters for the Live Activity
   * @returns Activity ID for future updates
   */
  startActivity(options: StartLiveActivityOptions): Promise<LiveActivityStartResult>;

  /**
   * Update the Live Activity with current session state
   * Called on pause/resume and periodically for IU updates
   * @param options Updated session state
   */
  updateActivity(options: UpdateLiveActivityOptions): Promise<{ updated: boolean }>;

  /**
   * End the Live Activity (session completed or canceled)
   * @param options Optional activity ID and final IU
   */
  endActivity(options?: EndLiveActivityOptions): Promise<{ ended: boolean }>;

  /**
   * End all active Bask Live Activities (cleanup on app launch)
   */
  endAllActivities(): Promise<{ ended: boolean }>;
}

/**
 * BaskLiveActivity plugin instance
 * Manage Live Activities on iOS 16.1+
 */
export const BaskLiveActivity = registerPlugin<BaskLiveActivityPlugin>('BaskLiveActivity', {
  web: undefined, // No web implementation - Live Activities are iOS-only
});
