'use client';

import { useCallback, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { labResultsRepository, type LabResult } from '../../lib/database';
import { useSubscription } from '../../hooks/useSubscription';
import {
  getLabInterpretation,
  formatLabValue,
  fromNgMl,
  type LabUnit,
} from '../../lib/labUtils';
import { isForcedFree } from '../../lib/devFlags';
import LoadingSpinner from '../ui/LoadingSpinner';
import ProBadge from '../ui/ProBadge';
import LabResultModal from './LabResultModal';
import LabTrendChart from './LabTrendChart';
import LabHistoryList from './LabHistoryList';

interface LabResultsCardProps {
  className?: string;
}

export default function LabResultsCard({ className = '' }: LabResultsCardProps) {
  const { isPremium, presentPaywall } = useSubscription();
  const [results, setResults] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [unit, setUnit] = useState<LabUnit>('ng/mL');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LabResult | null>(null);

  // Web-only dev override to preview the non-PRO experience (see lib/devFlags).
  // Read after mount so we never touch `window` during SSR.
  const [forcedFree, setForcedFree] = useState(false);
  useEffect(() => {
    setForcedFree(isForcedFree());
  }, []);

  // On web (dev preview) there is no paywall, so unlock everything to make the
  // full feature verifiable — unless the dev free override is on. On device,
  // real PRO gating applies.
  const unlocked = forcedFree ? false : isPremium || !Capacitor.isNativePlatform();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const all = await labResultsRepository.getAll();
      setResults(all);
      // Default the display unit to whatever the most recent result was entered in.
      if (all.length > 0) setUnit(all[0].entered_unit);
    } catch (err) {
      console.error('Failed to load lab results:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = async () => {
    // The first reading is free for everyone (matches the app's existing free
    // single blood value). Logging additional readings is the PRO upsell.
    if (!unlocked && results.length > 0) {
      await presentPaywall();
      return;
    }
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (result: LabResult) => {
    setEditing(result);
    setModalOpen(true);
  };

  const handleSave = async (data: {
    value: number;
    unit: LabUnit;
    testDate: string;
    source: string | null;
    notes: string | null;
  }) => {
    if (editing) {
      await labResultsRepository.update(editing.id, data);
    } else {
      await labResultsRepository.create(data);
    }
    await load();
  };

  const handleDelete = async (id: number) => {
    await labResultsRepository.delete(id);
    await load();
  };

  // Results come back most-recent-first; chart wants oldest-first.
  const chartResults = [...results].slice().reverse();
  const latest = results[0];
  const interpretation = latest ? getLabInterpretation(latest.value_ng_ml) : null;

  const unitToggle = (
    <div className="inline-flex rounded-lg bg-black/5 p-0.5">
      {(['ng/mL', 'nmol/L'] as LabUnit[]).map((u) => (
        <button
          key={u}
          onClick={() => setUnit(u)}
          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
            unit === u ? 'bg-white text-text-primary shadow-sm' : 'text-text-secondary'
          }`}>
          {u}
        </button>
      ))}
    </div>
  );

  return (
    <div
      className={`backdrop-blur-xl bg-white/70 rounded-2xl p-6 border border-black/5 shadow-sm ${className}`}>
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-bold text-text-primary tracking-tight whitespace-nowrap">
            Lab Results
          </h2>
          {results.length > 0 && <div className="flex-shrink-0">{unitToggle}</div>}
        </div>
        <p className="text-text-secondary text-sm mt-0.5">Your 25(OH)D blood levels over time</p>
      </div>

      {loading ? (
        <div className="py-10 text-center">
          <LoadingSpinner size="sm" />
        </div>
      ) : results.length === 0 ? (
        /* Empty state / activation */
        <div className="flex flex-col items-center text-center py-8">
          <div className="w-16 h-16 rounded-full bg-solar-flare/15 flex items-center justify-center mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.8}
              stroke="currentColor"
              className="w-8 h-8 text-solar-flare">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5"
              />
            </svg>
          </div>
          <p className="text-text-primary font-bold">Log your first blood test</p>
          <p className="text-text-secondary text-sm mt-1 max-w-[260px]">
            Add a 25(OH)D result and your levels start forming a trend you can follow over time.
          </p>
          <button
            onClick={openAdd}
            className="mt-5 inline-flex items-center gap-2 py-2.5 px-5 rounded-xl bg-solar-flare text-white font-semibold hover:bg-solar-warm transition-colors">
            Add your first result
          </button>
        </div>
      ) : (
        <>
          {/* Latest reading hero — tap to edit (free for everyone) */}
          {latest && interpretation && (
            <button
              onClick={() => openEdit(latest)}
              className="w-full text-left rounded-card border border-black/5 p-4 mb-5 active:scale-[0.99] transition-transform"
              style={{ background: `${interpretation.band.color}0D` }}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-text-secondary">
                    Latest reading
                  </p>
                  <p className="text-3xl font-extrabold text-text-primary mt-1 tabular-nums">
                    {fromNgMl(latest.value_ng_ml, unit)}
                    <span className="text-sm font-semibold text-text-secondary ml-1.5">{unit}</span>
                  </p>
                </div>
                <span
                  className="text-xs font-bold px-3 py-1.5 rounded-full"
                  style={{ background: `${interpretation.band.color}1F`, color: interpretation.band.color }}>
                  {interpretation.band.label}
                </span>
              </div>
              <p className="text-text-primary text-sm font-semibold mt-3">{interpretation.headline}</p>
              <p className="text-text-secondary text-sm mt-0.5 leading-relaxed">{interpretation.detail}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-text-secondary">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                </svg>
                Tap to edit
              </span>
            </button>
          )}

          {unlocked ? (
            <>
              {/* Trend chart */}
              {chartResults.length > 1 ? (
                <LabTrendChart results={chartResults} unit={unit} />
              ) : (
                <p className="text-center text-text-secondary text-sm py-4">
                  Add one more result to see your trend take shape.
                </p>
              )}

              {/* History */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-text-primary uppercase tracking-wide">History</h3>
                  <button
                    onClick={openAdd}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-solar-flare active:scale-95 transition-transform">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2.2}
                      stroke="currentColor"
                      className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Add
                  </button>
                </div>
                <LabHistoryList
                  results={results}
                  unit={unit}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                />
              </div>
            </>
          ) : (
            /* Free: one combined PRO upsell covering the trend chart + full history */
            <LockedPanel
              label={
                results.length > 1
                  ? `You've logged ${results.length} readings. Unlock PRO to see your full trend and history.`
                  : 'Unlock your trend chart and history to track changes over time.'
              }
              onUnlock={presentPaywall}
            />
          )}
        </>
      )}

      {/* Disclaimer */}
      <p className="text-[11px] text-text-secondary text-center leading-relaxed mt-6">
        Ranges shown are common lab reference points, not medical advice. Talk to your clinician about
        what your results mean for you.
      </p>

      <LabResultModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </div>
  );
}

function LockedPanel({ label, onUnlock }: { label: string; onUnlock: () => void }) {
  return (
    <button
      onClick={onUnlock}
      className="w-full flex flex-col items-center justify-center gap-3 py-8 rounded-card border border-dashed border-black/10 bg-black/[0.02] active:scale-[0.99] transition-transform">
      <ProBadge interactive={false} />
      <span className="text-sm font-medium text-text-secondary px-6 text-center">{label}</span>
    </button>
  );
}
