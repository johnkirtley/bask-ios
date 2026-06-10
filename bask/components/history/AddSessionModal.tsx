'use client';

import { useEffect, useMemo, useState } from 'react';
import { IonModal } from '@ionic/react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { sessionsRepository } from '../../lib/database/repositories/sessionsRepository';
import {
  userProfileRepository,
  UserProfile,
} from '../../lib/database/repositories/userProfileRepository';
import { useSunData } from '../../hooks/useSunData';
import { useOnboardingContext } from '../../contexts/OnboardingContext';
import { resolveFitzpatrickType, resolveAge } from '../../lib/profileUtils';
import { getMockClothingPresets } from '../../lib/sunDataUtils';
import { calculateVitaminD, effectiveUv, getExposurePercent } from '../../lib/dEngine';
import ClothingPresetSelector from '../home/ClothingPresetSelector';

interface AddSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const pad = (n: number) => n.toString().padStart(2, '0');

/**
 * Manual "Add Session" entry. Lets a user log a sun session for a window earlier
 * today so a lost/cut-short session can be recovered. Date is locked to today
 * because only today's UV curve is available (no historical UV API).
 */
export default function AddSessionModal({ isOpen, onClose, onSaved }: AddSessionModalProps) {
  const { uvCurve, cloudCover, uvIndex: liveUvIndex, isLive } = useSunData();
  const { answers } = useOnboardingContext();

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [startTime, setStartTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('20');
  const [selectedPresetId, setSelectedPresetId] = useState('t-shirt-shorts');
  const [isPresetSelectorOpen, setIsPresetSelectorOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const presets = getMockClothingPresets();
  const selectedPreset = presets.find((p) => p.id === selectedPresetId) ?? presets[2];

  const fitzpatrickType = useMemo(
    () => resolveFitzpatrickType(userProfile, answers),
    [userProfile, answers]
  );
  const age = resolveAge(userProfile, answers);

  // Load profile + reset the form to a sensible default window when opening
  useEffect(() => {
    if (!isOpen) return;
    userProfileRepository
      .get()
      .then(setUserProfile)
      .catch(() => {});
    // Default to a 20-minute window ending ~10 min ago, so it's a valid past window
    const start = new Date(Date.now() - 30 * 60 * 1000);
    setStartTime(`${pad(start.getHours())}:${pad(start.getMinutes())}`);
    setDurationMinutes('20');
    setSelectedPresetId('t-shirt-shorts');
  }, [isOpen]);

  const duration = Math.max(0, Math.floor(Number(durationMinutes) || 0));
  const exposurePercent = getExposurePercent(selectedPreset.coveragePercent);

  // Minutes from midnight for the chosen start, and for "now"
  const startMinutes = useMemo(() => {
    if (!startTime.includes(':')) return null;
    const [h, m] = startTime.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
  }, [startTime]);

  // Minutes-weighted average UV across the hours the window spans. For the current
  // hour we prefer the live instantaneous reading (the same value the Home screen
  // shows) so an overlapping window stays consistent with Home; earlier hours use
  // the hourly forecast curve. Returns both the raw average and its cloud-adjusted
  // (effective) value so callers can distinguish cloud-blocking from low sun angle.
  const { effectiveWindowUv, avgRawWindowUv } = useMemo(() => {
    if (startMinutes === null || duration <= 0) {
      return { effectiveWindowUv: 0, avgRawWindowUv: 0 };
    }
    const endMinutes = startMinutes + duration;
    const currentHour = new Date().getHours();
    let weighted = 0;
    let totalOverlap = 0;
    for (let h = Math.floor(startMinutes / 60); h <= Math.floor((endMinutes - 1) / 60); h++) {
      const overlap = Math.min(endMinutes, h * 60 + 60) - Math.max(startMinutes, h * 60);
      if (overlap <= 0) continue;
      const hour = ((h % 24) + 24) % 24;
      const rawUv =
        isLive && hour === currentHour
          ? liveUvIndex
          : uvCurve.find((p) => p.hour === hour)?.uvIndex ?? 0;
      weighted += rawUv * overlap;
      totalOverlap += overlap;
    }
    const avgRawUv = totalOverlap > 0 ? weighted / totalOverlap : 0;
    return { effectiveWindowUv: effectiveUv(avgRawUv, cloudCover), avgRawWindowUv: avgRawUv };
  }, [startMinutes, duration, uvCurve, cloudCover, liveUvIndex, isLive]);

  const computedIU = useMemo(
    () => calculateVitaminD(effectiveWindowUv, duration, exposurePercent, fitzpatrickType, age),
    [effectiveWindowUv, duration, exposurePercent, fitzpatrickType, age]
  );

  // Mirror the Home screen's cloud-blocking predicate (ActiveSessionView): the sun
  // is high enough (raw UV >= 3) but clouds knocked effective UV below the synthesis
  // threshold. Lets us explain a 0-IU window the same way Home does.
  const isWindowCloudBlocked = useMemo(
    () => avgRawWindowUv >= 3 && effectiveWindowUv < 3,
    [avgRawWindowUv, effectiveWindowUv]
  );

  // Validation
  const noUvData = uvCurve.length === 0;
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const endInFuture = startMinutes !== null && startMinutes + duration > nowMinutes;
  const invalid = noUvData || duration <= 0 || startMinutes === null || endInFuture;

  const handleAdd = async () => {
    if (invalid || startMinutes === null) return;
    setSaving(true);
    try {
      const started = new Date();
      started.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);

      await sessionsRepository.create({
        started_at: started.toISOString(),
        uv_index: Math.round(effectiveWindowUv * 10) / 10,
        clothing_preset_id: selectedPresetId,
        exposure_percent: exposurePercent,
        duration_seconds: duration * 60,
        iu_gained: computedIU,
        source: 'manual',
      });

      try {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } catch {}

      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  // Clamp the chosen start to "now" — the native iOS time picker ignores the HTML
  // `max` attribute, so we enforce it here. Read the clock fresh at event time so
  // the clamp stays correct even if the modal has been open across a minute boundary.
  const handleStartTimeChange = (value: string) => {
    if (!value.includes(':')) {
      setStartTime(value);
      return;
    }
    const [h, m] = value.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) {
      setStartTime(value);
      return;
    }
    const current = new Date();
    const currentMins = current.getHours() * 60 + current.getMinutes();
    if (h * 60 + m > currentMins) {
      setStartTime(`${pad(current.getHours())}:${pad(current.getMinutes())}`);
      return;
    }
    setStartTime(value);
  };

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={onClose}
      initialBreakpoint={0.95}
      breakpoints={[0, 0.95, 1]}>
      <div className='bg-light-bg flex flex-col h-full'>
        {/* Scrollable body */}
        <div className='ion-content-scroll-host flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-6 pt-6'>
        {/* Header */}
        <div className='flex items-center gap-4 mb-4'>
          <div className='w-12 h-12 rounded-full bg-solar-flare/15 flex items-center justify-center'>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              fill='none'
              viewBox='0 0 24 24'
              strokeWidth={2}
              stroke='currentColor'
              className='w-6 h-6 text-solar-flare'>
              <path strokeLinecap='round' strokeLinejoin='round' d='M12 4.5v15m7.5-7.5h-15' />
            </svg>
          </div>
          <div>
            <h2 className='text-xl font-semibold text-text-primary'>Add Session</h2>
            <p className='text-text-secondary text-sm'>Log time you spent in the sun today</p>
          </div>
        </div>

        {/* Today-only notice */}
        <div className='mb-5 bg-amber-50 border border-amber-200 rounded-xl p-3'>
          <p className='text-xs text-amber-800'>
            We can only calculate vitamin D for <span className='font-semibold'>today</span>. Past
            days&apos; UV data isn&apos;t available.
          </p>
        </div>

        {endInFuture && startMinutes !== null && (
          <div className='mb-5 bg-red-500/10 border border-red-500/20 border-l-4 border-l-red-500 rounded-xl p-3'>
            <p className='text-xs text-red-700'>
              That window runs into the future. Pick an earlier start time or a shorter
              duration so the session ends by now.
            </p>
          </div>
        )}

        {noUvData && (
          <div className='mb-5 bg-black/5 border border-black/10 rounded-xl p-3'>
            <p className='text-sm text-text-secondary'>
              UV data is unavailable for today, so a session can&apos;t be calculated right now.
            </p>
          </div>
        )}

        {/* Start time */}
        <div className='mb-4'>
          <label htmlFor='start-time' className='block text-text-primary text-sm font-medium mb-2'>
            Start time (today)
          </label>
          <input
            id='start-time'
            type='time'
            value={startTime}
            max={`${pad(now.getHours())}:${pad(now.getMinutes())}`}
            onChange={(e) => handleStartTimeChange(e.target.value)}
            className='w-full bg-white border border-black/10 text-text-primary rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-solar-flare'
          />
        </div>

        {/* Duration */}
        <div className='mb-4'>
          <label htmlFor='duration' className='block text-text-primary text-sm font-medium mb-2'>
            Duration (minutes)
          </label>
          <input
            id='duration'
            type='number'
            inputMode='numeric'
            min={1}
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(e.target.value)}
            className='w-full bg-white border border-black/10 text-text-primary rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-solar-flare'
            placeholder='Minutes in the sun'
          />
        </div>

        {/* Clothing preset */}
        <div className='mb-4'>
          <label className='block text-text-primary text-sm font-medium mb-2'>Clothing</label>
          <button
            type='button'
            onClick={() => setIsPresetSelectorOpen(true)}
            className='w-full flex items-center justify-between bg-white border border-black/10 rounded-xl p-3 text-left active:scale-[0.99] transition-transform'>
            <span className='text-text-primary'>{selectedPreset.name}</span>
            <span className='text-text-secondary text-sm'>
              {getExposurePercent(selectedPreset.coveragePercent)}% exposed
            </span>
          </button>
        </div>

        {/* Live IU preview */}
        <div className='mb-6 backdrop-blur-xl bg-white/70 rounded-xl p-4 border border-black/5 shadow-sm'>
          <div className='space-y-3'>
            <div className='flex justify-between items-center'>
              <span className='text-text-secondary text-sm'>Estimated IU</span>
              <span className='text-solar-flare font-semibold'>
                {computedIU.toLocaleString()} IU
              </span>
            </div>
            <div className='flex justify-between items-center'>
              <span className='text-text-secondary text-sm'>Effective UV</span>
              <span className='text-text-primary'>{effectiveWindowUv.toFixed(1)}</span>
            </div>
            <div className='flex justify-between items-center'>
              <span className='text-text-secondary text-sm'>Exposure</span>
              <span className='text-text-primary'>{exposurePercent}%</span>
            </div>
            {computedIU === 0 && !noUvData && isWindowCloudBlocked && (
              <p className='text-xs text-amber-700 leading-snug'>
                Clouds are blocking vitamin D for this window. Effective UV stayed under 3, so
                no IU is produced.
              </p>
            )}
            {computedIU === 0 && !noUvData && !isWindowCloudBlocked && (
              <p className='text-xs text-text-secondary leading-snug'>
                The sun was too low for vitamin D during this window (UV under 3), so no IU is
                produced.
              </p>
            )}
          </div>
        </div>

        </div>

        {/* Action buttons — pinned footer, always visible */}
        <div className='flex gap-3 px-6 pt-3 pb-safe border-t border-black/5 bg-light-bg'>
          <button
            type='button'
            onClick={onClose}
            className='flex-1 py-3 px-4 rounded-xl bg-black/5 text-text-secondary font-medium hover:bg-black/10 transition-colors'>
            Cancel
          </button>
          <button
            type='button'
            onClick={handleAdd}
            disabled={saving || invalid}
            className='flex-1 py-3 px-4 rounded-xl bg-solar-flare text-white font-medium hover:bg-solar-warm transition-colors disabled:opacity-50'>
            {saving ? 'Adding...' : 'Add Session'}
          </button>
        </div>

        <ClothingPresetSelector
          isOpen={isPresetSelectorOpen}
          onClose={() => setIsPresetSelectorOpen(false)}
          onSelect={(id) => {
            setSelectedPresetId(id);
            setIsPresetSelectorOpen(false);
          }}
          presets={presets}
          selectedId={selectedPresetId}
        />
      </div>
    </IonModal>
  );
}
