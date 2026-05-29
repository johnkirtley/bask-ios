import { Capacitor } from '@capacitor/core';
import { databaseService } from './database/connection';

/** Whether the user enabled Apple Health sync in Settings (premium feature). */
export async function isHealthKitSyncEnabled(): Promise<boolean> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') {
    return false;
  }

  try {
    const db = await databaseService.getConnection();
    const result = await db.query(
      "SELECT value FROM settings WHERE key = 'healthkit_enabled'",
      [],
    );
    return result.values?.[0]?.value === 'true';
  } catch {
    return false;
  }
}
