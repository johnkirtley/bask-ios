'use client';

import { getSupabaseClient, isSupabaseConfigured } from './client';
import { settingsRepository } from '../database/repositories/settingsRepository';
import { generateAnonymousName } from '../leaderboard/anonymousNames';
import { LEADERBOARD_SETTINGS } from '../constants';
import type { LocationPrecision } from '../leaderboard/countries';

function generatePublicUserId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface LeaderboardEntry {
  anonymous_name: string;
  country_code: string | null;
  region_label: string | null;
  city_label: string | null;
  location_precision: LocationPrecision;
  total_iu: number;
  total_sun_minutes: number;
  session_count: number;
  last_updated_at: string;
  rank: number;
}

export interface LeaderboardLocation {
  countryCode: string;
  regionLabel: string;
  cityLabel: string;
  locationPrecision: LocationPrecision;
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '-');
}

function getTodayBounds(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

function getWeekBounds(): { start: string; end: string } {
  const now = new Date();
  const day = now.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + mondayOffset),
  );
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

export const leaderboardService = {
  async isOptedIn(): Promise<boolean> {
    const value = await settingsRepository.get(LEADERBOARD_SETTINGS.optedIn);
    return value === 'true';
  },

  async getCredentials(): Promise<{ publicUserId: string; writeToken: string } | null> {
    const publicUserId = await settingsRepository.get(LEADERBOARD_SETTINGS.publicUserId);
    const writeToken = await settingsRepository.get(LEADERBOARD_SETTINGS.writeToken);
    if (!publicUserId || !writeToken) return null;
    return { publicUserId, writeToken };
  },

  async getOrCreateAnonymousName(): Promise<string> {
    let name = await settingsRepository.get(LEADERBOARD_SETTINGS.anonymousName);
    if (!name) {
      name = generateAnonymousName();
      await settingsRepository.set(LEADERBOARD_SETTINGS.anonymousName, name);
    }
    return name;
  },

  async getLocation(): Promise<LeaderboardLocation> {
    const [countryCode, regionLabel, cityLabel, precision] = await Promise.all([
      settingsRepository.get(LEADERBOARD_SETTINGS.countryCode),
      settingsRepository.get(LEADERBOARD_SETTINGS.regionLabel),
      settingsRepository.get(LEADERBOARD_SETTINGS.cityLabel),
      settingsRepository.get(LEADERBOARD_SETTINGS.locationPrecision),
    ]);
    return {
      countryCode: countryCode ?? '',
      regionLabel: regionLabel ?? '',
      cityLabel: cityLabel ?? '',
      locationPrecision: (precision as LocationPrecision) ?? 'none',
    };
  },

  async setLocation(location: Partial<LeaderboardLocation>): Promise<void> {
    const entries: Record<string, string> = {};
    if (location.countryCode !== undefined) {
      entries[LEADERBOARD_SETTINGS.countryCode] = location.countryCode;
    }
    if (location.regionLabel !== undefined) {
      entries[LEADERBOARD_SETTINGS.regionLabel] = location.regionLabel;
    }
    if (location.cityLabel !== undefined) {
      entries[LEADERBOARD_SETTINGS.cityLabel] = location.cityLabel;
    }
    if (location.locationPrecision !== undefined) {
      entries[LEADERBOARD_SETTINGS.locationPrecision] = location.locationPrecision;
    }
    if (Object.keys(entries).length > 0) {
      await settingsRepository.setMultiple(entries);
    }

    const optedIn = await this.isOptedIn();
    if (optedIn) {
      await this.syncProfileToServer();
    }
  },

  async syncProfileToServer(): Promise<void> {
    if (!isSupabaseConfigured()) return;

    const credentials = await this.getCredentials();
    if (!credentials) return;

    const [anonymousName, location] = await Promise.all([
      this.getOrCreateAnonymousName(),
      this.getLocation(),
    ]);

    try {
      const supabase = getSupabaseClient();
      await supabase.rpc('update_leaderboard_profile', {
        p_public_user_id: credentials.publicUserId,
        p_write_token: credentials.writeToken,
        p_anonymous_name: anonymousName,
        p_country_code: location.countryCode || null,
        p_region_label: location.regionLabel || null,
        p_city_label: location.cityLabel || null,
        p_location_precision: location.locationPrecision,
      });
    } catch (error) {
      console.warn('Failed to sync leaderboard profile:', error);
    }
  },

  async optIn(location?: Partial<LeaderboardLocation>): Promise<{
    anonymousName: string;
  }> {
    const anonymousName = await this.getOrCreateAnonymousName();

    if (location) {
      await this.setLocation(location);
    }

    let credentials = await this.getCredentials();

    if (!credentials && isSupabaseConfigured()) {
      const loc = await this.getLocation();
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase.rpc('register_leaderboard_user', {
          p_anonymous_name: anonymousName,
          p_country_code: loc.countryCode || null,
          p_region_label: loc.regionLabel || null,
          p_city_label: loc.cityLabel || null,
          p_location_precision: loc.locationPrecision,
        });

        if (error) throw error;

        const row = Array.isArray(data) ? data[0] : data;
        if (row?.public_user_id && row?.write_token) {
          await settingsRepository.setMultiple({
            [LEADERBOARD_SETTINGS.publicUserId]: row.public_user_id,
            [LEADERBOARD_SETTINGS.writeToken]: row.write_token,
          });
          credentials = {
            publicUserId: row.public_user_id,
            writeToken: row.write_token,
          };
        }
      } catch (error) {
        console.warn('Failed to register on leaderboard server:', error);
      }
    } else if (credentials && isSupabaseConfigured()) {
      await this.syncProfileToServer();
    }

    await settingsRepository.set(LEADERBOARD_SETTINGS.optedIn, 'true');
    return { anonymousName };
  },

  async optOut(): Promise<void> {
    await settingsRepository.set(LEADERBOARD_SETTINGS.optedIn, 'false');
  },

  async deleteLeaderboardData(): Promise<void> {
    const credentials = await this.getCredentials();

    if (credentials && isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseClient();
        await supabase.rpc('delete_leaderboard_user', {
          p_public_user_id: credentials.publicUserId,
          p_write_token: credentials.writeToken,
        });
      } catch (error) {
        console.warn('Failed to delete leaderboard data on server:', error);
      }
    }

    await Promise.all([
      settingsRepository.set(LEADERBOARD_SETTINGS.optedIn, 'false'),
      settingsRepository.delete(LEADERBOARD_SETTINGS.publicUserId),
      settingsRepository.delete(LEADERBOARD_SETTINGS.writeToken),
      settingsRepository.delete(LEADERBOARD_SETTINGS.anonymousName),
      settingsRepository.delete(LEADERBOARD_SETTINGS.countryCode),
      settingsRepository.delete(LEADERBOARD_SETTINGS.regionLabel),
      settingsRepository.delete(LEADERBOARD_SETTINGS.cityLabel),
      settingsRepository.delete(LEADERBOARD_SETTINGS.locationPrecision),
    ]);
  },

  async updateAnonymousName(newName: string): Promise<void> {
    const trimmed = normalizeName(newName);
    if (!trimmed || trimmed.length < 3 || trimmed.length > 30) {
      throw new Error('Name must be 3-30 characters');
    }

    await settingsRepository.set(LEADERBOARD_SETTINGS.anonymousName, trimmed);
    await this.syncProfileToServer();
  },

  async randomizeName(): Promise<string> {
    const newName = generateAnonymousName();
    await this.updateAnonymousName(newName);
    return newName;
  },

  async submitSession(params: {
    localSessionId: number;
    iuGained: number;
    durationSeconds: number;
  }): Promise<void> {
    const { localSessionId, iuGained, durationSeconds } = params;
    if (iuGained <= 0 || durationSeconds <= 0) return;

    const optedIn = await this.isOptedIn();
    if (!optedIn) return;

    if (!isSupabaseConfigured()) return;

    let credentials = await this.getCredentials();
    if (!credentials) {
      await this.optIn();
      credentials = await this.getCredentials();
      if (!credentials) return;
    }

    const location = await this.getLocation();

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.rpc('submit_leaderboard_session', {
        p_public_user_id: credentials.publicUserId,
        p_write_token: credentials.writeToken,
        p_local_session_id: String(localSessionId),
        p_iu_gained: Math.round(iuGained),
        p_duration_seconds: Math.round(durationSeconds),
        p_country_code: location.locationPrecision !== 'none' ? location.countryCode || null : null,
        p_region_label:
          location.locationPrecision === 'region' || location.locationPrecision === 'city'
            ? location.regionLabel || null
            : null,
        p_city_label: location.locationPrecision === 'city' ? location.cityLabel || null : null,
      });

      if (error) {
        // Re-register if credentials invalid
        if (error.message.includes('Invalid credentials')) {
          await settingsRepository.delete(LEADERBOARD_SETTINGS.publicUserId);
          await settingsRepository.delete(LEADERBOARD_SETTINGS.writeToken);
          await this.optIn();
          return this.submitSession(params);
        }
        console.warn('Leaderboard sync failed:', error.message);
      }
    } catch (error) {
      console.warn('Leaderboard sync error:', error);
    }
  },

  async getLeaderboard(
    period: 'today' | 'week' = 'week',
    countryCode?: string,
  ): Promise<LeaderboardEntry[]> {
    if (!isSupabaseConfigured()) return [];

    const bounds = period === 'today' ? getTodayBounds() : getWeekBounds();

    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.rpc('get_leaderboard', {
        p_start: bounds.start,
        p_end: bounds.end,
        p_limit: 50,
        p_country_code: countryCode || null,
      });

      if (error) {
        console.warn('Failed to fetch leaderboard:', error.message);
        return [];
      }

      return (data ?? []) as LeaderboardEntry[];
    } catch (error) {
      console.warn('Leaderboard fetch error:', error);
      return [];
    }
  },

  async getMyRank(period: 'today' | 'week' = 'week'): Promise<number | null> {
    const credentials = await this.getCredentials();
    if (!credentials) return null;

    const entries = await this.getLeaderboard(period);
    const anonymousName = await this.getOrCreateAnonymousName();
    const mine = entries.find((e) => e.anonymous_name === anonymousName);
    return mine?.rank ?? null;
  },

  async isNudgeDismissed(): Promise<boolean> {
    const value = await settingsRepository.get(LEADERBOARD_SETTINGS.nudgeDismissed);
    return value === 'true';
  },

  async dismissNudge(): Promise<void> {
    await settingsRepository.set(LEADERBOARD_SETTINGS.nudgeDismissed, 'true');
  },
};
