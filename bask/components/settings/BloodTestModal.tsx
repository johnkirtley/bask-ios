'use client';

import { useState, useEffect } from 'react';
import { IonModal } from '@ionic/react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface BloodTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentValue: number | null;
  currentUnit: 'ng/mL' | 'nmol/L';
  currentDate: string | null;
  onSave: (data: {
    bloodTestValue: number;
    bloodTestUnit: 'ng/mL' | 'nmol/L';
    bloodTestDate: string;
  }) => Promise<void>;
  onRemove?: () => Promise<void>;
}

export default function BloodTestModal({
  isOpen,
  onClose,
  currentValue,
  currentUnit,
  currentDate,
  onSave,
  onRemove,
}: BloodTestModalProps) {
  const [value, setValue] = useState<string>(currentValue?.toString() || '');
  const [unit, setUnit] = useState<'ng/mL' | 'nmol/L'>(currentUnit || 'ng/mL');
  const [date, setDate] = useState<string>(
    currentDate || new Date().toISOString().split('T')[0],
  );
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setValue(currentValue?.toString() || '');
      setUnit(currentUnit || 'ng/mL');
      setDate(currentDate || new Date().toISOString().split('T')[0]);
    }
  }, [isOpen, currentValue, currentUnit, currentDate]);

  const handleSave = async () => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
      return;
    }

    setSaving(true);
    try {
      await onSave({
        bloodTestValue: numValue,
        bloodTestUnit: unit,
        bloodTestDate: date,
      });

      try {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } catch {}

      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!onRemove) return;

    setRemoving(true);
    try {
      await onRemove();

      try {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } catch {}

      onClose();
    } finally {
      setRemoving(false);
    }
  };

  const canSave = value && parseFloat(value) > 0;
  const canRemove = onRemove && currentValue !== null;

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={onClose}
      initialBreakpoint={0.85}
      breakpoints={[0, 0.85, 1]}>
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
            <h2 className="text-xl font-semibold text-text-primary">Vitamin D Blood Test</h2>
            <p className="text-text-secondary text-sm">Enter your 25(OH)D level</p>
          </div>
        </div>

        {/* Scrollable form area */}
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-4">
            <div>
              <label htmlFor="value" className="block text-text-primary text-sm font-medium mb-2">
                25(OH)D Level
              </label>
              <input
                id="value"
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Enter value"
                className="w-full bg-white border border-black/10 rounded-xl p-3 text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-solar-flare"
              />
            </div>

            <div>
              <label className="block text-text-primary text-sm font-medium mb-2">
                Unit
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setUnit('ng/mL')}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                    unit === 'ng/mL'
                      ? 'bg-solar-flare text-white'
                      : 'bg-black/5 text-text-secondary'
                  }`}>
                  ng/mL
                </button>
                <button
                  onClick={() => setUnit('nmol/L')}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                    unit === 'nmol/L'
                      ? 'bg-solar-flare text-white'
                      : 'bg-black/5 text-text-secondary'
                  }`}>
                  nmol/L
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="date" className="block text-text-primary text-sm font-medium mb-2">
                Test Date
              </label>
              <input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-white border border-black/10 rounded-xl p-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-solar-flare"
              />
            </div>

            <p className="text-xs text-text-secondary">
              💡 Many labs use 40–60 ng/mL (100–150 nmol/L) as a reference range
            </p>

            {canRemove && (
              <button
                onClick={handleRemove}
                disabled={removing || saving}
                className="w-full py-3 px-4 rounded-xl bg-transparent text-red-500 font-medium hover:bg-red-500/10 transition-colors disabled:opacity-50">
                {removing ? 'Removing...' : 'Remove blood test'}
              </button>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl bg-black/5 text-text-secondary font-medium hover:bg-black/10 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="flex-1 py-3 px-4 rounded-xl bg-solar-flare text-white font-medium hover:bg-solar-warm transition-colors disabled:opacity-50">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </IonModal>
  );
}
