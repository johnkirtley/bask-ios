'use client';

import { useEffect, useState } from 'react';
import AtmosphericBackground from '../../components/home/AtmosphericBackground';
import { sessionsRepository, BaskSession } from '../../lib/database/repositories/sessionsRepository';
import { supplementsRepository, Supplement } from '../../lib/database/repositories/supplementsRepository';
import { cofactorsRepository, Cofactor } from '../../lib/database/repositories/cofactorsRepository';
import CalendarStreak from '../../components/history/CalendarStreak';
import VitaminDTrendChart from '../../components/history/VitaminDTrendChart';

type HistoryEntry = {
  type: 'session' | 'supplement' | 'cofactor';
  timestamp: string;
  data: BaskSession | Supplement | Cofactor;
};

export default function History() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7days' | '30days' | 'all'>('7days');
  const [activeTab, setActiveTab] = useState<'timeline' | 'calendar' | 'trends'>('timeline');

  useEffect(() => {
    loadHistory();
  }, [dateRange]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const now = new Date();
      let startDate: string;

      if (dateRange === '7days') {
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        startDate = sevenDaysAgo.toISOString();
      } else if (dateRange === '30days') {
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        startDate = thirtyDaysAgo.toISOString();
      } else {
        // For 'all', go back 1 year
        const oneYearAgo = new Date(now);
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        startDate = oneYearAgo.toISOString();
      }

      const [sessions, supplements, cofactors] = await Promise.all([
        sessionsRepository.getByDateRange(startDate, now.toISOString()),
        supplementsRepository.getByDateRange(startDate, now.toISOString()),
        cofactorsRepository.getByDateRange(startDate, now.toISOString()),
      ]);

      // Combine all entries with their timestamps
      const combined: HistoryEntry[] = [
        ...sessions.map((s) => ({
          type: 'session' as const,
          timestamp: s.started_at,
          data: s,
        })),
        ...supplements.map((s) => ({
          type: 'supplement' as const,
          timestamp: s.logged_at,
          data: s,
        })),
        ...cofactors.map((c) => ({
          type: 'cofactor' as const,
          timestamp: c.logged_at,
          data: c,
        })),
      ];

      // Sort by timestamp descending (most recent first)
      combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setEntries(combined);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const renderEntry = (entry: HistoryEntry) => {
    if (entry.type === 'session') {
      const session = entry.data as BaskSession;
      return (
        <div key={`session-${session.id}`} className='backdrop-blur-xl bg-white/10 rounded-xl p-4 border border-white/20 mb-3'>
          <div className='flex items-start justify-between'>
            <div className='flex items-start gap-3'>
              <div className='w-10 h-10 rounded-full bg-golden-glow/20 flex items-center justify-center flex-shrink-0'>
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  fill='none'
                  viewBox='0 0 24 24'
                  strokeWidth={2}
                  stroke='currentColor'
                  className='w-5 h-5 text-golden-glow'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    d='M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z'
                  />
                </svg>
              </div>
              <div>
                <h3 className='text-white font-medium'>Sun Exposure</h3>
                <p className='text-text-secondary text-sm'>{formatDate(session.started_at)}</p>
                <div className='mt-2 flex flex-wrap gap-3'>
                  <div className='flex items-center gap-1.5'>
                    <span className='text-golden-glow text-lg font-semibold'>
                      {session.iu_gained.toLocaleString()}
                    </span>
                    <span className='text-text-secondary text-xs'>IU</span>
                  </div>
                  <div className='text-text-secondary text-sm'>
                    {formatDuration(session.duration_seconds)}
                  </div>
                  <div className='text-text-secondary text-sm'>UV {session.uv_index}</div>
                  <div className='text-text-secondary text-sm'>{session.exposure_percent}% exposed</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    } else if (entry.type === 'supplement') {
      const supplement = entry.data as Supplement;
      return (
        <div key={`supplement-${supplement.id}`} className='backdrop-blur-xl bg-white/10 rounded-xl p-4 border border-white/20 mb-3'>
          <div className='flex items-start gap-3'>
            <div className='w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0'>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                fill='none'
                viewBox='0 0 24 24'
                strokeWidth={2}
                stroke='currentColor'
                className='w-5 h-5 text-amber-400'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232 1.232 3.23 0 4.462l-1.06 1.06a3 3 0 01-4.243 0l-1.06-1.06a3 3 0 010-4.243l1.06-1.06z'
                />
              </svg>
            </div>
            <div>
              <h3 className='text-white font-medium'>Vitamin D Supplement</h3>
              <p className='text-text-secondary text-sm'>{formatDate(supplement.logged_at)}</p>
              <div className='mt-2 flex items-center gap-1.5'>
                <span className='text-amber-400 text-lg font-semibold'>
                  {supplement.dosage_iu.toLocaleString()}
                </span>
                <span className='text-text-secondary text-xs'>IU</span>
              </div>
            </div>
          </div>
        </div>
      );
    } else {
      const cofactor = entry.data as Cofactor;
      const isMagnesium = cofactor.cofactor_type === 'magnesium';
      return (
        <div key={`cofactor-${cofactor.id}`} className='backdrop-blur-xl bg-white/10 rounded-xl p-4 border border-white/20 mb-3'>
          <div className='flex items-start gap-3'>
            <div className={`w-10 h-10 rounded-full ${isMagnesium ? 'bg-emerald-500/20' : 'bg-purple-500/20'} flex items-center justify-center flex-shrink-0`}>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                fill='none'
                viewBox='0 0 24 24'
                strokeWidth={2}
                stroke='currentColor'
                className={`w-5 h-5 ${isMagnesium ? 'text-emerald-400' : 'text-purple-400'}`}>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                />
              </svg>
            </div>
            <div>
              <h3 className='text-white font-medium'>
                {isMagnesium ? 'Magnesium' : 'Vitamin K2'}
              </h3>
              <p className='text-text-secondary text-sm'>{formatDate(cofactor.logged_at)}</p>
              <p className={`mt-1 text-sm ${isMagnesium ? 'text-emerald-400' : 'text-purple-400'}`}>
                Cofactor logged
              </p>
            </div>
          </div>
        </div>
      );
    }
  };

  return (
    <AtmosphericBackground>
      <div className='min-h-screen pb-20'>
        {/* Header */}
        <div className='px-6 py-6 pt-safe'>
          <h1 className='text-3xl font-semibold text-white'>History</h1>
          <p className='text-text-secondary mt-1'>Your vitamin D journey</p>
        </div>

        {/* Tab Navigation */}
        <div className='px-6 mb-4'>
          <div className='flex gap-2 backdrop-blur-sm bg-white/5 p-1 rounded-lg'>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'timeline'
                  ? 'bg-golden-glow text-dark-bg'
                  : 'text-text-secondary hover:text-white'
              }`}>
              Timeline
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'calendar'
                  ? 'bg-golden-glow text-dark-bg'
                  : 'text-text-secondary hover:text-white'
              }`}>
              Calendar
            </button>
            <button
              onClick={() => setActiveTab('trends')}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'trends'
                  ? 'bg-golden-glow text-dark-bg'
                  : 'text-text-secondary hover:text-white'
              }`}>
              Trends
            </button>
          </div>
        </div>

        {/* Date Range Filter (only show for timeline) */}
        {activeTab === 'timeline' && (
          <div className='px-6 mb-4'>
            <div className='flex gap-2'>
              <button
                onClick={() => setDateRange('7days')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  dateRange === '7days'
                    ? 'bg-golden-glow text-dark-bg'
                    : 'bg-white/10 text-text-secondary hover:bg-white/20'
                }`}>
                7 Days
              </button>
              <button
                onClick={() => setDateRange('30days')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  dateRange === '30days'
                    ? 'bg-golden-glow text-dark-bg'
                    : 'bg-white/10 text-text-secondary hover:bg-white/20'
                }`}>
                30 Days
              </button>
              <button
                onClick={() => setDateRange('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  dateRange === 'all'
                    ? 'bg-golden-glow text-dark-bg'
                    : 'bg-white/10 text-text-secondary hover:bg-white/20'
                }`}>
                All Time
              </button>
            </div>
          </div>
        )}

        {/* Main content */}
        <div className='px-6'>
          {activeTab === 'calendar' ? (
            <CalendarStreak />
          ) : activeTab === 'trends' ? (
            <VitaminDTrendChart />
          ) : loading ? (
            <div className='backdrop-blur-xl bg-white/10 rounded-2xl p-8 border border-white/20'>
              <div className='text-center py-8'>
                <div className='w-12 h-12 border-4 border-golden-glow/30 border-t-golden-glow rounded-full animate-spin mx-auto'></div>
                <p className='text-text-secondary mt-4'>Loading your history...</p>
              </div>
            </div>
          ) : entries.length === 0 ? (
            <div className='backdrop-blur-xl bg-white/10 rounded-2xl p-8 border border-white/20'>
              <div className='text-center py-8'>
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  fill='none'
                  viewBox='0 0 24 24'
                  strokeWidth={1.5}
                  stroke='currentColor'
                  className='w-16 h-16 mx-auto text-golden-glow mb-4'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    d='M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5'
                  />
                </svg>
                <h2 className='text-xl font-semibold text-white mb-3'>No History Yet</h2>
                <p className='text-text-secondary max-w-sm mx-auto'>
                  Start tracking your sun exposure, supplements, and cofactors to see your
                  vitamin D journey here.
                </p>
              </div>
            </div>
          ) : (
            <div>{entries.map((entry) => renderEntry(entry))}</div>
          )}
        </div>
      </div>
    </AtmosphericBackground>
  );
}
