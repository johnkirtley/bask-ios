'use client';

import { Capacitor } from '@capacitor/core';
import { getLocalDateKey } from '../../streakUtils';
import { databaseService } from '../connection';
import { getSeed } from '../devSeed';
import { streakStateRepository } from './streakStateRepository';

export interface UserProfile {
  id: number;
  fitzpatrick_type: number;
  base_d_level: number;
  daily_goal: number;
  age?: number | null;
  weight?: number | null;
  weight_unit?: string | null;
  default_attire?: string;
  disclaimer_accepted_at?: string;
  blood_test_value?: number;
  blood_test_unit?: string;
  blood_test_date?: string;
  blood_test_source?: string;
  created_at: string;
  updated_at: string;
}

export const userProfileRepository = {
  async get(): Promise<UserProfile | null> {
    if (!Capacitor.isNativePlatform()) return getSeed().profile as UserProfile;
    const db = await databaseService.getConnection();
    const result = await db.query(
      'SELECT * FROM bask_user_profile WHERE id = 1'
    );
    return result.values?.[0] ?? null;
  },

  async update(profile: Partial<Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>>): Promise<void> {
    const db = await databaseService.getConnection();
    const updates: string[] = [];
    const values: any[] = [];

    if (profile.fitzpatrick_type !== undefined) {
      updates.push('fitzpatrick_type = ?');
      values.push(profile.fitzpatrick_type);
    }
    if (profile.base_d_level !== undefined) {
      updates.push('base_d_level = ?');
      values.push(profile.base_d_level);
    }
    if (profile.daily_goal !== undefined) {
      updates.push('daily_goal = ?');
      values.push(profile.daily_goal);
    }
    if (profile.blood_test_value !== undefined) {
      updates.push('blood_test_value = ?');
      values.push(profile.blood_test_value);
    }
    if (profile.blood_test_unit !== undefined) {
      updates.push('blood_test_unit = ?');
      values.push(profile.blood_test_unit);
    }
    if (profile.blood_test_date !== undefined) {
      updates.push('blood_test_date = ?');
      values.push(profile.blood_test_date);
    }
    if (profile.blood_test_source !== undefined) {
      updates.push('blood_test_source = ?');
      values.push(profile.blood_test_source);
    }
    if (profile.age !== undefined) {
      updates.push('age = ?');
      values.push(profile.age);
    }
    if (profile.weight !== undefined) {
      updates.push('weight = ?');
      values.push(profile.weight);
    }
    if (profile.weight_unit !== undefined) {
      updates.push('weight_unit = ?');
      values.push(profile.weight_unit);
    }
    if (profile.disclaimer_accepted_at !== undefined) {
      updates.push('disclaimer_accepted_at = ?');
      values.push(profile.disclaimer_accepted_at);
    }

    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      await db.run(
        `UPDATE bask_user_profile SET ${updates.join(', ')} WHERE id = 1`,
        values
      );
    }
  },

  async setFitzpatrickType(type: number): Promise<void> {
    await this.update({ fitzpatrick_type: type });
  },

  async setDailyGoal(goal: number): Promise<void> {
    await this.update({ daily_goal: goal });
    await streakStateRepository.upsertGoalSnapshot(getLocalDateKey(new Date()), goal);
  },

  async setBaseDLevel(level: number): Promise<void> {
    await this.update({ base_d_level: level });
  },

  /**
   * Remove a previously entered vitamin D blood test.
   */
  async clearBloodTest(): Promise<void> {
    const db = await databaseService.getConnection();
    await db.run(
      `UPDATE bask_user_profile SET
        blood_test_value = NULL,
        blood_test_unit = NULL,
        blood_test_date = NULL,
        blood_test_source = NULL,
        updated_at = datetime('now')
      WHERE id = 1`,
    );
  },

  /**
   * Clear biological fields re-collected during onboarding.
   */
  async resetBiologicalFields(): Promise<void> {
    const db = await databaseService.getConnection();
    await db.run(
      `UPDATE bask_user_profile SET
        fitzpatrick_type = 2,
        age = NULL,
        weight = NULL,
        weight_unit = NULL,
        disclaimer_accepted_at = NULL,
        updated_at = datetime('now')
      WHERE id = 1`,
    );
  },
};
