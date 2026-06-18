'use client';

import {
  REFERENCE_BANDS,
  CHART_MAX_NG_ML,
  classifyNgMl,
  fromNgMl,
  type LabUnit,
} from '../../lib/labUtils';
import type { LabResult } from '../../lib/database';

interface LabTrendChartProps {
  /** Oldest-first results. */
  results: LabResult[];
  unit: LabUnit;
}

const WIDTH = 600;
const HEIGHT = 240;
const PAD = { top: 16, right: 16, bottom: 32, left: 44 };

export default function LabTrendChart({ results, unit }: LabTrendChartProps) {
  const plotW = WIDTH - PAD.left - PAD.right;
  const plotH = HEIGHT - PAD.top - PAD.bottom;

  // Y domain: cover the reference bands plus any value that exceeds them.
  const maxValue = Math.max(CHART_MAX_NG_ML, ...results.map((r) => r.value_ng_ml));
  const yMax = Math.ceil(maxValue / 10) * 10;

  const scaleY = (ngMl: number) => plotH - (ngMl / yMax) * plotH;

  // X domain: real time between first and last test so gaps read honestly.
  const times = results.map((r) => new Date(r.test_date).getTime());
  const tMin = Math.min(...times);
  const tMax = Math.max(...times);
  const span = Math.max(tMax - tMin, 1);
  const scaleX = (t: number) =>
    results.length === 1 ? plotW / 2 : ((t - tMin) / span) * plotW;

  const points = results.map((r) => ({
    x: scaleX(new Date(r.test_date).getTime()),
    y: scaleY(r.value_ng_ml),
    ngMl: r.value_ng_ml,
    band: classifyNgMl(r.value_ng_ml),
    date: new Date(r.test_date),
  }));

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  // Y-axis ticks every 20 (ng/mL) converted to the display unit.
  const ticks: number[] = [];
  for (let v = 0; v <= yMax; v += 20) ticks.push(v);

  const fmtDate = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

  return (
    <div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-auto" style={{ maxHeight: 280 }}>
        <g transform={`translate(${PAD.left}, ${PAD.top})`}>
          {/* Reference-range bands */}
          {REFERENCE_BANDS.map((band) => {
            const top = scaleY(Math.min(band.max, yMax));
            const bottom = scaleY(band.min);
            return (
              <rect
                key={band.status}
                x={0}
                y={top}
                width={plotW}
                height={Math.max(bottom - top, 0)}
                fill={band.color}
                opacity={0.1}
              />
            );
          })}

          {/* Band divider lines + labels */}
          {REFERENCE_BANDS.filter((b) => b.min > 0).map((band) => (
            <g key={`div-${band.status}`}>
              <line
                x1={0}
                x2={plotW}
                y1={scaleY(band.min)}
                y2={scaleY(band.min)}
                stroke={band.color}
                strokeWidth={1}
                strokeDasharray="3 3"
                opacity={0.4}
              />
            </g>
          ))}

          {/* Y-axis ticks */}
          {ticks.map((v) => (
            <text
              key={`y-${v}`}
              x={-8}
              y={scaleY(v) + 4}
              fontSize={10}
              className="fill-text-muted"
              textAnchor="end">
              {fromNgMl(v, unit)}
            </text>
          ))}

          {/* Area under line */}
          <defs>
            <linearGradient id="labArea" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#1AA1A2" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#1AA1A2" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {points.length > 1 && (
            <path
              d={`${linePath} L ${points[points.length - 1].x} ${plotH} L ${points[0].x} ${plotH} Z`}
              fill="url(#labArea)"
            />
          )}

          {/* Trend line */}
          {points.length > 1 && (
            <path
              d={linePath}
              fill="none"
              stroke="#572A19"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.85}
            />
          )}

          {/* Data points colored by band */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={4.5}
              fill={p.band.color}
              stroke="#FBF6EB"
              strokeWidth={2.5}
            />
          ))}

          {/* X-axis: first and last date */}
          {points.length > 0 && (
            <>
              <text
                x={points[0].x}
                y={plotH + 20}
                fontSize={10}
                className="fill-text-muted"
                textAnchor={points.length === 1 ? 'middle' : 'start'}>
                {fmtDate(points[0].date)}
              </text>
              {points.length > 1 && (
                <text
                  x={points[points.length - 1].x}
                  y={plotH + 20}
                  fontSize={10}
                  className="fill-text-muted"
                  textAnchor="end">
                  {fmtDate(points[points.length - 1].date)}
                </text>
              )}
            </>
          )}
        </g>
      </svg>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] text-text-secondary">
        {REFERENCE_BANDS.map((band) => (
          <div key={band.status} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: band.color }} />
            <span>{band.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
