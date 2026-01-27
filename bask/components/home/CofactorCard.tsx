'use client';

import { useState, useEffect } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { cofactorsRepository, CofactorType } from '../../lib/database';

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

  // Load today's cofactor status
  useEffect(() => {
    loadTodayStatus();
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
      const isCurrentlyLogged = type === 'magnesium' ? magnesiumLogged : k2Logged;

      if (!isCurrentlyLogged) {
        // Log the cofactor
        await cofactorsRepository.create(type);

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
    <div className="w-full px-4 py-3">
      <div className="bg-white/40 backdrop-blur-sm rounded-2xl p-4 border border-white/50">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex-1">
            <p className="text-sm font-medium text-white">
              {bothLogged ? '✓ Cofactors Logged Today!' : 'Track Your Cofactors'}
            </p>
            <p className="text-xs text-white/70 mt-0.5">
              {bothLogged ? 'Great work! Your D is optimized' : 'Essential for vitamin D absorption'}
            </p>
          </div>

          {/* Info button */}
          <button
            onClick={() => setShowEducation(!showEducation)}
            className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-5 h-5 text-white">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
              />
            </svg>
          </button>
        </div>

        {/* Cofactor toggles */}
        <div className="space-y-3 pt-2 border-t border-white/20">
          {/* Magnesium toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                magnesiumLogged ? 'bg-golden-glow' : 'bg-white/20'
              }`}>
                <span className="text-lg">🧂</span>
              </div>
              <div>
                <p className="text-sm font-medium text-white">Magnesium</p>
                <p className="text-xs text-white/60">Activates vitamin D</p>
              </div>
            </div>
            <button
              onClick={() => handleToggle('magnesium')}
              disabled={isLoading || magnesiumLogged}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                magnesiumLogged
                  ? 'bg-golden-glow text-white'
                  : 'bg-white/20 text-white hover:bg-white/30 active:scale-95'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
              {magnesiumLogged ? '✓ Logged' : 'Log'}
            </button>
          </div>

          {/* Vitamin K2 toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                k2Logged ? 'bg-golden-glow' : 'bg-white/20'
              }`}>
                <span className="text-lg">🦴</span>
              </div>
              <div>
                <p className="text-sm font-medium text-white">Vitamin K2</p>
                <p className="text-xs text-white/60">Directs calcium to bones</p>
              </div>
            </div>
            <button
              onClick={() => handleToggle('vitamin_k2')}
              disabled={isLoading || k2Logged}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                k2Logged
                  ? 'bg-golden-glow text-white'
                  : 'bg-white/20 text-white hover:bg-white/30 active:scale-95'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
              {k2Logged ? '✓ Logged' : 'Log'}
            </button>
          </div>
        </div>

        {/* Educational content (expandable) */}
        {showEducation && (
          <div className="mt-4 pt-3 border-t border-white/20 space-y-3">
            <div className="space-y-2">
              <p className="text-xs font-medium text-white">🧂 Why Magnesium Matters</p>
              <p className="text-xs text-white/70 leading-relaxed">
                Your body needs magnesium to convert vitamin D into its active form. Without adequate magnesium,
                your D levels won't rise as expected, even with supplementation.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-white">🦴 Why Vitamin K2 Matters</p>
              <p className="text-xs text-white/70 leading-relaxed">
                K2 ensures calcium goes to your bones and teeth, not your arteries. When taking high-dose vitamin D,
                K2 prevents arterial calcification and supports cardiovascular health.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
