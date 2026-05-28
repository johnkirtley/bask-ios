'use client';

import { useEffect, useMemo, useState } from 'react';
import { UVDataPoint } from '../../lib/sunDataUtils';
import GlassCardWrapper from './GlassCardWrapper';

interface SolarWindowChartProps {
  uvCurve: UVDataPoint[];
  sweetSpotStart: number; // hour (e.g., 10)
  sweetSpotEnd: number; // hour (e.g., 14)
  hasOptimalWindow: boolean; // whether sweet spot is viable
  sunriseTime: string;
  solarNoonTime: string;
  sunsetTime: string;
}

interface SolarMarker {
  kind: 'sunrise' | 'solarNoon' | 'sunset';
  hour: number;
  label: string;
  shortLabel: string;
}

/** Parse "6:32 AM" / "12:36 PM" to fractional hour (0–24). */
function parseTimeToHour(timeStr: string): number | null {
  if (!timeStr || timeStr === '--') return null;

  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();

  if (period === 'PM' && hours !== 12) hours += 12;
  else if (period === 'AM' && hours === 12) hours = 0;

  return hours + minutes / 60;
}

function shortSolarLabel(kind: SolarMarker['kind']): string {
  switch (kind) {
    case 'sunrise':
      return 'Sunrise';
    case 'solarNoon':
      return 'Noon';
    case 'sunset':
      return 'Sunset';
  }
}

const MIN_HOUR = 6;
const MAX_HOUR = 20;

function buildFilledCurve(uvCurve: UVDataPoint[]): UVDataPoint[] {
  if (uvCurve.length === 0) return [];

  const sorted = [...uvCurve].sort((a, b) => a.hour - b.hour);
  const deduped = sorted.filter((d, i) => i === 0 || d.hour !== sorted[i - 1].hour);

  const filled: UVDataPoint[] = [];
  for (let hour = MIN_HOUR; hour <= MAX_HOUR; hour++) {
    const existing = deduped.find((d) => d.hour === hour);
    if (existing) {
      filled.push(existing);
    } else {
      const before = deduped.filter((d) => d.hour < hour).pop();
      const after = deduped.find((d) => d.hour > hour);
      if (before && after) {
        const ratio = (hour - before.hour) / (after.hour - before.hour);
        filled.push({
          hour,
          uvIndex: before.uvIndex + (after.uvIndex - before.uvIndex) * ratio,
          sunAngle: before.sunAngle + (after.sunAngle - before.sunAngle) * ratio,
        });
      } else if (before) {
        filled.push({ ...before, hour });
      } else if (after) {
        filled.push({ ...after, hour });
      } else {
        filled.push({ hour, uvIndex: 0, sunAngle: 0 });
      }
    }
  }

  return filled;
}

function interpolateUVAtHour(curve: UVDataPoint[], hour: number): number {
  if (curve.length === 0) return 0;

  const first = curve[0];
  const last = curve[curve.length - 1];
  if (hour <= first.hour) return first.uvIndex;
  if (hour >= last.hour) return last.uvIndex;

  for (let i = 0; i < curve.length - 1; i++) {
    const a = curve[i];
    const b = curve[i + 1];
    if (hour >= a.hour && hour <= b.hour) {
      const ratio = (hour - a.hour) / (b.hour - a.hour);
      return a.uvIndex + (b.uvIndex - a.uvIndex) * ratio;
    }
  }

  return last.uvIndex;
}

/**
 * Minimalist line graph showing UV intensity for the day
 * Highlights the "sweet spot" for vitamin D synthesis
 */
export default function SolarWindowChart({
  uvCurve,
  sweetSpotStart,
  sweetSpotEnd,
  hasOptimalWindow,
  sunriseTime,
  solarNoonTime,
  sunsetTime,
}: SolarWindowChartProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const updateNow = () => setNow(new Date());
    updateNow();
    const interval = setInterval(updateNow, 60000);
    return () => clearInterval(interval);
  }, []);

  // Use viewBox for responsive sizing
  const viewBoxWidth = 350;
  const viewBoxHeight = 196;
  const padding = { top: 20, right: 20, bottom: 44, left: 35 };
  const chartWidth = viewBoxWidth - padding.left - padding.right;
  const chartHeight = viewBoxHeight - padding.top - padding.bottom;

  // Calculate scales
  const maxUV = 12;

  const scaleX = (hour: number) => {
    return ((hour - MIN_HOUR) / (MAX_HOUR - MIN_HOUR)) * chartWidth;
  };

  const clampedScaleX = (hour: number) => {
    const clamped = Math.max(MIN_HOUR, Math.min(MAX_HOUR, hour));
    return scaleX(clamped);
  };

  const scaleY = (uvIndex: number) => {
    return chartHeight - (uvIndex / maxUV) * chartHeight;
  };

  const filledCurve = useMemo(() => buildFilledCurve(uvCurve), [uvCurve]);

  const linePath = useMemo(() => {
    if (filledCurve.length === 0) return '';

    const points = filledCurve.map((d) => ({
      x: scaleX(d.hour),
      y: scaleY(d.uvIndex),
    }));

    return points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' ');
  }, [filledCurve]);

  const currentPosition = useMemo(() => {
    if (filledCurve.length === 0) return null;

    const hourFraction = now.getHours() + now.getMinutes() / 60;
    if (hourFraction < MIN_HOUR || hourFraction > MAX_HOUR) return null;

    const uvIndex = interpolateUVAtHour(filledCurve, hourFraction);
    return {
      x: scaleX(hourFraction),
      y: scaleY(uvIndex),
    };
  }, [filledCurve, now]);

  // Generate area path for sweet spot shading
  const sweetSpotPath = useMemo(() => {
    const sweetSpotData = filledCurve.filter(
      (d) => d.hour >= sweetSpotStart && d.hour <= sweetSpotEnd
    );

    if (sweetSpotData.length === 0) return '';

    const points = sweetSpotData.map((d) => ({
      x: scaleX(d.hour),
      y: scaleY(d.uvIndex),
    }));

    const topPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const bottomPath = `L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`;

    return topPath + bottomPath;
  }, [filledCurve, sweetSpotStart, sweetSpotEnd]);

  const solarMarkers = useMemo((): SolarMarker[] => {
    const candidates: { kind: SolarMarker['kind']; time: string }[] = [
      { kind: 'sunrise', time: sunriseTime },
      { kind: 'solarNoon', time: solarNoonTime },
      { kind: 'sunset', time: sunsetTime },
    ];

    return candidates
      .map(({ kind, time }) => {
        const hour = parseTimeToHour(time);
        if (hour === null) return null;
        return {
          kind,
          hour,
          label: time,
          shortLabel: shortSolarLabel(kind),
        };
      })
      .filter((m): m is SolarMarker => m !== null);
  }, [sunriseTime, solarNoonTime, sunsetTime]);

  // X-axis labels (every 2 hours)
  const xLabels = [6, 8, 10, 12, 14, 16, 18, 20];

  // Y-axis labels
  const yLabels = [0, 3, 6, 9, 12];

  return (
    <GlassCardWrapper>
      <div className="mb-4">
        <h3 className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-text-secondary mb-1">
          Solar Window
        </h3>
        <p className="text-xs text-text-secondary">
          UV intensity throughout the day
        </p>
      </div>

      <svg
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        className="mx-auto w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="UV intensity chart with sunrise, solar noon, and sunset markers from 6am to 8pm">
        <g transform={`translate(${padding.left}, ${padding.top})`}>
          {/* Sunrise / sunset / solar noon markers (behind curve) */}
          {solarMarkers.map((marker) => {
            const x = clampedScaleX(marker.hour);
            const isNoon = marker.kind === 'solarNoon';
            const noonUvY =
              isNoon && filledCurve.length > 0
                ? scaleY(interpolateUVAtHour(filledCurve, marker.hour))
                : null;

            return (
              <g key={marker.kind}>
                <line
                  x1={x}
                  y1={0}
                  x2={x}
                  y2={chartHeight}
                  stroke={
                    isNoon ? 'rgba(244, 165, 54, 0.35)' : 'rgba(0, 0, 0, 0.18)'
                  }
                  strokeWidth={isNoon ? 1 : 1}
                  strokeDasharray={isNoon ? undefined : '2,3'}
                />
                {isNoon && (
                  <>
                    {noonUvY !== null && (
                      <line
                        x1={x}
                        y1={10}
                        x2={x}
                        y2={noonUvY}
                        stroke="rgba(244, 165, 54, 0.25)"
                        strokeWidth={1}
                      />
                    )}
                    <circle cx={x} cy={8} r={9} fill="rgba(244, 165, 54, 0.15)" />
                    <circle cx={x} cy={8} r={5} fill="#F4A536" />
                    <circle
                      cx={x}
                      cy={8}
                      r={5}
                      fill="none"
                      stroke="rgba(255, 255, 255, 0.6)"
                      strokeWidth={1}
                    />
                  </>
                )}
                <text
                  x={x}
                  y={chartHeight + 28}
                  textAnchor="middle"
                  className="text-[10px] fill-text-muted">
                  {marker.shortLabel}
                </text>
                <text
                  x={x}
                  y={chartHeight + 38}
                  textAnchor="middle"
                  className="text-[10px] fill-text-secondary font-medium">
                  {marker.label}
                </text>
              </g>
            );
          })}

          {/* Y-axis grid lines */}
          {yLabels.map((label) => (
            <g key={label}>
              <line
                x1={0}
                y1={scaleY(label)}
                x2={chartWidth}
                y2={scaleY(label)}
                stroke="rgba(0, 0, 0, 0.08)"
                strokeWidth={1}
              />
              <text
                x={-10}
                y={scaleY(label)}
                textAnchor="end"
                alignmentBaseline="middle"
                className="text-xs fill-text-secondary">
                {label}
              </text>
            </g>
          ))}

          {/* Sweet spot background highlight (full column) - only show if viable */}
          {hasOptimalWindow && sweetSpotStart !== undefined && sweetSpotEnd !== undefined && (
            <>
              <rect
                x={scaleX(sweetSpotStart)}
                y={0}
                width={scaleX(sweetSpotEnd) - scaleX(sweetSpotStart)}
                height={chartHeight}
                fill="#FFC93C"
                fillOpacity={0.12}
                rx={4}
              />
              {/* Dashed boundary lines at sweet spot edges */}
              <line
                x1={scaleX(sweetSpotStart)}
                y1={0}
                x2={scaleX(sweetSpotStart)}
                y2={chartHeight}
                stroke="#FFC93C"
                strokeWidth={1}
                strokeDasharray="4,4"
                strokeOpacity={0.35}
              />
              <line
                x1={scaleX(sweetSpotEnd)}
                y1={0}
                x2={scaleX(sweetSpotEnd)}
                y2={chartHeight}
                stroke="#FFC93C"
                strokeWidth={1}
                strokeDasharray="4,4"
                strokeOpacity={0.35}
              />
            </>
          )}

          {/* Sweet spot shaded area - only show if viable */}
          {hasOptimalWindow && sweetSpotPath && (
            <path
              d={sweetSpotPath}
              fill="#FFC93C"
              fillOpacity={0.25}
            />
          )}

          {/* No synthesis window message */}
          {!hasOptimalWindow && (
            <text
              x={chartWidth / 2}
              y={chartHeight / 2}
              textAnchor="middle"
              alignmentBaseline="middle"
              className="text-xs fill-text-secondary italic">
              No D synthesis window today
            </text>
          )}

          {/* UV curve line */}
          <path
            d={linePath}
            fill="none"
            stroke="#F4A536"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Current time indicator — overlay on top of line */}
          {currentPosition && (
            <>
              <circle
                cx={currentPosition.x}
                cy={currentPosition.y}
                r={7}
                fill="#FBF6EB"
              />
              <circle
                cx={currentPosition.x}
                cy={currentPosition.y}
                r={5}
                fill="#F4A536"
                className="pulsing-dot"
              />
            </>
          )}

          {/* X-axis */}
          <line
            x1={0}
            y1={chartHeight}
            x2={chartWidth}
            y2={chartHeight}
            stroke="rgba(0, 0, 0, 0.15)"
            strokeWidth={1}
          />

          {/* X-axis labels */}
          {xLabels.map((hour) => (
            <text
              key={hour}
              x={scaleX(hour)}
              y={chartHeight + 15}
              textAnchor="middle"
              className="text-xs fill-text-secondary">
              {hour === 12 ? '12pm' : hour > 12 ? `${hour - 12}pm` : `${hour}am`}
            </text>
          ))}

          {/* Y-axis */}
          <line
            x1={0}
            y1={0}
            x2={0}
            y2={chartHeight}
            stroke="rgba(0, 0, 0, 0.15)"
            strokeWidth={1}
          />
        </g>
      </svg>

      {/* Sweet spot label - only show if window exists */}
      {hasOptimalWindow && (
        <div className="mt-2 text-center">
          <span className="text-xs text-text-secondary">
            <span className="inline-block w-3 h-3 rounded-full mr-1" style={{ backgroundColor: '#F4A536' }}></span>
            <span className="mr-3">UV intensity</span>
            <span className="inline-block w-3 h-3 bg-solar-flare/20 border border-solar-flare/50 rounded-sm mr-1"></span>
            Optimal window
          </span>
        </div>
      )}
    </GlassCardWrapper>
  );
}
