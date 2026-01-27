'use client';

/**
 * WeatherKit Attribution
 * REQUIRED by Apple for all apps using WeatherKit
 * Must be visible in the app where weather data is displayed
 */
export default function WeatherKitAttribution() {
  return (
    <div className="px-6 py-4 flex items-center justify-center">
      <a
        href="https://weatherkit.apple.com/legal-attribution.html"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-xs text-text-secondary hover:text-white transition-colors">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-4 h-4">
          <path d="M12 1.5C6.203 1.5 1.5 6.203 1.5 12S6.203 22.5 12 22.5 22.5 17.797 22.5 12 17.797 1.5 12 1.5zm0 19.5c-4.687 0-8.5-3.813-8.5-8.5S7.313 3.5 12 3.5s8.5 3.813 8.5 8.5-3.813 8.5-8.5 8.5z" />
          <path d="M12 6c-.552 0-1 .448-1 1v5c0 .552.448 1 1 1h4c.552 0 1-.448 1-1s-.448-1-1-1h-3V7c0-.552-.448-1-1-1z" />
        </svg>
        <span>Weather data provided by Apple Weather</span>
      </a>
    </div>
  );
}
