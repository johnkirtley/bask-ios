'use client';

import { useState, useEffect } from 'react';
import { IonModal } from '@ionic/react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { validateLabEntry, type LabUnit } from '../../lib/labUtils';
import type { LabResult } from '../../lib/database';

interface LabResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** When set, the modal edits this result instead of adding a new one. */
  editing?: LabResult | null;
  onSave: (data: {
    value: number;
    unit: LabUnit;
    testDate: string;
    source: string | null;
    notes: string | null;
  }) => Promise<void>;
  onDelete?: (id: number) => Promise<void>;
}

const today = () => new Date().toISOString().split('T')[0];

export default function LabResultModal({
  isOpen,
  onClose,
  editing,
  onSave,
  onDelete,
}: LabResultModalProps) {
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState<LabUnit>('ng/mL');
  const [date, setDate] = useState(today());
  const [source, setSource] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (editing) {
      setValue(String(editing.entered_value));
      setUnit(editing.entered_unit);
      setDate(editing.test_date);
      setSource(editing.source ?? '');
      setNotes(editing.notes ?? '');
    } else {
      setValue('');
      setUnit('ng/mL');
      setDate(today());
      setSource('');
      setNotes('');
    }
    setError(null);
  }, [isOpen, editing]);

  const handleSave = async () => {
    const result = validateLabEntry({ value, unit, testDate: date });
    if (!result.ok || result.value == null) {
      setError(result.error ?? 'Something looks off — check your entry.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await onSave({
        value: result.value,
        unit,
        testDate: date,
        source: source.trim() || null,
        notes: notes.trim() || null,
      });
      try {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } catch {}
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editing || !onDelete) return;
    setDeleting(true);
    try {
      await onDelete(editing.id);
      try {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } catch {}
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  const unitButton = (u: LabUnit) => (
    <button
      key={u}
      onClick={() => setUnit(u)}
      className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
        unit === u
          ? 'bg-solar-flare text-white shadow-sm'
          : 'bg-black/5 text-text-secondary'
      }`}>
      {u}
    </button>
  );

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={onClose}
      initialBreakpoint={0.92}
      breakpoints={[0, 0.92, 1]}>
      <div className="bg-light-bg h-full p-6 pb-safe flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
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
                d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232 1.232 3.23 0 4.462l-1.06 1.06a3 3 0 01-4.243 0l-1.06-1.06a3 3 0 010-4.243l1.06-1.06z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-text-primary">
              {editing ? 'Edit lab result' : 'Add lab result'}
            </h2>
            <p className="text-text-secondary text-sm">Your 25(OH)D blood level</p>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-4">
            <div>
              <label htmlFor="lab-value" className="block text-text-primary text-sm font-medium mb-2">
                25(OH)D level
              </label>
              <input
                id="lab-value"
                type="number"
                inputMode="decimal"
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="e.g. 42"
                className="w-full bg-white border border-black/10 rounded-xl p-3 text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-solar-flare"
              />
            </div>

            <div>
              <label className="block text-text-primary text-sm font-medium mb-2">Unit</label>
              <div className="flex gap-2">{(['ng/mL', 'nmol/L'] as LabUnit[]).map(unitButton)}</div>
            </div>

            <div>
              <label htmlFor="lab-date" className="block text-text-primary text-sm font-medium mb-2">
                Test date
              </label>
              <input
                id="lab-date"
                type="date"
                value={date}
                max={today()}
                onChange={(e) => {
                  setDate(e.target.value);
                  if (error) setError(null);
                }}
                className="w-full bg-white border border-black/10 rounded-xl p-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-solar-flare"
              />
            </div>

            <div>
              <label htmlFor="lab-source" className="block text-text-primary text-sm font-medium mb-2">
                Lab or source <span className="text-text-secondary font-normal">(optional)</span>
              </label>
              <input
                id="lab-source"
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="e.g. Quest, LabCorp, at-home kit"
                className="w-full bg-white border border-black/10 rounded-xl p-3 text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-solar-flare"
              />
            </div>

            <div>
              <label htmlFor="lab-notes" className="block text-text-primary text-sm font-medium mb-2">
                Notes <span className="text-text-secondary font-normal">(optional)</span>
              </label>
              <textarea
                id="lab-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Anything worth remembering about this test"
                className="w-full bg-white border border-black/10 rounded-xl p-3 text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-solar-flare resize-none"
              />
            </div>

            {error && (
              <p className="text-sm text-[#E5604D] font-medium" role="alert">
                {error}
              </p>
            )}

            <p className="text-xs text-text-secondary">
              💡 Many labs use 40 to 60 ng/mL (100 to 150 nmol/L) as a reference range.
            </p>

            {editing && onDelete && (
              <button
                onClick={handleDelete}
                disabled={deleting || saving}
                className="w-full py-3 px-4 rounded-xl bg-transparent text-[#E5604D] font-medium hover:bg-[#E5604D]/10 transition-colors disabled:opacity-50">
                {deleting ? 'Removing…' : 'Delete this result'}
              </button>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl bg-black/5 text-text-secondary font-medium hover:bg-black/10 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 px-4 rounded-xl bg-solar-flare text-white font-medium hover:bg-solar-warm transition-colors disabled:opacity-50">
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Save result'}
          </button>
        </div>
      </div>
    </IonModal>
  );
}
