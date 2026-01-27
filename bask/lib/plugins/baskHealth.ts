import { registerPlugin } from '@capacitor/core';

/**
 * Time in Daylight response
 */
export interface TimeInDaylightResponse {
  minutes: number;
  startDate: string;
  endDate: string;
}

/**
 * Dietary Vitamin D response
 */
export interface DietaryVitaminDResponse {
  iu: number;
  startDate: string;
  endDate: string;
}

/**
 * Write Vitamin D response
 */
export interface WriteVitaminDResponse {
  success: boolean;
  iu: number;
  date: string;
}

/**
 * Availability response
 */
export interface HealthAvailabilityResponse {
  available: boolean;
}

/**
 * Authorization response
 */
export interface HealthAuthorizationResponse {
  authorized: boolean;
}

/**
 * Bask Health Plugin interface
 * Native iOS plugin for accessing HealthKit data
 */
export interface BaskHealthPlugin {
  /**
   * Check if HealthKit is available on this device
   * @returns Availability status
   */
  isAvailable(): Promise<HealthAvailabilityResponse>;

  /**
   * Request HealthKit authorization
   * Requests read access for: timeInDaylight (iOS 17+), dietaryVitaminD
   * Requests write access for: dietaryVitaminD
   * @returns Authorization status
   */
  requestAuthorization(): Promise<HealthAuthorizationResponse>;

  /**
   * Get time spent in daylight (iOS 17+)
   * Automatically tracked by iPhone/Apple Watch sensors
   * @param options Optional date range (startDate, endDate as ISO8601 strings)
   * @returns Total minutes spent outdoors
   */
  getTimeInDaylight(options?: { startDate?: string; endDate?: string }): Promise<TimeInDaylightResponse>;

  /**
   * Get total dietary Vitamin D from HealthKit
   * Reads cumulative vitamin D from supplements logged in Health app
   * @param options Optional date range (startDate, endDate as ISO8601 strings)
   * @returns Total vitamin D in IU
   */
  getDietaryVitaminD(options?: { startDate?: string; endDate?: string }): Promise<DietaryVitaminDResponse>;

  /**
   * Write vitamin D supplement intake to HealthKit
   * Syncs Bask supplement logs to Apple Health
   * @param options Dosage in IU and optional date
   * @returns Write confirmation
   */
  writeDietaryVitaminD(options: { dosageIU: number; date?: string }): Promise<WriteVitaminDResponse>;
}

/**
 * BaskHealth plugin instance
 * Access HealthKit data on iOS
 */
export const BaskHealth = registerPlugin<BaskHealthPlugin>('BaskHealth', {
  web: undefined, // No web implementation - HealthKit is iOS-only
});
