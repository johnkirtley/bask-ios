import { registerPlugin } from '@capacitor/core';

export interface BackgroundRefreshStatus {
  status: 'available' | 'denied' | 'restricted' | 'unknown';
}

export interface BaskBackgroundTaskPlugin {
  /**
   * Schedule a background refresh for weather data
   * iOS will execute this task at an optimal time
   */
  scheduleBackgroundRefresh(): Promise<{ scheduled: boolean }>;

  /**
   * Cancel all pending background tasks
   */
  cancelAllBackgroundTasks(): Promise<{ cancelled: boolean }>;

  /**
   * Get the current background refresh status
   */
  getBackgroundRefreshStatus(): Promise<BackgroundRefreshStatus>;

  /**
   * Add listener for background refresh events
   */
  addListener(
    eventName: 'weatherRefreshRequested',
    listenerFunc: () => void
  ): Promise<{ remove: () => void }>;
}

export const BaskBackgroundTask = registerPlugin<BaskBackgroundTaskPlugin>('BaskBackgroundTask', {
  web: undefined, // No web implementation
});
