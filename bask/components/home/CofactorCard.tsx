'use client';

import { useState, useEffect, useRef } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { App } from '@capacitor/app';
import { cofactorsRepository, CofactorType } from '../../lib/database';
import GlassCardWrapper from './GlassCardWrapper';
import { capture, ANALYTICS_EVENTS } from '../../lib/analytics';

interface CofactorCardProps {
  onCofactorLogged?: () => void;
}

/**
 * Card for tracking daily cofactor intake (Magnesium and Vitamin K2)
 * Essential nutrients that work synergistically with Vitamin D
 *
 * Educational context:
 * - Magnesium: Required to convert vitamin D into active form (calcitriol)
 * - Vitamin K2: Ensures calcium goes to bones, not arteries (works with D)
 */
export default function CofactorCard({ onCofactorLogged }: CofactorCardProps) {
  const [magnesiumLogged, setMagnesiumLogged] = useState(false);
  const [k2Logged, setK2Logged] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showEducation, setShowEducation] = useState(false);
  const lastLoadDateRef = useRef<string>(new Date().toDateString());

  // Load today's cofactor status
  useEffect(() => {
    loadTodayStatus();

    // Listen for app resume to detect day changes
    const listener = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        const today = new Date().toDateString();
        if (today !== lastLoadDateRef.current) {
          lastLoadDateRef.current = today;
          loadTodayStatus();
        }
      }
    });

    // Also check on visibility change (for web/PWA)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const today = new Date().toDateString();
        if (today !== lastLoadDateRef.current) {
          lastLoadDateRef.current = today;
          loadTodayStatus();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      listener.then((l) => l.remove());
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const loadTodayStatus = async () => {
    try {
      const [magnesium, k2] = await Promise.all([
        cofactorsRepository.hasLoggedToday('magnesium'),
        cofactorsRepository.hasLoggedToday('vitamin_k2'),
      ]);
      setMagnesiumLogged(magnesium);
      setK2Logged(k2);
    } catch (error) {
      console.error('Failed to load cofactor status:', error);
    }
  };

  const handleToggle = async (type: CofactorType) => {
    if (isLoading) return;

    setIsLoading(true);

    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      // Haptics not available
    }

    try {
      const isCurrentlyLogged =
        type === 'magnesium' ? magnesiumLogged : k2Logged;

      if (!isCurrentlyLogged) {
        // Log the cofactor
        await cofactorsRepository.create(type);

        capture(ANALYTICS_EVENTS.cofactorLogged, { cofactor_type: type });

        // Update state
        if (type === 'magnesium') {
          setMagnesiumLogged(true);
        } else {
          setK2Logged(true);
        }

        // Notify parent component
        if (onCofactorLogged) {
          onCofactorLogged();
        }
      } else {
        // If already logged today, we don't remove it (user can only add, not remove for today)
        // This prevents accidental un-logging
      }
    } catch (error) {
      console.error('Failed to log cofactor:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const bothLogged = magnesiumLogged && k2Logged;

  return (
    <div className='w-full'>
      <GlassCardWrapper>
        {/* Header */}
        <div className='mb-4'>
          <h3 className='text-[11px] font-extrabold uppercase tracking-[0.12em] text-text-secondary mb-2'>
            Cofactors
          </h3>
          <div className='flex items-center justify-between'>
            <div className='flex-1'>
              <p className='text-sm font-medium text-text-primary'>
                {bothLogged
                  ? '✓ Logged Today!'
                  : 'Track Your Intake'}
              </p>
              <p className='text-xs text-text-secondary mt-0.5'>
                {bothLogged
                  ? 'Great work! Your cofactors are logged'
                  : 'May support vitamin D utilization'}
              </p>
            </div>

            {/* Info button */}
            <button
              onClick={() => setShowEducation(!showEducation)}
              aria-label='Learn about cofactors'
              aria-expanded={showEducation}
              className='p-2 rounded-full hover:bg-black/5 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center'>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                fill='none'
                viewBox='0 0 24 24'
                strokeWidth={2}
                stroke='currentColor'
                className='w-5 h-5 text-text-primary'
                aria-hidden='true'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  d='M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z'
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Cofactor toggles */}
        <div className='space-y-3 pt-2 border-t border-black/5'>
          {/* Magnesium toggle */}
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3 min-w-0'>
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  magnesiumLogged ? 'bg-grove-green' : 'bg-black/5'
                }`}>
                <span className='text-xs font-bold text-text-primary'>Mg</span>
              </div>
              <div className='min-w-0'>
                <p className='text-sm font-medium text-text-primary'>
                  Magnesium
                </p>
                <p className='text-xs text-text-secondary'>
                  May support vitamin D activation
                </p>
              </div>
            </div>
            <button
              onClick={() => handleToggle('magnesium')}
              disabled={isLoading || magnesiumLogged}
              aria-label={magnesiumLogged ? 'Magnesium logged' : 'Log magnesium intake'}
              className={`px-4 py-3 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                magnesiumLogged
                  ? 'bg-grove-green text-white'
                  : 'bg-black/5 text-text-primary hover:bg-black/10 active:scale-[0.98]'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
              {magnesiumLogged ? '✓ Logged' : 'Log'}
            </button>
          </div>

          {/* Vitamin K2 toggle */}
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3 min-w-0'>
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  k2Logged ? 'bg-bask-teal' : 'bg-black/5'
                }`}>
                <span className='text-xs font-bold text-text-primary'>K₂</span>
              </div>
              <div className='min-w-0'>
                <p className='text-sm font-medium text-text-primary'>
                  Vitamin K2
                </p>
                <p className='text-xs text-text-secondary'>
                  May support calcium utilization
                </p>
              </div>
            </div>
            <button
              onClick={() => handleToggle('vitamin_k2')}
              disabled={isLoading || k2Logged}
              aria-label={k2Logged ? 'Vitamin K2 logged' : 'Log vitamin K2 intake'}
              className={`px-4 py-3 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                k2Logged
                  ? 'bg-bask-teal text-white'
                  : 'bg-black/5 text-text-primary hover:bg-black/10 active:scale-[0.98]'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
              {k2Logged ? '✓ Logged' : 'Log'}
            </button>
          </div>
        </div>

        {/* Educational content (expandable) */}
        {showEducation && (
          <div className='mt-4 pt-3 border-t border-black/5 space-y-3'>
            <div className='space-y-2'>
              <p className='text-xs font-medium text-text-primary'>
                🧂 Why Magnesium Matters
              </p>
              <p className='text-xs text-text-secondary leading-relaxed'>
                Some research suggests your body needs magnesium to convert vitamin D into its active
                form. Without adequate magnesium, D levels may not rise
                as expected, even with supplementation.
              </p>
            </div>
            <div className='space-y-2'>
              <p className='text-xs font-medium text-text-primary'>
                🦴 Why Vitamin K2 Matters
              </p>
              <p className='text-xs text-text-secondary leading-relaxed'>
                Some research suggests K2 may support healthy calcium utilization. When taking
                higher vitamin D, some people consider K2 supplementation.
              </p>
            </div>
          </div>
        )}
      </GlassCardWrapper>
    </div>
  );
}
