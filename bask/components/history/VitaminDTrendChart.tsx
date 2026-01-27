'use client';

import { useEffect, useState } from 'react';
import { sessionsRepository, supplementsRepository } from '../../lib/database';

interface VitaminDTrendChartProps {
  className?: string;
}

interface DayTotal {
  date: string;
  dateObj: Date;
  sunIU: number;
  supplementIU: number;
  totalIU: number;
}

export default function VitaminDTrendChart({ className = '' }: VitaminDTrendChartProps) {
  const [data, setData] = useState<DayTotal[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7days' | '30days' | '90days'>('30days');

  useEffect(() => {
    loadTrendData();
  }, [timeRange]);

  const loadTrendData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const daysBack = timeRange === '7days' ? 7 : timeRange === '30days' ? 30 : 90;

      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - daysBack);
      startDate.setHours(0, 0, 0, 0);

      // Fetch all sessions and supplements for the range
      const [sessions, supplements] = await Promise.all([
        sessionsRepository.getByDateRange(startDate.toISOString(), now.toISOString()),
        supplementsRepository.getByDateRange(startDate.toISOString(), now.toISOString()),
      ]);

      // Build daily totals
      const dailyMap = new Map<string, DayTotal>();

      // Initialize all days in range with 0
      for (let i = 0; i <= daysBack; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const dateKey = date.toDateString();
        dailyMap.set(dateKey, {
          date: dateKey,
          dateObj: new Date(date),
          sunIU: 0,
          supplementIU: 0,
          totalIU: 0,
        });
      }

      // Add session IU
      sessions.forEach((session) => {
        const dateKey = new Date(session.started_at).toDateString();
        const day = dailyMap.get(dateKey);
        if (day) {
          day.sunIU += session.iu_gained;
          day.totalIU += session.iu_gained;
        }
      });

      // Add supplement IU
      supplements.forEach((supplement) => {
        const dateKey = new Date(supplement.logged_at).toDateString();
        const day = dailyMap.get(dateKey);
        if (day) {
          day.supplementIU += supplement.dosage_iu;
          day.totalIU += supplement.dosage_iu;
        }
      });

      const sortedData = Array.from(dailyMap.values()).sort(
        (a, b) => a.dateObj.getTime() - b.dateObj.getTime()
      );

      setData(sortedData);
    } catch (error) {
      console.error('Failed to load trend data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate chart dimensions and scaling
  const maxIU = Math.max(...data.map((d) => d.totalIU), 5000); // At least 5000 IU for scale
  const chartHeight = 200;
  const chartPadding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartWidth = 600; // Will be responsive via viewBox
  const plotWidth = chartWidth - chartPadding.left - chartPadding.right;
  const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom;

  // Scale functions
  const scaleY = (value: number) => {
    return plotHeight - (value / maxIU) * plotHeight;
  };

  const scaleX = (index: number) => {
    return (index / Math.max(data.length - 1, 1)) * plotWidth;
  };

  // Generate line path
  const generatePath = (dataPoints: number[]) => {
    if (dataPoints.length === 0) return '';

    return dataPoints
      .map((value, index) => {
        const x = scaleX(index);
        const y = scaleY(value);
        return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
      })
      .join(' ');
  };

  // Generate area path (filled under line)
  const generateAreaPath = (dataPoints: number[]) => {
    if (dataPoints.length === 0) return '';

    const linePath = generatePath(dataPoints);
    const lastIndex = dataPoints.length - 1;
    const closeArea = `L ${scaleX(lastIndex)} ${plotHeight} L 0 ${plotHeight} Z`;

    return linePath + ' ' + closeArea;
  };

  const totalPath = generatePath(data.map((d) => d.totalIU));
  const totalAreaPath = generateAreaPath(data.map((d) => d.totalIU));

  // Calculate stats
  const totalDaysTracked = data.filter((d) => d.totalIU > 0).length;
  const avgDailyIU = totalDaysTracked > 0
    ? Math.round(data.reduce((sum, d) => sum + d.totalIU, 0) / totalDaysTracked)
    : 0;
  const peakIU = Math.max(...data.map((d) => d.totalIU));

  // Format date for x-axis labels
  const getDateLabel = (dateObj: Date, index: number, total: number) => {
    // Show fewer labels for 90 days
    if (timeRange === '90days') {
      // Show first, middle, and last
      if (index === 0 || index === Math.floor(total / 2) || index === total - 1) {
        return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
      return '';
    } else if (timeRange === '30days') {
      // Show every 5th day for 30 days
      if (index % 5 === 0 || index === total - 1) {
        return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
      return '';
    } else {
      // Show all for 7 days
      return dateObj.toLocaleDateString('en-US', { weekday: 'short' });
    }
  };

  return (
    <div className={`backdrop-blur-xl bg-white/10 rounded-2xl p-6 border border-white/20 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Vitamin D Trend</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setTimeRange('7days')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              timeRange === '7days'
                ? 'bg-golden-glow text-dark-bg'
                : 'bg-white/5 text-text-secondary hover:bg-white/10'
            }`}>
            7D
          </button>
          <button
            onClick={() => setTimeRange('30days')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              timeRange === '30days'
                ? 'bg-golden-glow text-dark-bg'
                : 'bg-white/5 text-text-secondary hover:bg-white/10'
            }`}>
            30D
          </button>
          <button
            onClick={() => setTimeRange('90days')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              timeRange === '90days'
                ? 'bg-golden-glow text-dark-bg'
                : 'bg-white/5 text-text-secondary hover:bg-white/10'
            }`}>
            90D
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center">
          <div className="w-8 h-8 border-4 border-golden-glow/30 border-t-golden-glow rounded-full animate-spin mx-auto"></div>
          <p className="text-text-secondary text-sm mt-3">Loading trend data...</p>
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-text-secondary">No data available for this time range</p>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="backdrop-blur-sm bg-white/5 rounded-lg p-3 border border-white/10">
              <div className="text-text-secondary text-xs mb-1">Avg Daily</div>
              <div className="text-white text-xl font-bold">{avgDailyIU.toLocaleString()}</div>
              <div className="text-text-secondary text-xs">IU</div>
            </div>
            <div className="backdrop-blur-sm bg-white/5 rounded-lg p-3 border border-white/10">
              <div className="text-text-secondary text-xs mb-1">Peak Day</div>
              <div className="text-golden-glow text-xl font-bold">{peakIU.toLocaleString()}</div>
              <div className="text-text-secondary text-xs">IU</div>
            </div>
            <div className="backdrop-blur-sm bg-white/5 rounded-lg p-3 border border-white/10">
              <div className="text-text-secondary text-xs mb-1">Days Tracked</div>
              <div className="text-white text-xl font-bold">{totalDaysTracked}</div>
              <div className="text-text-secondary text-xs">of {data.length}</div>
            </div>
          </div>

          {/* Chart */}
          <div className="relative">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-auto"
              style={{ maxHeight: '250px' }}>
              {/* Gradient for area fill */}
              <defs>
                <linearGradient id="areaGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#F4B860" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#F4B860" stopOpacity="0.05" />
                </linearGradient>
              </defs>

              <g transform={`translate(${chartPadding.left}, ${chartPadding.top})`}>
                {/* Y-axis grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((fraction, i) => (
                  <g key={i}>
                    <line
                      x1={0}
                      x2={plotWidth}
                      y1={plotHeight * fraction}
                      y2={plotHeight * fraction}
                      stroke="rgba(255, 255, 255, 0.1)"
                      strokeWidth="1"
                    />
                    <text
                      x={-10}
                      y={plotHeight * fraction + 4}
                      fontSize="10"
                      fill="#9CA3AF"
                      textAnchor="end">
                      {Math.round(maxIU * (1 - fraction)).toLocaleString()}
                    </text>
                  </g>
                ))}

                {/* Goal line (5000 IU) */}
                {maxIU >= 5000 && (
                  <>
                    <line
                      x1={0}
                      x2={plotWidth}
                      y1={scaleY(5000)}
                      y2={scaleY(5000)}
                      stroke="#F4B860"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                      opacity="0.5"
                    />
                    <text
                      x={plotWidth}
                      y={scaleY(5000) - 5}
                      fontSize="10"
                      fill="#F4B860"
                      textAnchor="end">
                      Goal: 5000 IU
                    </text>
                  </>
                )}

                {/* Area fill */}
                <path d={totalAreaPath} fill="url(#areaGradient)" />

                {/* Line */}
                <path
                  d={totalPath}
                  fill="none"
                  stroke="#F4B860"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Data points */}
                {data.map((day, index) => {
                  if (day.totalIU === 0) return null;
                  return (
                    <circle
                      key={index}
                      cx={scaleX(index)}
                      cy={scaleY(day.totalIU)}
                      r="3"
                      fill="#F4B860"
                      stroke="#1F2937"
                      strokeWidth="2"
                    />
                  );
                })}

                {/* X-axis labels */}
                {data.map((day, index) => {
                  const label = getDateLabel(day.dateObj, index, data.length);
                  if (!label) return null;
                  return (
                    <text
                      key={index}
                      x={scaleX(index)}
                      y={plotHeight + 20}
                      fontSize="10"
                      fill="#9CA3AF"
                      textAnchor="middle">
                      {label}
                    </text>
                  );
                })}
              </g>
            </svg>
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center justify-center gap-4 text-xs text-text-secondary">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-golden-glow"></div>
              <span>Daily Total (Sun + Supplements)</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
