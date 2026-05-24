'use client';

import { databaseService } from '../connection';

export interface UserProfile {
  id: number;
  fitzpatrick_type: number;
  base_d_level: number;
  daily_goal: number;
  age?: number;
  weight?: number;
  weight_unit?: string;
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
  },

  async setBaseDLevel(level: number): Promise<void> {
    await this.update({ base_d_level: level });
  },
};
