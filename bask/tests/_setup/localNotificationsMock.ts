/**
 * Inspectable mock for @capacitor/local-notifications.
 *
 * Records every schedule/cancel call and lets tests control permission state,
 * pending list, and capture listener registrations so registerHandlers can be
 * exercised. `resetLocalNotifications()` should run in beforeEach.
 */

import { vi } from 'vitest';

export interface ScheduledNotification {
  id: number;
  title?: string;
  body?: string;
  schedule?: { at?: Date };
  extra?: Record<string, any>;
  [key: string]: any;
}

export interface LocalNotificationsMockState {
  scheduled: ScheduledNotification[];
  cancelled: { id: number }[];
  permission: 'granted' | 'denied' | 'prompt';
  pending: ScheduledNotification[];
  registeredActionTypes: any[];
  actionListeners: Map<string, (notification: any) => void | Promise<void>>;
}

const state: LocalNotificationsMockState = {
  scheduled: [],
  cancelled: [],
  permission: 'prompt',
  pending: [],
  registeredActionTypes: [],
  actionListeners: new Map(),
};

export function resetLocalNotifications() {
  state.scheduled = [];
  state.cancelled = [];
  state.permission = 'prompt';
  state.pending = [];
  state.registeredActionTypes = [];
  state.actionListeners = new Map();
}

export function setNotificationPermission(value: LocalNotificationsMockState['permission']) {
  state.permission = value;
}

/** Fire a captured listener as if the OS delivered an event. */
export function fireLocalNotificationListener(event: string, notification: any) {
  const fn = state.actionListeners.get(event);
  if (fn) return fn(notification);
}

export function getLocalNotificationsState() {
  return state;
}

export function createLocalNotificationsMock() {
  return {
    LocalNotifications: {
      async requestPermissions() {
        return { display: state.permission };
      },
      async checkPermissions() {
        return { display: state.permission };
      },
      async schedule({ notifications }: { notifications: ScheduledNotification[] }) {
        for (const n of notifications) {
          state.scheduled.push(n);
          state.pending.push(n);
        }
        return { notifications: notifications.map((n) => ({ id: n.id })) };
      },
      async cancel({ notifications }: { notifications: { id: number }[] }) {
        for (const n of notifications) {
          state.cancelled.push(n);
          const idx = state.pending.findIndex((p) => p.id === n.id);
          if (idx >= 0) state.pending.splice(idx, 1);
        }
      },
      async getPending() {
        return { notifications: [...state.pending] };
      },
      async registerActionTypes({ types }: { types: any[] }) {
        state.registeredActionTypes.push(...types);
      },
      async addListener(event: string, cb: (notification: any) => void | Promise<void>) {
        state.actionListeners.set(event, cb);
        return { remove: vi.fn() };
      },
    },
    // Type/enum stubs that match the bits the app imports.
    Schedule: {},
    PendingLocalNotificationSchema: class {},
    PendingLocalNotificationSchema_: class {},
  };
}
