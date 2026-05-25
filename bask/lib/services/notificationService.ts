'use client';

import {
  LocalNotifications,
  ScheduleOptions,
  PendingLocalNotificationSchema,
} from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import {
  OptimalWindow,
  SynthesisWindow,
  DWindowForecast,
} from '../dWindowForecast';
import { settingsRepository } from '../database/repositories/settingsRepository';
import {
  StreakState,
  streakStateRepository,
} from '../database/repositories/streakStateRepository';
import {
  addDays,
  daysBetweenLocalDateKeys,
  getLocalDateKey,
  startOfLocalDay,
} from '../streakUtils';

// Notification IDs (use consistent IDs to allow cancellation/updates)
const NOTIFICATION_IDS = {
  todayWindow: 1001,
  tomorrowWindow: 1002,
  todaySynthesisStart: 1003,
  tomorrowSynthesisStart: 1004,
  todaySynthesisEnding: 1005,
  tomorrowSynthesisEnding: 1006,
};

const ALL_NOTIFICATION_IDS = Object.values(NOTIFICATION_IDS);

// Settings keys
export const NOTIFICATION_SETTINGS = {
  enabled: 'dwindow_notifications_enabled',
  leadTimeMinutes: 'dwindow_notification_lead_time',
};

export interface NotificationSettings {
  enabled: boolean;
  leadTimeMinutes: number; // 10, 20, or 30 minutes before window
}

export interface ReconcileDWindowNotificationsOptions {
  forecast: DWindowForecast | null;
  isPremium: boolean;
  streakContext?: SynthesisEndingStreakContext | null;
  /** Bypass dedupe when settings or eligibility change outside forecast updates. */
  force?: boolean;
}

export interface ApplySettingsChangeOptions {
  isPremium: boolean;
}

export interface SynthesisEndingStreakContext {
  currentStreak: number;
  hitToday: boolean;
}

/** Skip scheduling notifications at or within this window of now (avoids iOS immediate delivery). */
const SCHEDULE_GRACE_MS = 60_000;

let lastForecast: DWindowForecast | null = null;
let lastReconcileKey: string | null = null;
let handlersRegistered = false;

function isScheduleTimeValid(notificationTime: Date, now: Date): boolean {
  return notificationTime.getTime() > now.getTime() + SCHEDULE_GRACE_MS;
}

function buildReconcileKey(
  forecast: DWindowForecast | null,
  isPremium: boolean,
  streakContext: SynthesisEndingStreakContext | null | undefined,
  settings: NotificationSettings,
): string {
  const streakHash = streakContext
    ? `${streakContext.currentStreak}:${streakContext.hitToday}`
    : 'no-streak';

  return [
    hashForecastForNotifications(forecast),
    streakHash,
    isPremium,
    settings.enabled,
    settings.leadTimeMinutes,
  ].join(':');
}

function windowSnapshot(window: OptimalWindow | null | undefined) {
  if (!window) return null;
  return {
    date: window.date,
    startTime: window.startTime,
    endTime: window.endTime,
    estimatedIU: window.estimatedIU,
    avgUvIndex: window.avgUvIndex,
  };
}

function synthesisSnapshot(synthesis: SynthesisWindow | null | undefined) {
  if (!synthesis) return null;
  return {
    date: synthesis.date,
    startTime: synthesis.startTime,
    endTime: synthesis.endTime,
    startsAt: synthesis.startsAt.toISOString(),
    endsAt: synthesis.endsAt.toISOString(),
  };
}

export function hashForecastForNotifications(
  forecast: DWindowForecast | null,
): string {
  if (!forecast) return 'null';

  return JSON.stringify({
    today: windowSnapshot(forecast.today),
    tomorrow: windowSnapshot(forecast.tomorrow),
    todaySynthesis: synthesisSnapshot(forecast.todaySynthesis),
    tomorrowSynthesis: synthesisSnapshot(forecast.tomorrowSynthesis),
  });
}

function hasSchedulableForecast(forecast: DWindowForecast | null): boolean {
  if (!forecast) return false;
  return Boolean(
    forecast.today ||
      forecast.tomorrow ||
      forecast.todaySynthesis ||
      forecast.tomorrowSynthesis,
  );
}

function getStreakRevivalNotificationId(deathDate: string): number {
  const compactDate = Number(deathDate.replace(/-/g, ''));
  return 2_000_000 + (compactDate % 1_000_000);
}

function getRevivalScheduleDate(deathDate: string): Date {
  const death = startOfLocalDay(new Date(`${deathDate}T00:00:00`));
  const scheduleDate = addDays(death, 1);
  scheduleDate.setHours(9, 0, 0, 0);
  return scheduleDate;
}

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

  getLastForecast(): DWindowForecast | null {
    return lastForecast;
  },

  /**
   * Reconcile pending D-window notifications with current eligibility and forecast.
   */
  async reconcileDWindowNotifications({
    forecast,
    isPremium,
    streakContext,
    force = false,
  }: ReconcileDWindowNotificationsOptions): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    if (forecast && isPremium) {
      lastForecast = forecast;
    }

    const settings = await this.getSettings();
    const reconcileKey = buildReconcileKey(
      forecast,
      isPremium,
      streakContext,
      settings,
    );

    if (!force && reconcileKey === lastReconcileKey) {
      return;
    }

    lastReconcileKey = reconcileKey;

    const hasPermission = await this.checkPermission();
    const hasSchedulable = hasSchedulableForecast(forecast);

    const shouldCancel =
      !isPremium ||
      !settings.enabled ||
      !hasPermission ||
      !forecast ||
      !hasSchedulable;

    if (shouldCancel) {
      await this.cancelDWindowNotifications();
      return;
    }

    await this.scheduleDWindowNotifications(forecast!, streakContext ?? null);
  },

  /**
   * Schedule D-window notifications based on forecast
   */
  async scheduleDWindowNotifications(
    forecast: DWindowForecast,
    streakContext: SynthesisEndingStreakContext | null = null,
  ): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    lastForecast = forecast;

    const settings = await this.getSettings();
    if (!settings.enabled) {
      await this.cancelDWindowNotifications();
      return;
    }

    const hasPermission = await this.checkPermission();
    if (!hasPermission) {
      await this.cancelDWindowNotifications();
      return;
    }

    // Cancel existing notifications before scheduling new ones
    await this.cancelDWindowNotifications();

    const now = new Date();
    const notifications: ScheduleOptions['notifications'] = [];

    // Schedule today's window notification
    if (forecast.today) {
      const todayNotification = this.createWindowNotification(
        forecast.today,
        NOTIFICATION_IDS.todayWindow,
        settings.leadTimeMinutes,
        now,
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
        now,
      );
      if (tomorrowNotification) {
        notifications.push(tomorrowNotification);
      }
    }

    if (forecast.todaySynthesis) {
      const start = this.createSynthesisStartNotification(
        forecast.todaySynthesis,
        forecast.today,
        NOTIFICATION_IDS.todaySynthesisStart,
        now,
      );
      if (start) notifications.push(start);

      const ending = this.createSynthesisEndingNotification(
        forecast.todaySynthesis,
        NOTIFICATION_IDS.todaySynthesisEnding,
        settings.leadTimeMinutes,
        streakContext,
        now,
      );
      if (ending) notifications.push(ending);
    }

    if (forecast.tomorrowSynthesis) {
      const start = this.createSynthesisStartNotification(
        forecast.tomorrowSynthesis,
        forecast.tomorrow,
        NOTIFICATION_IDS.tomorrowSynthesisStart,
        now,
      );
      if (start) notifications.push(start);

      const ending = this.createSynthesisEndingNotification(
        forecast.tomorrowSynthesis,
        NOTIFICATION_IDS.tomorrowSynthesisEnding,
        settings.leadTimeMinutes,
        null,
        now,
      );
      if (ending) notifications.push(ending);
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
    now: Date = new Date(),
  ): ScheduleOptions['notifications'][0] | null {
    // Parse the window start time
    const windowStartDate = this.parseWindowStartTime(window);
    if (!windowStartDate) return null;

    // Calculate notification time (X minutes before window starts)
    const notificationTime = new Date(
      windowStartDate.getTime() - leadTimeMinutes * 60 * 1000,
    );

    // Don't schedule if the notification time is in the past or too soon
    if (!isScheduleTimeValid(notificationTime, now)) return null;

    // Format the notification message
    const title = 'Vitamin D Window Coming Up';
    const body = `Try to go outside between ${window.startTime} - ${window.endTime}`;

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

  createSynthesisStartNotification(
    synthesis: SynthesisWindow,
    optimal: OptimalWindow | null,
    id: number,
    now: Date = new Date(),
  ): ScheduleOptions['notifications'][0] | null {
    const notificationTime = synthesis.startsAt;
    if (!isScheduleTimeValid(notificationTime, now)) return null;

    const title = 'Vitamin D Synthesis Starting';
    const body = optimal
      ? `Your skin can start making vitamin D now. Best window: ${optimal.startTime} - ${optimal.endTime}`
      : `Your skin can start making vitamin D now until ${synthesis.endTime}`;

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
        type: 'synthesis_start',
        synthesisStart: synthesis.startTime,
        synthesisEnd: synthesis.endTime,
      },
    };
  },

  createSynthesisEndingNotification(
    synthesis: SynthesisWindow,
    id: number,
    leadTimeMinutes: number,
    streakContext: SynthesisEndingStreakContext | null = null,
    now: Date = new Date(),
  ): ScheduleOptions['notifications'][0] | null {
    if (streakContext?.hitToday) return null;

    const notificationTime = new Date(
      synthesis.endsAt.getTime() - leadTimeMinutes * 60 * 1000,
    );
    if (!isScheduleTimeValid(notificationTime, now)) return null;

    const dayRef =
      synthesis.dayLabel === 'Tomorrow' ? 'tomorrow' : 'today';
    const shouldProtectStreak =
      streakContext !== null && streakContext.currentStreak >= 3;
    const title = shouldProtectStreak
      ? 'Your streak is on the line'
      : 'D-window closing';
    const body = shouldProtectStreak
      ? `${leadTimeMinutes} min left in your D-window. Log now to keep your ${streakContext.currentStreak}-day streak alive 🔥`
      : `${leadTimeMinutes} min left. Catch the last rays. ☀️`;

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
        type: 'synthesis_ending',
        dateKey: getLocalDateKey(synthesis.endsAt),
        semanticId: `synthesis_ending_${getLocalDateKey(synthesis.endsAt)}`,
        synthesisStart: synthesis.startTime,
        synthesisEnd: synthesis.endTime,
        dayRef,
      },
    };
  },

  async scheduleStreakRevivalNotification(state: StreakState): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    if (
      !state.lastStreakDeathDate ||
      state.lastStreakDeathLength < 3 ||
      state.streakRevivalNotifFired
    ) {
      return;
    }

    const todayKey = getLocalDateKey(new Date());
    if (
      state.lastRevivalNotifDate &&
      daysBetweenLocalDateKeys(todayKey, state.lastRevivalNotifDate) < 7
    ) {
      return;
    }

    const settings = await this.getSettings();
    const hasPermission = await this.checkPermission();
    if (!settings.enabled || !hasPermission) return;

    const scheduleDate = getRevivalScheduleDate(state.lastStreakDeathDate);
    if (scheduleDate <= new Date()) return;

    await LocalNotifications.schedule({
      notifications: [
        {
          id: getStreakRevivalNotificationId(state.lastStreakDeathDate),
          title: `Yesterday broke your ${state.lastStreakDeathLength}-day streak`,
          body: "Today's a fresh start. Let's build a new one. ☀️",
          schedule: {
            at: scheduleDate,
            allowWhileIdle: true,
          },
          sound: 'default',
          actionTypeId: 'DWINDOW_REMINDER',
          extra: {
            type: 'streak_revival',
            deathDate: state.lastStreakDeathDate,
            semanticId: `streak_revival_${state.lastStreakDeathDate}`,
          },
        },
      ],
    });

    await streakStateRepository.patch({
      streakRevivalNotifFired: true,
      lastRevivalNotifDate: getLocalDateKey(scheduleDate),
    });
  },

  async cancelStreakRevivalIfBeforeNine(state: StreakState): Promise<void> {
    if (!Capacitor.isNativePlatform() || !state.lastStreakDeathDate) return;

    const scheduleDate = getRevivalScheduleDate(state.lastStreakDeathDate);
    const now = new Date();
    const todayKey = getLocalDateKey(now);

    if (
      getLocalDateKey(scheduleDate) !== todayKey ||
      now.getTime() >= scheduleDate.getTime()
    ) {
      return;
    }

    await LocalNotifications.cancel({
      notifications: [
        { id: getStreakRevivalNotificationId(state.lastStreakDeathDate) },
      ],
    });

    await streakStateRepository.patch({
      streakRevivalNotifFired: true,
    });
  },

  /**
   * Parse window start time string to Date object
   */
  parseWindowStartTime(window: OptimalWindow): Date | null {
    try {
      // window.date is ISO8601, window.startTime is "12:15 PM"
      const baseDate = new Date(`${window.date}T00:00:00`);
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
      notifications: ALL_NOTIFICATION_IDS.map((id) => ({ id })),
    });
  },

  async cancelStreakRevivalNotifications(state?: StreakState): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    const currentState = state ?? (await streakStateRepository.get());
    if (!currentState.lastStreakDeathDate) return;

    await LocalNotifications.cancel({
      notifications: [
        { id: getStreakRevivalNotificationId(currentState.lastStreakDeathDate) },
      ],
    });
  },

  /**
   * Apply notification settings immediately (cancel or reschedule from cache).
   */
  async applySettingsChange({
    isPremium,
  }: ApplySettingsChangeOptions): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    await this.reconcileDWindowNotifications({
      forecast: lastForecast,
      isPremium,
      force: true,
    });
  },

  /**
   * Register notification action types and tap listener once at app bootstrap.
   */
  async registerHandlers(): Promise<void> {
    if (!Capacitor.isNativePlatform() || handlersRegistered) return;

    handlersRegistered = true;

    try {
      await LocalNotifications.registerActionTypes({
        types: [
          {
            id: 'DWINDOW_REMINDER',
            actions: [],
          },
        ],
      });
    } catch (error) {
      console.warn('Failed to register notification action types:', error);
    }

    await LocalNotifications.addListener(
      'localNotificationActionPerformed',
      () => {
        if (typeof window === 'undefined') return;

        const target = '/?focus=dwindow';
        if (window.location.pathname === '/') {
          window.history.replaceState(null, '', target);
          document
            .getElementById('dwindow-forecast')
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }

        window.location.href = target;
      },
    );

    await LocalNotifications.addListener(
      'localNotificationReceived',
      async (notification) => {
        if (notification.extra?.type !== 'streak_revival') return;

        await streakStateRepository.patch({
          streakRevivalNotifFired: true,
          lastRevivalNotifDate: getLocalDateKey(new Date()),
        });
      },
    );
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
