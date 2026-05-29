'use client';

import { useEffect, useState } from 'react';
import { IonModal } from '@ionic/react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { LEADERBOARD_COUNTRIES } from '../../lib/leaderboard/countries';
import type { LocationPrecision } from '../../lib/leaderboard/countries';
import type { LeaderboardLocation } from '../../lib/supabase/leaderboardService';

interface LeaderboardLocationModalProps {
  isOpen: boolean;
  location: LeaderboardLocation;
  onClose: () => void;
  onSave: (location: Partial<LeaderboardLocation>) => Promise<void>;
}

const PRECISION_OPTIONS: { value: LocationPrecision; label: string }[] = [
  { value: 'none', label: 'Hide location' },
  { value: 'country', label: 'Show country only' },
];

export default function LeaderboardLocationModal({
  isOpen,
  location,
  onClose,
  onSave,
}: LeaderboardLocationModalProps) {
  const [precision, setPrecision] = useState<LocationPrecision>(location.locationPrecision);
  const [countryCode, setCountryCode] = useState(location.countryCode);
  const [regionLabel, setRegionLabel] = useState(location.regionLabel);
  const [cityLabel, setCityLabel] = useState(location.cityLabel);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setPrecision(location.locationPrecision);
    setCountryCode(location.countryCode);
    setRegionLabel(location.regionLabel);
    setCityLabel(location.cityLabel);
  }, [isOpen, location]);

  const needsCountry = precision !== 'none';

  const canSave =
    precision === 'none' || (needsCountry && countryCode.trim().length > 0);

  const handleSave = async () => {
    if (!canSave) return;

    setSaving(true);
    try {
      await onSave({
        locationPrecision: precision,
        countryCode: countryCode.trim().toUpperCase(),
        regionLabel: regionLabel.trim(),
        cityLabel: cityLabel.trim(),
      });

      try {
        await Haptics.impact({ style: ImpactStyle.Light });
      } catch {}

      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={onClose}
      initialBreakpoint={0.6}
      breakpoints={[0, 0.6, 0.9]}>
      <div className='bg-light-bg h-full p-6 pb-safe'>
        <div className='mb-6'>
          <h2 className='text-[17px] font-semibold text-text-primary'>Public Location</h2>
          <p className='text-sm text-text-secondary mt-1'>
            Choose what appears on the leaderboard. This is optional and never uses GPS.
          </p>
        </div>

        <div className='space-y-5'>
          <fieldset className='space-y-2'>
            {PRECISION_OPTIONS.map((option) => (
              <label
                key={option.value}
                className='flex items-center gap-3 p-3 rounded-xl bg-white/70 border border-black/5 active:bg-black/[0.03]'>
                <input
                  type='radio'
                  name='locationPrecision'
                  value={option.value}
                  checked={precision === option.value}
                  onChange={() => setPrecision(option.value)}
                  className='accent-solar-flare'
                />
                <span className='text-sm text-text-primary'>{option.label}</span>
              </label>
            ))}
          </fieldset>

          {needsCountry && (
            <div>
              <label className='text-xs text-text-secondary block mb-2'>Country</label>
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className='w-full p-3 rounded-xl bg-white/70 border border-black/5 text-text-primary text-sm'>
                <option value=''>Select country</option>
                {LEADERBOARD_COUNTRIES.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>
          )}

        </div>

        <div className='mt-6 flex gap-3'>
          <button
            type='button'
            onClick={onClose}
            className='flex-1 py-3.5 rounded-full text-[15px] font-medium bg-black/5 text-text-primary active:bg-black/10 transition-all'>
            Cancel
          </button>
          <button
            type='button'
            onClick={() => void handleSave()}
            disabled={!canSave || saving}
            className='flex-1 py-3.5 rounded-full text-[15px] font-semibold bg-black text-white active:scale-[0.98] transition-all disabled:opacity-40'>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </IonModal>
  );
}
