'use client';

import { Capacitor } from '@capacitor/core';

// Apple Weather data-source attribution. Required by the WeatherKit terms:
// when running on a real device we surface the Apple Weather trademark and the
// legal-attribution link. On web there's no WeatherKit, so the UV/weather data
// is simulated and we say so. The legal link below is the exact URL that passed
// App Review — do not change it.
const LEGAL_ATTRIBUTION_URL =
  'https://weatherkit.apple.com/legal-attribution.html';

// U+F8FF renders as the  glyph in the system font used by the iOS WebView.
const APPLE_WEATHER_MARK = 'Weather Data Provided By  Weather';

interface WeatherAttributionProps {
  className?: string;
}

export default function WeatherAttribution({
  className = '',
}: WeatherAttributionProps) {
  return (
    <p className={`text-xs text-text-muted ${className}`}>
      {Capacitor.isNativePlatform() ? (
        <a
          href={LEGAL_ATTRIBUTION_URL}
          target='_blank'
          rel='noopener noreferrer'
          className='hover:text-text-secondary transition-colors'>
          {APPLE_WEATHER_MARK}
        </a>
      ) : (
        'Weather: Simulated Data'
      )}
    </p>
  );
}
