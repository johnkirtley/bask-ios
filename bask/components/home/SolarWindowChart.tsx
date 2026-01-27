'use client';

import { useMemo } from 'react';
import { UVDataPoint } from '../../lib/mockData';

interface SolarWindowChartProps {
  uvCurve: UVDataPoint[];
  currentHour: number;
  sweetSpotStart: number; // hour (e.g., 10)
  sweetSpotEnd: number; // hour (e.g., 14)
}

/**
 * Minimalist line graph showing UV intensity for the day
 * Highlights the "sweet spot" for vitamin D synthesis
 * Shows pulsing dot at current time
 */
export default function SolarWindowChart({
  uvCurve,
  currentHour,
  sweetSpotStart,
  sweetSpotEnd,
}: SolarWindowChartProps) {
  const width = 350;
  const height = 180;
  const padding = { top: 20, right: 20, bottom: 30, left: 35 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate scales
  const maxUV = 12;
  const minHour = 6;
  const maxHour = 20;

  const scaleX = (hour: number) => {
    return ((hour - minHour) / (maxHour - minHour)) * chartWidth;
  };

  const scaleY = (uvIndex: number) => {
    return chartHeight - (uvIndex / maxUV) * chartHeight;
  };

  // Generate path for UV curve
  const linePath = useMemo(() => {
    if (uvCurve.length === 0) return '';

    const points = uvCurve.map((d) => ({
      x: scaleX(d.hour),
      y: scaleY(d.uvIndex),
    }));

    return points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' ');
  }, [uvCurve]);

  // Generate area path for sweet spot shading
  const sweetSpotPath = useMemo(() => {
    const sweetSpotData = uvCurve.filter(
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
  }, [uvCurve, sweetSpotStart, sweetSpotEnd]);

  // Current time position
  const currentPosition = useMemo(() => {
    const currentData = uvCurve.find((d) => d.hour === currentHour);
    if (!currentData) return null;

    return {
      x: scaleX(currentData.hour),
      y: scaleY(currentData.uvIndex),
    };
  }, [uvCurve, currentHour]);

  // X-axis labels (every 2 hours)
  const xLabels = [6, 8, 10, 12, 14, 16, 18, 20];

  // Y-axis labels
  const yLabels = [0, 3, 6, 9, 12];

  return (
    <div className="w-full px-4 py-6">
      <h3 className="text-lg font-semibold text-deep-charcoal mb-2">
        Solar Window
      </h3>
      <p className="text-xs text-text-secondary mb-4">
        UV intensity throughout the day
      </p>

      <svg
        width={width}
        height={height}
        className="mx-auto"
        role="img"
        aria-label="UV intensity chart showing hourly UV index from 6am to 8pm">
        <g transform={`translate(${padding.left}, ${padding.top})`}>
          {/* Y-axis grid lines */}
          {yLabels.map((label) => (
            <g key={label}>
              <line
                x1={0}
                y1={scaleY(label)}
                x2={chartWidth}
                y2={scaleY(label)}
                stroke="rgba(0, 0, 0, 0.1)"
                strokeWidth={1}
              />
              <text
                x={-10}
                y={scaleY(label)}
                textAnchor="end"
                alignmentBaseline="middle"
                className="text-[10px] fill-text-secondary">
                {label}
              </text>
            </g>
          ))}

          {/* Sweet spot shaded area */}
          {sweetSpotPath && (
            <path
              d={sweetSpotPath}
              fill="#FFBF5E"
              fillOpacity={0.15}
            />
          )}

          {/* UV curve line */}
          <path
            d={linePath}
            fill="none"
            stroke="#FFBF5E"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Current time pulsing dot */}
          {currentPosition && (
            <circle
              cx={currentPosition.x}
              cy={currentPosition.y}
              r={6}
              fill="#FFBF5E"
              className="pulsing-dot"
            />
          )}

          {/* X-axis */}
          <line
            x1={0}
            y1={chartHeight}
            x2={chartWidth}
            y2={chartHeight}
            stroke="rgba(0, 0, 0, 0.2)"
            strokeWidth={1}
          />

          {/* X-axis labels */}
          {xLabels.map((hour) => (
            <text
              key={hour}
              x={scaleX(hour)}
              y={chartHeight + 15}
              textAnchor="middle"
              className="text-[10px] fill-text-secondary">
              {hour === 12 ? '12pm' : hour > 12 ? `${hour - 12}pm` : `${hour}am`}
            </text>
          ))}

          {/* Y-axis */}
          <line
            x1={0}
            y1={0}
            x2={0}
            y2={chartHeight}
            stroke="rgba(0, 0, 0, 0.2)"
            strokeWidth={1}
          />
        </g>
      </svg>

      {/* Sweet spot label */}
      <div className="mt-2 text-center">
        <span className="text-xs text-text-secondary">
          <span className="inline-block w-3 h-3 bg-solar-amber/20 border border-solar-amber/50 rounded-sm mr-1"></span>
          Optimal vitamin D synthesis window
        </span>
      </div>
    </div>
  );
}
