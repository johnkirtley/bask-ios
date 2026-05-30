'use client';

import { useState, useEffect, useMemo } from 'react';
import { IonModal } from '@ionic/react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import ClothingPresetSelector from '../home/ClothingPresetSelector';
import { getMockClothingPresets } from '../../lib/sunDataUtils';
import { calculateVitaminD, effectiveUv, getExposurePercent } from '../../lib/dEngine';
import type { FitzpatrickType } from '../../lib/dEngine';

interface UVDataPoint {
  hour: number;
  uvIndex: number;
}

export interface ManualSessionInput {
  started_at: string;
  uv_index: number;
  clothing_preset_id: string;
  exposure_percent: number;
  duration_seconds: number;
  iu_gained: number;
}

interface AddSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (session: ManualSessionInput) => void;
  /** Hourly UV curve for today, indexed by hour-of-day. */
  uvCurve: UVDataPoint[];
  /** Current cloud cover (0-1), used to approximate effective UV. */
  cloudCover?: number;
  fitzpatrickType: FitzpatrickType;
  age: number | null;
  /** Preset to pre-select (defaults to the app's default outfit). */
  defaultPresetId?: string;
}

const DEFAULT_DURATION_MINUTES = 20;

function toTimeValue(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/**
 * Weighted-average raw UV over the [start, start+duration] window, sampled from the
 * hourly UV curve. We only have today's curve, hence sessions are restricted to today.
 */
function averageRawUv(uvCurve: UVDataPoint[], start: Date, durationMinutes: number): number {
  if (uvCurve.length === 0 || durationMinutes <= 0) return 0;

  const uvByHour = new Map<number, number>();
  for (const point of uvCurve) uvByHour.set(point.hour, point.uvIndex);

  const startMin = start.getHours() * 60 + start.getMinutes();
  const endMin = startMin + durationMinutes;

  let weightedSum = 0;
  let totalWeight = 0;
  for (let hour = Math.floor(startMin / 60); hour < Math.ceil(endMin / 60); hour++) {
    const hourStart = hour * 60;
    const hourEnd = hourStart + 60;
    const overlap = Math.max(0, Math.min(endMin, hourEnd) - Math.max(startMin, hourStart));
    if (overlap <= 0) continue;
    const uv = uvByHour.get(hour % 24) ?? 0;
    weightedSum += uv * overlap;
    totalWeight += overlap;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

/**
 * Modal for manually adding a past basking session from earlier today.
 * The date is locked to today because the app only has UV data for the current day.
 */
export default function AddSessionModal({
  isOpen,
  onClose,
  onSave,
  uvCurve,
  cloudCover,
  fitzpatrickType,
  age,
  defaultPresetId = 't-shirt-shorts',
}: AddSessionModalProps) {
  const [startTime, setStartTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(DEFAULT_DURATION_MINUTES);
  const [presetId, setPresetId] = useState(defaultPresetId);
  const [isPresetSelectorOpen, setIsPresetSelectorOpen] = useState(false);

  // Initialise the form each time the modal opens: a window ending "now".
  useEffect(() => {
    if (!isOpen) return;
    const now = new Date();
    const defaultStart = new Date(now.getTime() - DEFAULT_DURATION_MINUTES * 60_000);
    setStartTime(toTimeValue(defaultStart));
    setDurationMinutes(DEFAULT_DURATION_MINUTES);
    setPresetId(defaultPresetId);
    setIsPresetSelectorOpen(false);
  }, [isOpen, defaultPresetId]);

  const selectedPreset = useMemo(
    () =>
      getMockClothingPresets().find((p) => p.id === presetId) ?? getMockClothingPresets()[0],
    [presetId],
  );

  const exposurePercent = getExposurePercent(selectedPreset.coveragePercent);

  // Build the start Date from today + chosen time.
  const startDate = useMemo(() => {
    if (!startTime) return null;
    const [h, m] = startTime.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  }, [startTime]);

  const endsInFuture = useMemo(() => {
    if (!startDate) return false;
    return startDate.getTime() + durationMinutes * 60_000 > Date.now();
  }, [startDate, durationMinutes]);

  const isValid = startDate !== null && durationMinutes >= 1 && !endsInFuture;

  const rawUv = useMemo(
    () => (startDate ? averageRawUv(uvCurve, startDate, durationMinutes) : 0),
    [uvCurve, startDate, durationMinutes],
  );

  const computedIU = useMemo(() => {
    if (!startDate) return 0;
    const effUv = effectiveUv(rawUv, cloudCover);
    return calculateVitaminD(effUv, durationMinutes, exposurePercent, fitzpatrickType, age);
  }, [startDate, rawUv, cloudCover, durationMinutes, exposurePercent, fitzpatrickType, age]);

  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const handleSave = () => {
    if (!isValid || !startDate) return;
    onSave({
      started_at: startDate.toISOString(),
      uv_index: rawUv,
      clothing_preset_id: selectedPreset.id,
      exposure_percent: exposurePercent,
      duration_seconds: durationMinutes * 60,
      iu_gained: computedIU,
    });
    Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
    onClose();
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose} breakpoints={[0, 1]} initialBreakpoint={1}>
      <div className='bg-warm-50 min-h-[50vh] max-h-[90vh] overflow-y-auto'>
        {/* Header */}
        <div className='sticky top-0 bg-warm-50/95 backdrop-blur-md px-6 py-4 border-b border-warm-200 z-10'>
          <div className='flex items-center justify-between'>
            <h2 className='text-xl font-black text-text-primary'>Add Session</h2>
            <button
              onClick={onClose}
              className='w-8 h-8 rounded-full bg-warm-200 flex items-center justify-center text-text-secondary'>
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className='px-6 py-4 space-y-4'>
          {/* Date — locked to today */}
          <div className='bg-white rounded-xl p-4'>
            <div className='text-xs font-bold text-text-secondary uppercase tracking-wide'>Date</div>
            <div className='text-lg font-black text-text-primary mt-1'>{todayLabel}</div>
            <p className='text-xs text-text-secondary mt-1'>
              You can only add sessions from today — we can only calculate UV for today.
            </p>
          </div>

          {/* Start time + duration */}
          <div className='grid grid-cols-2 gap-3'>
            <div className='bg-white rounded-xl p-4'>
              <label className='text-xs font-bold text-text-secondary uppercase tracking-wide'>
                Start Time
              </label>
              <input
                type='time'
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className='w-full mt-2 bg-transparent text-2xl font-black text-text-primary focus:outline-none'
              />
            </div>
            <div className='bg-white rounded-xl p-4'>
              <label className='text-xs font-bold text-text-secondary uppercase tracking-wide'>
                Duration (min)
              </label>
              <input
                type='number'
                inputMode='numeric'
                min={1}
                max={600}
                value={durationMinutes}
                onChange={(e) =>
                  setDurationMinutes(Math.max(1, Math.min(600, Number(e.target.value) || 0)))
                }
                className='w-full mt-2 bg-transparent text-2xl font-black text-text-primary focus:outline-none'
              />
            </div>
          </div>

          {/* Clothing preset — editable inline */}
          <div className='bg-white rounded-xl p-4'>
            <div className='text-xs font-bold text-text-secondary uppercase tracking-wide'>
              What you were wearing
            </div>
            <button
              onClick={() => setIsPresetSelectorOpen(true)}
              className='w-full mt-2 flex items-center justify-between text-left active:opacity-70 transition-opacity'>
              <span className='text-lg font-black text-text-primary'>
                {selectedPreset.name}
              </span>
              <span className='text-sm font-semibold text-text-secondary'>
                {100 - selectedPreset.coveragePercent}% exposed ›
              </span>
            </button>
          </div>

          {/* Computed IU preview */}
          <div className='bg-gradient-to-br from-coral-accent/10 to-coral-accent/5 rounded-xl p-4 border border-coral-accent/20'>
            <div className='text-xs font-bold text-text-secondary uppercase tracking-wide'>
              Estimated Vitamin D
            </div>
            <div className='text-3xl font-black text-text-primary mt-1'>
              {computedIU} IU
            </div>
            <p className='text-xs text-text-secondary mt-1'>
              Based on UV {rawUv.toFixed(1)} for this time window.
              {computedIU === 0 && rawUv < 3
                ? ' UV was too low for vitamin D synthesis (needs UV 3+).'
                : ''}
            </p>
          </div>

          {endsInFuture && (
            <p className='text-sm font-semibold text-ember-alert text-center'>
              That window ends in the future. Pick an earlier start time.
            </p>
          )}

          {/* Save */}
          <div className='pt-2'>
            <button
              onClick={handleSave}
              disabled={!isValid}
              className='w-full py-4 bg-coral-accent rounded-full text-lg font-black text-white active:scale-[0.98] transition-transform disabled:opacity-40 disabled:active:scale-100'>
              Add Session
            </button>
          </div>
        </div>
      </div>

      <ClothingPresetSelector
        isOpen={isPresetSelectorOpen}
        onClose={() => setIsPresetSelectorOpen(false)}
        onSelect={(id) => {
          setPresetId(id);
          setIsPresetSelectorOpen(false);
        }}
      />
    </IonModal>
  );
}
