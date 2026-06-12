'use client';

import { useEffect, useState, useMemo } from 'react';
import { IonAlert } from '@ionic/react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import AtmosphericBackground from '../../components/home/AtmosphericBackground';
import { sessionsRepository, BaskSession } from '../../lib/database/repositories/sessionsRepository';
import { supplementsRepository, Supplement } from '../../lib/database/repositories/supplementsRepository';
import { cofactorsRepository, Cofactor } from '../../lib/database/repositories/cofactorsRepository';
import CalendarStreak from '../../components/history/CalendarStreak';
import SwipeableCard from '../../components/history/SwipeableCard';
import EditEntryModal from '../../components/history/EditEntryModal';
import AddSessionModal from '../../components/history/AddSessionModal';
import { useSubscription } from '../../hooks/useSubscription';
import ProBadge from '../../components/ui/ProBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import StreakSummaryRow from '../../components/history/StreakSummaryRow';
import StreakDetailSheet from '../../components/streaks/StreakDetailSheet';
import { useStreakState } from '../../hooks/useStreakState';

type HistoryEntry = {
  type: 'session' | 'supplement' | 'cofactor';
  timestamp: string;
  data: BaskSession | Supplement | Cofactor;
};

type GroupedEntries = {
  date: string;
  label: string;
  entries: HistoryEntry[];
};

export default function History() {
  const { isPremium, presentPaywall } = useSubscription();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7days' | '30days' | 'all'>('7days');
  const [activeTab, setActiveTab] = useState<'timeline' | 'calendar'>('timeline');
  const [openSwipeId, setOpenSwipeId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HistoryEntry | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editTarget, setEditTarget] = useState<HistoryEntry | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isStreakSheetOpen, setIsStreakSheetOpen] = useState(false);
  const { summary: streakSummary, state: streakState, refreshStreak } = useStreakState();

  // Force free users back to 7 days if they somehow have a premium range set
  useEffect(() => {
    if (!isPremium && (dateRange === '30days' || dateRange === 'all')) {
      setDateRange('7days');
    }
  }, [isPremium, dateRange]);

  useEffect(() => {
    loadHistory();
    void refreshStreak('app_open');
  }, [dateRange, refreshStreak]);

  // Refresh history when app returns to foreground (to reflect HealthKit sync deletions)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let cleanup: (() => void) | undefined;

    async function setupListener() {
      const listener = await App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          loadHistory();
          void refreshStreak('app_open');
        }
      });
      cleanup = () => listener.remove();
    }

    setupListener();

    return () => {
      if (cleanup) cleanup();
    };
  }, [dateRange, refreshStreak]);

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

  const formatDate = (timestamp: string, source?: 'manual' | 'healthkit') => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // For HealthKit entries, omit time since they represent full-day aggregates
    const includeTime = source !== 'healthkit';

    if (date.toDateString() === today.toDateString()) {
      return includeTime
        ? `Today, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
        : 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return includeTime
        ? `Yesterday, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
        : 'Yesterday';
    } else {
      return includeTime
        ? date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })
        : date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          });
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getEntryId = (entry: HistoryEntry): string => {
    return `${entry.type}-${(entry.data as any).id}`;
  };

  // Group entries by date
  const groupedEntries = useMemo(() => {
    const groups: GroupedEntries[] = [];
    const dateMap = new Map<string, HistoryEntry[]>();

    entries.forEach((entry) => {
      const date = new Date(entry.timestamp);
      const dateKey = date.toDateString();

      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, []);
      }
      dateMap.get(dateKey)!.push(entry);
    });

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    dateMap.forEach((entries, dateKey) => {
      const date = new Date(dateKey);
      let label: string;

      if (date.toDateString() === today.toDateString()) {
        label = 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        label = 'Yesterday';
      } else {
        label = date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
        });
      }

      groups.push({ date: dateKey, label, entries });
    });

    // Sort groups by date descending
    groups.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return groups;
  }, [entries]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    let totalIU = 0;
    let sessionCount = 0;
    let supplementCount = 0;
    let cofactorCount = 0;

    entries.forEach((entry) => {
      if (entry.type === 'session') {
        const session = entry.data as BaskSession;
        totalIU += session.iu_gained;
        sessionCount++;
      } else if (entry.type === 'supplement') {
        const supplement = entry.data as Supplement;
        totalIU += supplement.dosage_iu;
        supplementCount++;
      } else {
        cofactorCount++;
      }
    });

    return { totalIU, sessionCount, supplementCount, cofactorCount };
  }, [entries]);

  const handleDeleteRequest = (entry: HistoryEntry) => {
    setDeleteTarget(entry);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    try {
      const id = (deleteTarget.data as any).id;

      switch (deleteTarget.type) {
        case 'session':
          await sessionsRepository.delete(id);
          break;
        case 'supplement':
          await supplementsRepository.delete(id);
          break;
        case 'cofactor':
          await cofactorsRepository.delete(id);
          break;
      }

      // Haptic feedback on successful delete
      try {
        await Haptics.notification({ type: NotificationType.Warning });
      } catch {}

      // Optimistic state update: remove from entries array
      setEntries((prev) =>
        prev.filter((e) => (e.data as any).id !== id || e.type !== deleteTarget.type)
      );

      setOpenSwipeId(null);
    } catch (error) {
      console.error('Failed to delete entry:', error);
    } finally {
      setDeleteTarget(null);
      setShowDeleteConfirm(false);
    }
  };

  const handleEditRequest = (entry: HistoryEntry) => {
    setEditTarget(entry);
    setShowEditModal(true);
    setOpenSwipeId(null);
  };

  const handleEditSave = async (
    entry: HistoryEntry,
    updates: { notes?: string; dosage_iu?: number }
  ) => {
    const id = (entry.data as any).id;

    try {
      switch (entry.type) {
        case 'session':
          await sessionsRepository.update(id, { notes: updates.notes });
          break;
        case 'supplement':
          await supplementsRepository.update(id, updates);
          break;
        case 'cofactor':
          await cofactorsRepository.update(id, { notes: updates.notes });
          break;
      }

      try {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } catch {}

      // Optimistic state update: update entry in-place
      setEntries((prev) =>
        prev.map((e) => {
          if ((e.data as any).id === id && e.type === entry.type) {
            return {
              ...e,
              data: { ...e.data, ...updates },
            };
          }
          return e;
        })
      );

      setShowEditModal(false);
      setEditTarget(null);
    } catch (error) {
      console.error('Failed to update entry:', error);
    }
  };

  const renderEntry = (entry: HistoryEntry) => {
    const entryId = getEntryId(entry);
    let cardContent;

    if (entry.type === 'session') {
      const session = entry.data as BaskSession;
      cardContent = (
        <div className='history-entry-card relative backdrop-blur-xl rounded-card p-5 overflow-hidden'
             style={{
               background: 'linear-gradient(135deg, rgba(255, 201, 60, 0.15) 0%, rgba(244, 165, 54, 0.08) 100%), rgba(255, 255, 255, 0.75)'
             }}>
          {/* Subtle radial glow */}
          <div className='absolute top-0 right-0 w-32 h-32 bg-solar-flare/10 rounded-full blur-2xl -z-10' />

          <div className='flex items-start gap-4'>
            <div className='w-12 h-12 rounded-xl bg-gradient-to-br from-solar-flare to-solar-warm flex items-center justify-center flex-shrink-0 shadow-md'>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                fill='none'
                viewBox='0 0 24 24'
                strokeWidth={2.5}
                stroke='currentColor'
                className='w-6 h-6 text-white'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z'
                />
              </svg>
            </div>
            <div className='flex-1'>
              <div className='flex items-center gap-2'>
                <h3 className='text-text-primary font-semibold text-base'>Sun Exposure</h3>
                {session.source === 'healthkit' && (
                  <img
                    src='/assets/Icon - Apple Health.png'
                    alt='Apple Health'
                    className='w-5 h-5'
                  />
                )}
              </div>
              <p className='text-text-secondary text-xs mt-0.5'>{formatDate(session.started_at, session.source)}</p>
              <div className='mt-3 space-y-2'>
                <div className='flex items-baseline justify-between'>
                  <span className='text-text-secondary text-xs'>Vitamin D</span>
                  <span className='text-solar-warm text-sm font-semibold'>{session.iu_gained.toLocaleString()} IU</span>
                </div>
                <div className='flex items-baseline justify-between'>
                  <span className='text-text-secondary text-xs'>Duration</span>
                  <span className='text-text-primary text-sm font-semibold'>{formatDuration(session.duration_seconds)}</span>
                </div>
                <div className='flex items-baseline justify-between'>
                  <span className='text-text-secondary text-xs'>UV Index</span>
                  <span className='text-text-primary text-sm font-semibold'>{Math.round(session.uv_index)}</span>
                </div>
                <div className='flex items-baseline justify-between'>
                  <span className='text-text-secondary text-xs'>Skin Exposed</span>
                  <span className='text-text-primary text-sm font-semibold'>{session.exposure_percent}%</span>
                </div>
              </div>
              {session.source === 'healthkit' && (
                <div className='mt-3 pt-3 border-t border-white/30'>
                  <p className='text-text-secondary text-xs italic'>
                    Synced from Apple Health. To update or remove, make changes in the Health app.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    } else if (entry.type === 'supplement') {
      const supplement = entry.data as Supplement;
      cardContent = (
        <div className='history-entry-card relative backdrop-blur-xl rounded-card p-5 overflow-hidden'
             style={{
               background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.12) 0%, rgba(245, 158, 11, 0.06) 100%), rgba(255, 255, 255, 0.75)'
             }}>
          <div className='absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl -z-10' />

          <div className='flex items-start gap-4'>
            <div className='w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center flex-shrink-0 shadow-md'>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                fill='none'
                viewBox='0 0 24 24'
                strokeWidth={2.5}
                stroke='currentColor'
                className='w-6 h-6 text-white'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232 1.232 3.23 0 4.462l-1.06 1.06a3 3 0 01-4.243 0l-1.06-1.06a3 3 0 010-4.243l1.06-1.06z'
                />
              </svg>
            </div>
            <div className='flex-1'>
              <h3 className='text-text-primary font-semibold text-base'>Vitamin D Supplement</h3>
              <p className='text-text-secondary text-xs mt-0.5'>{formatDate(supplement.logged_at)}</p>
              <div className='mt-3 space-y-2'>
                <div className='flex items-baseline justify-between'>
                  <span className='text-text-secondary text-xs'>Dosage</span>
                  <span className='text-amber-500 text-sm font-semibold'>{supplement.dosage_iu.toLocaleString()} IU</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    } else {
      const cofactor = entry.data as Cofactor;
      const isMagnesium = cofactor.cofactor_type === 'magnesium';
      cardContent = (
        <div className='history-entry-card relative backdrop-blur-xl rounded-card p-5 overflow-hidden'
             style={{
               background: isMagnesium
                 ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.06) 100%), rgba(255, 255, 255, 0.75)'
                 : 'linear-gradient(135deg, rgba(168, 85, 247, 0.12) 0%, rgba(147, 51, 234, 0.06) 100%), rgba(255, 255, 255, 0.75)'
             }}>
          <div className={`absolute top-0 right-0 w-32 h-32 ${isMagnesium ? 'bg-grove-green-light/10' : 'bg-purple-400/10'} rounded-full blur-2xl -z-10`} />

          <div className='flex items-start gap-4'>
            <div className={`w-12 h-12 rounded-xl ${isMagnesium ? 'bg-gradient-to-br from-grove-green-light to-grove-green' : 'bg-gradient-to-br from-purple-400 to-purple-500'} flex items-center justify-center flex-shrink-0 shadow-md`}>
              <span className='text-base font-bold text-white'>
                {isMagnesium ? 'Mg' : 'K₂'}
              </span>
            </div>
            <div className='flex-1'>
              <h3 className='text-text-primary font-semibold text-base'>
                {isMagnesium ? 'Magnesium' : 'Vitamin K2'}
              </h3>
              <p className='text-text-secondary text-xs mt-0.5'>{formatDate(cofactor.logged_at)}</p>
              <div className='mt-3 space-y-2'>
                <div className='flex items-baseline justify-between'>
                  <span className='text-text-secondary text-xs'>Status</span>
                  <span className={`text-sm font-medium ${isMagnesium ? 'text-grove-green' : 'text-purple-500'}`}>
                    Logged
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div key={entryId} className='timeline-entry'>
        <SwipeableCard
          isOpen={openSwipeId === entryId}
          onSwipeOpen={() => setOpenSwipeId(entryId)}
          onSwipeClose={() => setOpenSwipeId(null)}
          onDelete={() => handleDeleteRequest(entry)}>
          <div onClick={() => handleEditRequest(entry)} className='cursor-pointer'>
            {cardContent}
          </div>
        </SwipeableCard>
      </div>
    );
  };

  return (
    <AtmosphericBackground>
      <div className='min-h-screen pb-20 overflow-x-hidden overflow-hidden overscroll-contain'>
        {/* Header */}
        <div className='px-6 py-6 pt-safe'>
          <h1 className='text-[32px] font-extrabold tracking-[-0.02em] text-text-primary'>History</h1>
          <p className='text-text-secondary mt-1'>Your sun and supplement history</p>
          <button
            type='button'
            onClick={() => setShowAddModal(true)}
            aria-label='Add manual session'
            className='mt-4 w-full flex items-center justify-center gap-2 rounded-full bg-solar-flare text-white shadow-lg py-3 text-sm font-semibold active:scale-[0.98] transition-transform'>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              fill='none'
              viewBox='0 0 24 24'
              strokeWidth={2.5}
              stroke='currentColor'
              className='w-5 h-5'>
              <path strokeLinecap='round' strokeLinejoin='round' d='M12 4.5v15m7.5-7.5h-15' />
            </svg>
            Add Manual Session
          </button>
        </div>

        {/* Tab Navigation */}
        <div className='px-6 mb-4'>
          <div className='flex gap-2 backdrop-blur-xl bg-white/60 p-1.5 rounded-card border border-white/40 shadow-md'>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                activeTab === 'timeline'
                  ? 'bg-bask-teal text-white shadow-lg'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/50'
              }`}>
              Timeline
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                activeTab === 'calendar'
                  ? 'bg-bask-teal text-white shadow-lg'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/50'
              }`}>
              Calendar
            </button>
          </div>
        </div>

        {/* Date Range Filter (only show for timeline) */}
        {activeTab === 'timeline' && (
          <div className='px-6 mb-6'>
            <div className='flex gap-2'>
              <button
                onClick={() => setDateRange('7days')}
                className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                  dateRange === '7days'
                    ? 'bg-[#572A19] text-white shadow-lg'
                    : 'backdrop-blur-xl bg-white/50 text-text-secondary hover:bg-white/70 hover:text-text-primary border border-white/40'
                }`}>
                7 Days
              </button>
              <button
                onClick={async () => {
                  if (!isPremium) {
                    await presentPaywall();
                  } else {
                    setDateRange('30days');
                  }
                }}
                className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-1.5 relative ${
                  dateRange === '30days'
                    ? 'bg-[#572A19] text-white shadow-lg'
                    : 'backdrop-blur-xl bg-white/50 text-text-secondary hover:bg-white/70 hover:text-text-primary border border-white/40'
                }`}>
                30 Days
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
                    setDateRange('all');
                  }
                }}
                className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-1.5 relative ${
                  dateRange === 'all'
                    ? 'bg-[#572A19] text-white shadow-lg'
                    : 'backdrop-blur-xl bg-white/50 text-text-secondary hover:bg-white/70 hover:text-text-primary border border-white/40'
                }`}>
                All Time
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
        )}

        {/* Main content */}
        <div className='px-6'>
          {activeTab === 'calendar' ? (
            <CalendarStreak />
          ) : loading ? (
            <div className='backdrop-blur-xl bg-white/70 rounded-card p-8 border border-black/5 shadow-sm'>
              <div className='text-center py-8'>
                <LoadingSpinner size='md' />
                <p className='text-text-secondary mt-4'>Loading your history...</p>
              </div>
            </div>
          ) : entries.length === 0 ? (
            <div className='relative backdrop-blur-xl rounded-card p-12 border border-white/40 shadow-lg overflow-hidden'
                 style={{
                   background: 'linear-gradient(135deg, rgba(255, 201, 60, 0.1) 0%, rgba(244, 165, 54, 0.05) 100%), rgba(255, 255, 255, 0.75)'
                 }}>
              <div className='absolute inset-0 flex items-center justify-center opacity-5'>
                <svg className='w-64 h-64 text-solar-flare' xmlns='http://www.w3.org/2000/svg' fill='currentColor' viewBox='0 0 24 24'>
                  <path d='M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z' />
                </svg>
              </div>
              <div className='text-center relative z-10'>
                <div className='inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-solar-flare to-solar-warm shadow-lg mb-6'>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    fill='none'
                    viewBox='0 0 24 24'
                    strokeWidth={2}
                    stroke='currentColor'
                    className='w-10 h-10 text-white'>
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      d='M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z'
                    />
                  </svg>
                </div>
                <h2 className='text-2xl font-bold text-text-primary mb-3'>Nothing logged yet</h2>
                <p className='text-text-secondary max-w-sm mx-auto leading-relaxed'>
                  Log a sun session or supplement and it&apos;ll show up here.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Summary Stats Banner */}
              <div className='summary-stats-banner mb-6 relative backdrop-blur-xl rounded-card p-8 border border-white/40 shadow-lg overflow-hidden'
                   style={{
                     background: 'radial-gradient(ellipse at top, rgba(255, 201, 60, 0.15) 0%, rgba(244, 165, 54, 0.08) 40%, rgba(255, 255, 255, 0.85) 100%)'
                   }}>
                {/* Decorative solar rays */}
                <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-[0.03] pointer-events-none'>
                  <div className='absolute inset-0' style={{
                    background: `repeating-conic-gradient(from 0deg at 50% 50%,
                      transparent 0deg,
                      rgba(255, 201, 60, 1) 2deg,
                      transparent 4deg,
                      transparent 8deg)`
                  }} />
                </div>
                <div className='absolute -top-12 -right-12 w-64 h-64 bg-solar-flare/10 rounded-full blur-3xl' />
                <div className='absolute -bottom-8 -left-8 w-48 h-48 bg-amber-400/8 rounded-full blur-2xl' />

                {/* Header */}
                <div className='relative mb-6'>
                  <h3 className='text-text-secondary text-[11px] font-extrabold uppercase tracking-[0.12em] opacity-60'>
                    {dateRange === '7days' ? 'Past 7 Days' : dateRange === '30days' ? 'Past 30 Days' : 'All Time'}
                  </h3>
                </div>

                {/* Hero IU Number */}
                <div className='relative mb-8 text-center'>
                  <div className='inline-flex flex-col items-center gap-2'>
                    <div className='flex items-baseline justify-center gap-2 max-w-full px-2'>
                      <span className='text-[clamp(2.5rem,14vw,4.5rem)] leading-none font-extrabold tracking-tight whitespace-nowrap bg-gradient-to-br from-solar-flare via-solar-warm to-amber-500 bg-clip-text text-transparent drop-shadow-sm'
                            style={{
                              fontFeatureSettings: '"tnum"',
                              letterSpacing: '-0.02em'
                            }}>
                        {summaryStats.totalIU.toLocaleString()}
                      </span>
                      <span className='text-2xl font-semibold text-solar-warm/70 mb-2'>IU</span>
                    </div>
                    <p className='text-text-secondary text-sm font-medium tracking-wide'>Total Vitamin D</p>
                    <StreakSummaryRow
                      currentStreak={streakSummary?.currentStreak ?? 0}
                      onPress={() => setIsStreakSheetOpen(true)}
                    />
                  </div>
                </div>

                {/* Stat Pills Row */}
                <div className='relative flex flex-wrap justify-center gap-3'>
                  {/* Sun Sessions Pill */}
                  <div className='group relative backdrop-blur-md bg-white/60 border border-white/60 rounded-full px-4 py-2.5 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-300'>
                    <div className='flex items-center gap-2.5'>
                      <div className='w-2.5 h-2.5 rounded-full bg-gradient-to-br from-solar-flare to-solar-warm shadow-sm group-hover:scale-110 transition-transform' />
                      <span className='text-sm whitespace-nowrap'>
                        <span className='font-bold text-text-primary'>{summaryStats.sessionCount}</span>
                        <span className='text-text-secondary font-medium ml-1.5'>Sun Sessions</span>
                      </span>
                    </div>
                  </div>

                  {/* Supplements Pill */}
                  <div className='group relative backdrop-blur-md bg-white/60 border border-white/60 rounded-full px-4 py-2.5 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-300'>
                    <div className='flex items-center gap-2.5'>
                      <div className='w-2.5 h-2.5 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 shadow-sm group-hover:scale-110 transition-transform' />
                      <span className='text-sm whitespace-nowrap'>
                        <span className='font-bold text-text-primary'>{summaryStats.supplementCount}</span>
                        <span className='text-text-secondary font-medium ml-1.5'>Supplements</span>
                      </span>
                    </div>
                  </div>

                  {/* Cofactors Pill */}
                  <div className='group relative backdrop-blur-md bg-white/60 border border-white/60 rounded-full px-4 py-2.5 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-300'>
                    <div className='flex items-center gap-2.5'>
                      <div className='w-2.5 h-2.5 rounded-full bg-gradient-to-br from-grove-green-light to-grove-green shadow-sm group-hover:scale-110 transition-transform' />
                      <span className='text-sm whitespace-nowrap'>
                        <span className='font-bold text-text-primary'>{summaryStats.cofactorCount}</span>
                        <span className='text-text-secondary font-medium ml-1.5'>Cofactors</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline with date groups */}
              <div className='relative'>
                {/* Timeline spine */}
                <div className='timeline-spine absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-bask-teal via-bask-teal/50 to-transparent'></div>

                {groupedEntries.map((group) => (
                  <div key={group.date} className='mb-8 last:mb-0'>
                    {/* Date header */}
                    <div className='flex items-center gap-4 mb-4'>
                      <div className='timeline-dot relative z-10 w-4 h-4 rounded-full bg-bask-teal shadow-lg flex-shrink-0'></div>
                      <div className='flex-1'>
                        <h3 className='text-lg font-bold text-text-primary'>{group.label}</h3>
                      </div>
                    </div>

                    {/* Entries for this date */}
                    <div className='ml-10 space-y-3'>
                      {group.entries.map((entry) => renderEntry(entry))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Delete Confirmation Alert */}
        <IonAlert
          isOpen={showDeleteConfirm}
          onDidDismiss={() => {
            setShowDeleteConfirm(false);
            setDeleteTarget(null);
          }}
          header='Delete Entry?'
          message={`This will permanently remove this ${deleteTarget?.type} entry.`}
          buttons={[
            {
              text: 'Cancel',
              role: 'cancel',
            },
            {
              text: 'Delete',
              role: 'destructive',
              handler: handleDeleteConfirm,
            },
          ]}
        />

        {/* Edit Entry Modal */}
        <EditEntryModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditTarget(null);
          }}
          entry={editTarget}
          onSave={handleEditSave}
        />

        {/* Add Session Modal */}
        <AddSessionModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSaved={() => {
            loadHistory();
            void refreshStreak('log');
          }}
        />

        <StreakDetailSheet
          isOpen={isStreakSheetOpen}
          onClose={() => setIsStreakSheetOpen(false)}
          summary={streakSummary}
          state={streakState}
        />
      </div>
    </AtmosphericBackground>
  );
}
