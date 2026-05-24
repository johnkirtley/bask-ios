'use client';

import { useEffect, useState } from 'react';
import { sessionsRepository, supplementsRepository, userProfileRepository } from '../../lib/database';
import { useSubscription } from '../../hooks/useSubscription';
import { DEFAULT_DAILY_GOAL_IU } from '../../lib/constants';
import ProBadge from '../ui/ProBadge';

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
  const { isPremium, presentPaywall } = useSubscription();
  const [data, setData] = useState<DayTotal[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7days' | '30days' | '90days'>('7days');
  const [dailyGoal, setDailyGoal] = useState(DEFAULT_DAILY_GOAL_IU);

  useEffect(() => {
    userProfileRepository.get().then((profile) => {
      if (profile?.daily_goal) {
        setDailyGoal(profile.daily_goal);
      }
    });
  }, []);

  // Force free users back to 7 days if they have a premium range set
  useEffect(() => {
    if (!isPremium && (timeRange === '30days' || timeRange === '90days')) {
      setTimeRange('7days');
    }
  }, [isPremium, timeRange]);

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
  const maxIU = Math.max(...data.map((d) => d.totalIU), dailyGoal);
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
    <div className={`backdrop-blur-xl bg-white/70 rounded-2xl p-6 border border-black/5 shadow-sm ${className}`}>
      {/* Header - Stacked Title and Time Range Selectors */}
      <div className="mb-6 space-y-4">
        {/* Title with Solar Accent */}
        <div className="text-center relative">
          <div className="absolute left-1/2 -translate-x-1/2 -top-1 w-32 h-8 bg-solar-flare/10 blur-2xl pointer-events-none"></div>
          <h2 className="text-2xl font-bold text-text-primary tracking-tight relative">
            Vitamin D Trend
          </h2>
        </div>

        {/* Time Range Selectors - Centered */}
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setTimeRange('7days')}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all touch-manipulation ${
              timeRange === '7days'
                ? 'bg-solar-flare text-white shadow-md'
                : 'bg-white/40 text-text-secondary hover:bg-black/5 active:bg-black/10'
            }`}
            aria-label="View 7 day trend">
            7D
          </button>
          <button
            onClick={async () => {
              if (!isPremium) {
                await presentPaywall();
              } else {
                setTimeRange('30days');
              }
            }}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all touch-manipulation flex items-center justify-center gap-1.5 ${
              timeRange === '30days'
                ? 'bg-solar-flare text-white shadow-md'
                : 'bg-white/40 text-text-secondary hover:bg-black/5 active:bg-black/10'
            }`}
            aria-label="View 30 day trend">
            30D
            {!isPremium && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-3 h-3 opacity-60">
                <path
                  fillRule="evenodd"
                  d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
          <button
            onClick={async () => {
              if (!isPremium) {
                await presentPaywall();
              } else {
                setTimeRange('90days');
              }
            }}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all touch-manipulation flex items-center justify-center gap-1.5 ${
              timeRange === '90days'
                ? 'bg-solar-flare text-white shadow-md'
                : 'bg-white/40 text-text-secondary hover:bg-black/5 active:bg-black/10'
            }`}
            aria-label="View 90 day trend">
            90D
            {!isPremium && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-3 h-3 opacity-60">
                <path
                  fillRule="evenodd"
                  d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center">
          <div className="w-8 h-8 border-4 border-solar-flare/30 border-t-golden-glow rounded-full animate-spin mx-auto"></div>
          <p className="text-text-secondary text-sm mt-3">Loading trend data...</p>
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-text-secondary">No data available for this time range</p>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            <div className="backdrop-blur-sm bg-white/70 rounded-lg p-2.5 border border-black/5">
              <div className="text-text-secondary text-[10px] mb-1 whitespace-nowrap">Avg</div>
              <div className="text-text-primary text-lg font-bold tabular-nums">{avgDailyIU.toLocaleString()}</div>
              <div className="text-text-secondary text-[10px]">IU</div>
            </div>
            <div className="backdrop-blur-sm bg-white/70 rounded-lg p-2.5 border border-black/5">
              <div className="text-text-secondary text-[10px] mb-1 whitespace-nowrap">Peak</div>
              <div className="text-solar-flare text-lg font-bold tabular-nums">{peakIU.toLocaleString()}</div>
              <div className="text-text-secondary text-[10px]">IU</div>
            </div>
            <div className="backdrop-blur-sm bg-white/70 rounded-lg p-2.5 border border-black/5">
              <div className="text-text-secondary text-[10px] mb-1 whitespace-nowrap">Tracked</div>
              <div className="text-text-primary text-lg font-bold tabular-nums">{totalDaysTracked}</div>
              <div className="text-text-secondary text-[10px]">of {data.length}</div>
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
                  <stop offset="0%" stopColor="#FFB347" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#FFB347" stopOpacity="0.05" />
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
                      stroke="rgba(0, 0, 0, 0.08)"
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

                {/* Goal line */}
                {maxIU >= dailyGoal && (
                  <>
                    <line
                      x1={0}
                      x2={plotWidth}
                      y1={scaleY(dailyGoal)}
                      y2={scaleY(dailyGoal)}
                      stroke="#FFB347"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                      opacity="0.5"
                    />
                    <text
                      x={plotWidth}
                      y={scaleY(dailyGoal) - 5}
                      fontSize="10"
                      fill="#FFB347"
                      textAnchor="end">
                      Goal: {dailyGoal.toLocaleString()} IU
                    </text>
                  </>
                )}

                {/* Area fill */}
                <path d={totalAreaPath} fill="url(#areaGradient)" />

                {/* Line */}
                <path
                  d={totalPath}
                  fill="none"
                  stroke="#FFB347"
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
                      fill="#FFB347"
                      stroke="#F0EDE9"
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
              <div className="w-3 h-3 rounded-full bg-solar-flare"></div>
              <span>Daily Total (Sun + Supplements)</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
