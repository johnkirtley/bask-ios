import type { MascotMood } from '../components/ui/Mascot';

interface MascotState {
  isNight?: boolean;
  sunburnRisk?: 'low' | 'moderate' | 'high';
  uvIndex?: number;
  goalProgress?: number; // 0 to 1+
}

/**
 * Derive the mascot mood from app state.
 * Priority: sleepy > burning > cloudy > excited > happy
 */
export function getMascotMood(state: MascotState): MascotMood {
  if (state.isNight) return 'sleepy';
  if (state.sunburnRisk === 'high') return 'burning';
  if (state.uvIndex !== undefined && state.uvIndex < 1.5) return 'cloudy';
  if (state.goalProgress !== undefined && state.goalProgress >= 1.0) return 'excited';
  return 'happy';
}
