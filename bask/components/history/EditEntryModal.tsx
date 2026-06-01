'use client';

import { useState, useEffect } from 'react';
import { IonModal } from '@ionic/react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { BaskSession } from '../../lib/database/repositories/sessionsRepository';
import { Supplement } from '../../lib/database/repositories/supplementsRepository';
import { Cofactor } from '../../lib/database/repositories/cofactorsRepository';

type HistoryEntry = {
  type: 'session' | 'supplement' | 'cofactor';
  timestamp: string;
  data: BaskSession | Supplement | Cofactor;
};

interface EditEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: HistoryEntry | null;
  onSave: (entry: HistoryEntry, updates: { notes?: string; dosage_iu?: number }) => Promise<void>;
}

export default function EditEntryModal({ isOpen, onClose, entry, onSave }: EditEntryModalProps) {
  const [notes, setNotes] = useState('');
  const [dosageIu, setDosageIu] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (entry) {
      setNotes(entry.data.notes || '');
      if (entry.type === 'supplement') {
        setDosageIu((entry.data as Supplement).dosage_iu.toString());
      }
    }
  }, [entry]);

  const handleSave = async () => {
    if (!entry) return;

    setSaving(true);
    try {
      const updates: { notes?: string; dosage_iu?: number } = {
        notes: notes || undefined,
      };

      if (entry.type === 'supplement') {
        const dosage = parseInt(dosageIu);
        if (!isNaN(dosage) && dosage > 0) {
          updates.dosage_iu = dosage;
        }
      }

      await onSave(entry, updates);

      try {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } catch {}
    } finally {
      setSaving(false);
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

  const renderIcon = () => {
    if (!entry) return null;

    if (entry.type === 'session') {
      return (
        <div className="w-12 h-12 rounded-full bg-solar-flare/15 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-6 h-6 text-solar-flare">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
            />
          </svg>
        </div>
      );
    } else if (entry.type === 'supplement') {
      return (
        <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-6 h-6 text-amber-400">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232 1.232 3.23 0 4.462l-1.06 1.06a3 3 0 01-4.243 0l-1.06-1.06a3 3 0 010-4.243l1.06-1.06z"
            />
          </svg>
        </div>
      );
    } else {
      const cofactor = entry.data as Cofactor;
      const isMagnesium = cofactor.cofactor_type === 'magnesium';
      return (
        <div className={`w-12 h-12 rounded-full ${isMagnesium ? 'bg-emerald-500/20' : 'bg-purple-500/20'} flex items-center justify-center`}>
          <span className={`text-sm font-bold ${isMagnesium ? 'text-emerald-500' : 'text-purple-500'}`}>
            {isMagnesium ? 'Mg' : 'K₂'}
          </span>
        </div>
      );
    }
  };

  const getTitle = () => {
    if (!entry) return '';
    if (entry.type === 'session') return 'Sun Exposure';
    if (entry.type === 'supplement') return 'Vitamin D Supplement';
    const cofactor = entry.data as Cofactor;
    return cofactor.cofactor_type === 'magnesium' ? 'Magnesium' : 'Vitamin K2';
  };

  const isHealthKitSession = entry?.type === 'session' && (entry.data as BaskSession).source === 'healthkit';

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={onClose}
      initialBreakpoint={0.5}
      breakpoints={[0, 0.5, 0.75]}>
      <div className="bg-light-bg min-h-full p-6 pb-safe">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          {renderIcon()}
          <div>
            <h2 className="text-xl font-semibold text-text-primary">{getTitle()}</h2>
            {entry && <p className="text-text-secondary text-sm">{formatDate(entry.timestamp)}</p>}
          </div>
        </div>

        {/* Apple Health Notice */}
        {isHealthKitSession && (
          <div className="mb-6 backdrop-blur-xl bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <img
              src='/assets/Icon - Apple Health.png'
              alt='Apple Health'
              className='w-6 h-6 flex-shrink-0 mt-0.5'
            />
            <div className="flex-1">
              <p className="text-sm text-blue-900 font-medium mb-1">Synced from Apple Health</p>
              <p className="text-xs text-blue-700">
                This data is automatically synced from the Health app. To update or remove this entry, make changes in Apple Health.
              </p>
            </div>
          </div>
        )}

        {/* Read-only metrics for sessions */}
        {entry?.type === 'session' && (
          <div className="mb-6 backdrop-blur-xl bg-white/70 rounded-xl p-4 border border-black/5 shadow-sm">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-text-secondary text-sm">IU Gained</span>
                <span className="text-solar-flare font-semibold">
                  {(entry.data as BaskSession).iu_gained.toLocaleString()} IU
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary text-sm">Duration</span>
                <span className="text-text-primary">{formatDuration((entry.data as BaskSession).duration_seconds)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary text-sm">UV Index</span>
                <span className="text-text-primary">{Math.round((entry.data as BaskSession).uv_index)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary text-sm">Exposure</span>
                <span className="text-text-primary">{(entry.data as BaskSession).exposure_percent}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Dosage field for supplements */}
        {entry?.type === 'supplement' && (
          <div className="mb-4">
            <label htmlFor="dosage" className="block text-text-primary text-sm font-medium mb-2">
              Dosage (IU)
            </label>
            <input
              id="dosage"
              type="number"
              value={dosageIu}
              onChange={(e) => setDosageIu(e.target.value)}
              className="w-full bg-white border border-black/10 text-text-primary rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-solar-flare"
              placeholder="Enter dosage in IU"
            />
          </div>
        )}

        {/* Notes field for all types (hidden for HealthKit sessions) */}
        {!isHealthKitSession && (
          <div className="mb-6">
            <label htmlFor="notes" className="block text-text-primary text-sm font-medium mb-2">
              Notes {entry?.type === 'session' && '(Optional)'}
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full bg-white border border-black/10 text-text-primary rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-solar-flare resize-none"
              placeholder="Add a note..."
            />
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          {isHealthKitSession ? (
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl bg-solar-flare text-white font-medium hover:bg-solar-warm transition-colors">
              Done
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-xl bg-black/5 text-text-secondary font-medium hover:bg-black/10 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3 px-4 rounded-xl bg-solar-flare text-white font-medium hover:bg-solar-warm transition-colors disabled:opacity-50">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </>
          )}
        </div>
      </div>
    </IonModal>
  );
}
