// Mock data for Bask sun tracking app

export type UVLevel = 'Low' | 'Moderate' | 'High' | 'Very High' | 'Extreme';

export interface UVDataPoint {
  hour: number; // 0-23
  uvIndex: number;
  sunAngle: number; // degrees above horizon
}

export interface SunData {
  uvIndex: number;
  uvLevel: UVLevel;
  timeToBurnMinutes: number;
  maxSunTimeMinutes: number;
  vitaminDProgress: number; // 0-100
  vitaminDGoal: number; // IU
  vitaminDCurrent: number; // IU
  sunriseTime: string; // "6:32 AM"
  solarNoonTime: string; // "12:36 PM"
  sunsetTime: string; // "7:45 PM"
  sweetSpotStart: number; // hour (e.g., 10)
  sweetSpotEnd: number; // hour (e.g., 14)
  hasOptimalWindow: boolean; // whether sweetSpot is viable (UV >= 3)
  uvCurve: UVDataPoint[];
  cloudCover?: number; // 0-1 (0 = clear sky, 1 = fully cloudy)
}

export interface SupplementData {
  amount: number; // IU
  unit: string; // "IU"
  isLoggedToday: boolean;
}

export interface ClothingPreset {
  id: string;
  name: string;
  coveragePercent: number; // affects vitamin D calculation
}

/** Format a Date as "h:mm AM/PM" (matches WeatherKit plugin output). */
export function formatTime12Hour(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Determine UV level from UV index
 */
export function getUVLevel(uvIndex: number): UVLevel {
  if (uvIndex < 3) return 'Low';
  if (uvIndex < 6) return 'Moderate';
  if (uvIndex < 8) return 'High';
  if (uvIndex < 11) return 'Very High';
  return 'Extreme';
}

/**
 * Generate realistic UV curve data for a day
 */
export function generateMockUVCurve(): UVDataPoint[] {
  const curve: UVDataPoint[] = [];

  // Generate UV values for 6am to 8pm (peak around noon)
  for (let hour = 6; hour <= 20; hour++) {
    // Parabolic curve peaking at 12pm
    const hoursFromNoon = Math.abs(hour - 12);
    const maxUV = 8; // Peak UV at noon
    const uvIndex = Math.max(0, maxUV - (hoursFromNoon * 1.2));

    // Calculate sun angle (simplified)
    const sunAngle = Math.max(0, 60 - (hoursFromNoon * 8));

    curve.push({
      hour,
      uvIndex: Math.round(uvIndex * 10) / 10,
      sunAngle: Math.round(sunAngle),
    });
  }

  return curve;
}

/**
 * Generate mock sun data based on current time
 */
export function generateMockSunData(): SunData {
  const now = new Date();
  const currentHour = now.getHours();
  const uvCurve = generateMockUVCurve();

  // Find current UV index from curve
  const currentUVData = uvCurve.find(d => d.hour === currentHour) || uvCurve[0];
  const uvIndex = currentUVData.uvIndex;
  const uvLevel = getUVLevel(uvIndex);

  // Calculate time to burn (simplified - varies by skin type)
  // Assuming skin type 2 (fair skin)
  const baseTimeToBurn = 67; // minutes at UV 1
  const timeToBurnMinutes = Math.round(baseTimeToBurn / Math.max(1, uvIndex));

  // Mock vitamin D progress (40-80% during peak sun hours)
  const vitaminDProgress = currentHour >= 10 && currentHour <= 14
    ? Math.min(80, 20 + (currentHour - 10) * 15)
    : Math.max(0, 40 - Math.abs(currentHour - 12) * 5);

  return {
    uvIndex,
    uvLevel,
    timeToBurnMinutes,
    maxSunTimeMinutes: 120, // Suggested sun exposure time
    vitaminDProgress,
    vitaminDGoal: 5000, // Suggested goal (IU) - consult your healthcare provider
    vitaminDCurrent: Math.round((vitaminDProgress / 100) * 5000),
    sunriseTime: '6:32 AM',
    solarNoonTime: '12:00 PM',
    sunsetTime: '7:45 PM',
    sweetSpotStart: 10, // 10am
    sweetSpotEnd: 14, // 2pm
    hasOptimalWindow: true, // Mock data always has optimal window
    uvCurve,
  };
}

/**
 * Get mock supplement data
 */
export function getMockSupplementData(): SupplementData {
  // Check if already logged today (using localStorage)
  const today = new Date().toDateString();
  const lastLogged = typeof window !== 'undefined'
    ? localStorage.getItem('bask_supplement_logged')
    : null;

  return {
    amount: 2000,
    unit: 'IU',
    isLoggedToday: lastLogged === today,
  };
}

/**
 * Log supplement intake for today
 */
export function logSupplementIntake(): void {
  if (typeof window !== 'undefined') {
    const today = new Date().toDateString();
    localStorage.setItem('bask_supplement_logged', today);
  }
}

/**
 * Get available clothing presets
 */
export function getMockClothingPresets(): ClothingPreset[] {
  return [
    {
      id: 'tank-top',
      name: 'Tank Top',
      coveragePercent: 20,
    },
    {
      id: 'gym-clothes',
      name: 'Gym Clothes',
      coveragePercent: 40,
    },
    {
      id: 't-shirt-shorts',
      name: 'T-Shirt & Shorts',
      coveragePercent: 50,
    },
    {
      id: 'casual',
      name: 'Casual Wear',
      coveragePercent: 70,
    },
    {
      id: 'full-coverage',
      name: 'Long Sleeves',
      coveragePercent: 90,
    },
  ];
}
