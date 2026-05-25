import { registerPlugin } from '@capacitor/core';

/**
 * Current weather data from WeatherKit
 */
export interface CurrentWeather {
  temperature: number;
  apparentTemperature: number;
  uvIndex: number;
  humidity: number;
  cloudCover: number;
  condition: string;
  symbolName: string;
  isDaylight: boolean;
}

/**
 * Hourly weather forecast data point
 */
export interface HourlyForecastItem {
  date: string; // ISO8601 format
  hour: number; // 0-23
  temperature: number;
  uvIndex: number;
  cloudCover: number;
  humidity: number;
  symbolName: string;
  condition: string;
}

/**
 * Hourly forecast response
 */
export interface HourlyForecast {
  forecast: HourlyForecastItem[];
}

/**
 * Solar events (sunrise/sunset) for today
 */
export interface SolarEvents {
  sunrise?: string; // ISO8601 format
  sunriseFormatted?: string; // "6:32 AM" format
  sunset?: string; // ISO8601 format
  sunsetFormatted?: string; // "7:45 PM" format
  solarNoon?: string; // ISO8601 format
  solarMidnight?: string; // ISO8601 format
}

/**
 * Location permission status
 */
export interface LocationPermissionStatus {
  status: 'granted' | 'denied' | 'prompt';
}

/**
 * Location information from reverse geocoding
 */
export interface LocationInfo {
  city: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
}

/**
 * Bask Weather Plugin interface
 * Native iOS plugin for fetching weather data from Apple WeatherKit
 */
export interface BaskWeatherPlugin {
  /**
   * Get current weather conditions including UV index
   * Requires location permission
   * @returns Current weather data
   */
  getCurrentWeather(): Promise<CurrentWeather>;

  /**
   * Get hourly weather forecast for next 24 hours
   * Includes UV index for each hour
   * Requires location permission
   * @returns Hourly forecast data
   */
  getHourlyForecast(): Promise<HourlyForecast>;

  /**
   * Get solar events (sunrise/sunset) for today
   * Requires location permission
   * @returns Solar event times
   */
  getSolarEvents(): Promise<SolarEvents>;

  /**
   * Get current location permission status without prompting
   * @returns Permission status
   */
  getLocationPermissionStatus(): Promise<LocationPermissionStatus>;

  /**
   * Request location permission from the user
   * On iOS, this will show the permission prompt if not yet determined
   * @returns Permission status
   */
  requestLocationPermission(): Promise<LocationPermissionStatus>;

  /**
   * Get location information (city, state) from current position
   * Requires location permission
   * @returns Location details
   */
  getLocationInfo(): Promise<LocationInfo>;

  /**
   * Open the app's settings page in iOS Settings
   * Allows users to change location and health permissions
   */
  openSettings(): Promise<void>;
}

/**
 * BaskWeather plugin instance
 * Access WeatherKit data on iOS 16+
 */
export const BaskWeather = registerPlugin<BaskWeatherPlugin>('BaskWeather', {
  web: undefined, // No web implementation - will fall back to mock data
});
