'use client';

import { Capacitor } from '@capacitor/core';
import { databaseService } from '../connection';
import { STORAGE_KEYS } from '@/lib/constants';

export const resetRepository = {
  /**
   * Deletes all user data from the database and localStorage.
   * This includes sessions, supplements, cofactors, user profile, and settings.
   * This operation cannot be undone.
   */
  async deleteAllUserData(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      try {
        const db = await databaseService.getConnection();

        // Delete all session data
        await db.run('DELETE FROM bask_sessions');

        // Delete all supplement logs
        await db.run('DELETE FROM bask_supplements');

        // Delete all cofactor logs
        await db.run('DELETE FROM bask_cofactors');

        // Reset user profile to defaults
        await db.run(`
          UPDATE bask_user_profile
          SET
            fitzpatrick_type = 2,
            base_d_level = 0,
            daily_goal = 5000,
            age = NULL,
            weight = NULL,
            weight_unit = NULL,
            default_attire = NULL,
            disclaimer_accepted_at = NULL,
            blood_test_value = NULL,
            blood_test_unit = NULL,
            blood_test_date = NULL,
            blood_test_source = NULL,
            updated_at = datetime('now')
          WHERE id = 1
        `);

        // Delete all settings
        await db.run('DELETE FROM settings');
      } catch (err) {
        console.error('Failed to delete user data from database:', err);
        throw err;
      }
    }

    // Clear all localStorage
    localStorage.clear();
  },
};
