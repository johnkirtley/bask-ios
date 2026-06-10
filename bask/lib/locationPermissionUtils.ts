import { BaskWeather, LocationPermissionStatus } from './plugins/baskWeather';

export type LocationPermissionState = LocationPermissionStatus['status'];

export function locationPermissionLabel(status: LocationPermissionState): string {
  switch (status) {
    case 'granted':
      return 'Enabled';
    case 'denied':
      return 'Denied. Tap to open Settings.';
    case 'prompt':
      return 'Not set. Tap to enable.';
  }
}

export async function getLocationPermissionState(): Promise<LocationPermissionState | null> {
  try {
    const result = await BaskWeather.getLocationPermissionStatus();
    return result.status;
  } catch {
    return null;
  }
}

export async function handleLocationPermissionAction(): Promise<LocationPermissionState | null> {
  try {
    const { status } = await BaskWeather.getLocationPermissionStatus();

    if (status === 'prompt') {
      const result = await BaskWeather.requestLocationPermission();
      return result.status;
    }

    await BaskWeather.openSettings();
    return status;
  } catch (error) {
    console.warn('Failed to handle location permission:', error);
    return null;
  }
}
