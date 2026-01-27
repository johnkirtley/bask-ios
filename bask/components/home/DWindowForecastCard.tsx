'use client';

import { OptimalWindow, DWindowForecast } from '../../lib/dWindowForecast';

interface DWindowForecastCardProps {
  forecast: DWindowForecast;
}

export default function DWindowForecastCard({ forecast }: DWindowForecastCardProps) {
  const getEfficiencyColor = (efficiency: string) => {
    switch (efficiency) {
      case 'excellent':
        return 'text-green-400';
      case 'good':
        return 'text-golden-glow';
      case 'moderate':
        return 'text-amber-400';
      case 'poor':
        return 'text-red-400';
      default:
        return 'text-text-secondary';
    }
  };

  const getEfficiencyLabel = (efficiency: string) => {
    switch (efficiency) {
      case 'excellent':
        return 'Excellent Conditions';
      case 'good':
        return 'Good Conditions';
      case 'moderate':
        return 'Moderate Conditions';
      case 'poor':
        return 'Poor Conditions';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="px-6 mt-6">
      <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-5 border border-white/20">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-5 h-5 text-golden-glow">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
              />
            </svg>
            <h3 className="text-white font-semibold">48-Hour D-Window</h3>
          </div>
          <span className={`text-xs font-medium ${getEfficiencyColor(forecast.efficiency)}`}>
            {getEfficiencyLabel(forecast.efficiency)}
          </span>
        </div>

        {/* Windows */}
        <div className="space-y-3">
          {forecast.today && <WindowDisplay window={forecast.today} />}
          {forecast.tomorrow && <WindowDisplay window={forecast.tomorrow} />}
          {!forecast.today && !forecast.tomorrow && (
            <div className="text-center py-4">
              <p className="text-text-secondary text-sm">No optimal UV windows in the next 48 hours</p>
              <p className="text-text-secondary text-xs mt-1">Consider supplementation</p>
            </div>
          )}
        </div>

        {/* Recommendations */}
        {forecast.recommendations.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="space-y-2">
              {forecast.recommendations.map((rec, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-4 h-4 text-golden-glow mt-0.5 flex-shrink-0">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
                    />
                  </svg>
                  <p className="text-text-secondary text-xs leading-relaxed">{rec}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function WindowDisplay({ window }: { window: OptimalWindow }) {
  return (
    <div className="backdrop-blur-sm bg-white/5 rounded-xl p-3 border border-white/10">
      <div className="flex items-center justify-between mb-2">
        <span className="text-white font-medium text-sm">{window.dayLabel}</span>
        <span className="text-xs text-text-secondary">{window.reason}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-golden-glow text-lg font-semibold">
          {window.startTime} – {window.endTime}
        </span>
        <span className="text-text-secondary text-xs">({window.durationMinutes} min)</span>
      </div>
      <div className="mt-2 flex items-center gap-3 text-xs">
        <div className="flex items-center gap-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-3.5 h-3.5 text-golden-glow">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
            />
          </svg>
          <span className="text-text-secondary">~{window.estimatedIU.toLocaleString()} IU</span>
        </div>
        <div className="w-px h-3 bg-white/20" />
        <div className="flex items-center gap-1">
          <span className="text-text-secondary">UV {window.avgUvIndex.toFixed(1)}</span>
        </div>
        {window.cloudCover > 0.3 && (
          <>
            <div className="w-px h-3 bg-white/20" />
            <div className="flex items-center gap-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-3.5 h-3.5 text-text-secondary">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z"
                />
              </svg>
              <span className="text-text-secondary">{Math.round(window.cloudCover * 100)}% clouds</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
