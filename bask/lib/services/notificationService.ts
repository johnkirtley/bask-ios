'use client';

import {
  LocalNotifications,
  ScheduleOptions,
  PendingLocalNotificationSchema,
} from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { OptimalWindow, DWindowForecast } from '../dWindowForecast';
import { settingsRepository } from '../database/repositories/settingsRepository';

// Notification IDs (use consistent IDs to allow cancellation/updates)
const NOTIFICATION_IDS = {
  todayWindow: 1001,
  tomorrowWindow: 1002,
};

// Settings keys
export const NOTIFICATION_SETTINGS = {
  enabled: 'dwindow_notifications_enabled',
  leadTimeMinutes: 'dwindow_notification_lead_time',
};

export interface NotificationSettings {
  enabled: boolean;
  leadTimeMinutes: number; // 10, 20, or 30 minutes before window
}

let lastForecast: DWindowForecast | null = null;

export const notificationService = {
  /**
   * Request notification permissions
   */
  async requestPermission(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;

    const result = await LocalNotifications.requestPermissions();
    return result.display === 'granted';
  },

  /**
   * Check if notifications are permitted
   */
  async checkPermission(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;

    const result = await LocalNotifications.checkPermissions();
    return result.display === 'granted';
  },

  /**
   * Get notification settings from database
   */
  async getSettings(): Promise<NotificationSettings> {
    const enabled = await settingsRepository.get(NOTIFICATION_SETTINGS.enabled);
    const leadTime = await settingsRepository.get(
      NOTIFICATION_SETTINGS.leadTimeMinutes,
    );

    return {
      enabled: enabled === 'true',
      leadTimeMinutes: leadTime ? parseInt(leadTime, 10) : 20, // Default 20 minutes
    };
  },

  /**
   * Save notification settings
   */
  async saveSettings(settings: NotificationSettings): Promise<void> {
    await settingsRepository.setMultiple({
      [NOTIFICATION_SETTINGS.enabled]: settings.enabled.toString(),
      [NOTIFICATION_SETTINGS.leadTimeMinutes]:
        settings.leadTimeMinutes.toString(),
    });
  },

  /**
   * Schedule D-window notifications based on forecast
   */
  async scheduleDWindowNotifications(forecast: DWindowForecast): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    lastForecast = forecast;

    const settings = await this.getSettings();
    if (!settings.enabled) {
      // Notifications disabled, cancel any existing ones
      await this.cancelDWindowNotifications();
      return;
    }

    const hasPermission = await this.checkPermission();
    if (!hasPermission) return;

    // Cancel existing notifications before scheduling new ones
    await this.cancelDWindowNotifications();

    const notifications: ScheduleOptions['notifications'] = [];

    // Schedule today's window notification
    if (forecast.today) {
      const todayNotification = this.createWindowNotification(
        forecast.today,
        NOTIFICATION_IDS.todayWindow,
        settings.leadTimeMinutes,
      );
      if (todayNotification) {
        notifications.push(todayNotification);
      }
    }

    // Schedule tomorrow's window notification
    if (forecast.tomorrow) {
      const tomorrowNotification = this.createWindowNotification(
        forecast.tomorrow,
        NOTIFICATION_IDS.tomorrowWindow,
        settings.leadTimeMinutes,
      );
      if (tomorrowNotification) {
        notifications.push(tomorrowNotification);
      }
    }

    if (notifications.length > 0) {
      await LocalNotifications.schedule({ notifications });
    }
  },

  /**
   * Create a notification object for an optimal window
   */
  createWindowNotification(
    window: OptimalWindow,
    id: number,
    leadTimeMinutes: number,
  ): ScheduleOptions['notifications'][0] | null {
    // Parse the window start time
    const windowStartDate = this.parseWindowStartTime(window);
    if (!windowStartDate) return null;

    // Calculate notification time (X minutes before window starts)
    const notificationTime = new Date(
      windowStartDate.getTime() - leadTimeMinutes * 60 * 1000,
    );

    // Don't schedule if the notification time is in the past
    if (notificationTime <= new Date()) return null;

    // Format the notification message
    const title = 'Vitamin D Window Coming Up';
    const body = `Try To Go Outside Between ${window.startTime} - ${window.endTime}`;

    return {
      id,
      title,
      body,
      schedule: {
        at: notificationTime,
        allowWhileIdle: true,
      },
      sound: 'default',
      actionTypeId: 'DWINDOW_REMINDER',
      extra: {
        windowStart: window.startTime,
        windowEnd: window.endTime,
        estimatedIU: window.estimatedIU,
        avgUvIndex: window.avgUvIndex,
      },
    };
  },

  /**
   * Parse window start time string to Date object
   */
  parseWindowStartTime(window: OptimalWindow): Date | null {
    try {
      // window.date is ISO8601, window.startTime is "12:15 PM"
      const baseDate = new Date(window.date);
      const [time, period] = window.startTime.split(' ');
      const [hours, minutes] = time.split(':').map(Number);

      let hour24 = hours;
      if (period === 'PM' && hours !== 12) hour24 += 12;
      if (period === 'AM' && hours === 12) hour24 = 0;

      baseDate.setHours(hour24, minutes, 0, 0);
      return baseDate;
    } catch {
      return null;
    }
  },

  /**
   * Cancel all D-window notifications
   */
  async cancelDWindowNotifications(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    await LocalNotifications.cancel({
      notifications: [
        { id: NOTIFICATION_IDS.todayWindow },
        { id: NOTIFICATION_IDS.tomorrowWindow },
      ],
    });
  },

  /**
   * Apply notification settings immediately (cancel or reschedule from cache).
   */
  async applySettingsChange(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    const settings = await this.getSettings();
    if (!settings.enabled) {
      await this.cancelDWindowNotifications();
      return;
    }

    if (lastForecast) {
      await this.scheduleDWindowNotifications(lastForecast);
    }
  },

  /**
   * Get pending notifications (for debugging)
   */
  async getPendingNotifications(): Promise<PendingLocalNotificationSchema[]> {
    if (!Capacitor.isNativePlatform()) return [];

    const result = await LocalNotifications.getPending();
    return result.notifications;
  },
};
