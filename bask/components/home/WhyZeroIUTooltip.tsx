'use client';

import { useState } from 'react';
import { IonModal } from '@ionic/react';
import GlassCardWrapper from './GlassCardWrapper';

interface WhyZeroIUTooltipProps {
  isOpen: boolean;
  onClose: () => void;
  uvIndex: number;
  cloudCover?: number;
  exposurePercent: number;
}

/**
 * Educational tooltip explaining why vitamin D synthesis is at 0 IU
 * Addresses the "Three Pillars": Sun Angle, Clothing Coverage, and Cloud/Glass Filter
 * Includes the memorable "Shadow Rule" for practical understanding
 */
export default function WhyZeroIUTooltip({
  isOpen,
  onClose,
  uvIndex,
  cloudCover = 0,
  exposurePercent,
}: WhyZeroIUTooltipProps) {
  const [activeSection, setActiveSection] = useState<number | null>(null);

  // Determine which factors are blocking vitamin D synthesis
  const isSunAngleLow = uvIndex < 3;
  const isCloudyOrIndoors = cloudCover > 0.5;
  const isLowExposure = exposurePercent < 20;

  const pillars = [
    {
      id: 0,
      title: 'Sun Angle',
      icon: '☀️',
      isActive: isSunAngleLow,
      description: 'UV < 3: Sun too low in sky',
      detail:
        'When the sun is too low on the horizon, the atmosphere blocks 100% of the UVB rays needed for vitamin D. The sun needs to be high enough (UV ≥ 3) for your skin to produce vitamin D.',
      gradient: 'from-amber-400/20 to-orange-300/10',
      accentColor: 'border-amber-500/30',
    },
    {
      id: 1,
      title: 'Skin Exposure',
      icon: '👕',
      isActive: isLowExposure,
      description: 'Too much clothing coverage',
      detail:
        'UVB rays cannot penetrate fabric. If only your face and hands are exposed, your "solar panels" are too small to generate meaningful vitamin D. Expose arms, legs, or torso for best results.',
      gradient: 'from-bask-teal/20 to-bask-teal/5',
      accentColor: 'border-bask-teal/30',
    },
    {
      id: 2,
      title: 'Cloud/Glass Filter',
      icon: '☁️',
      isActive: isCloudyOrIndoors,
      description: 'Clouds or glass blocking UV',
      detail:
        'Clouds can block up to 70% of UVB rays. Standard window glass blocks 100% of UVB. Even on a bright day, if you are indoors or the sky is overcast, vitamin D production stops.',
      gradient: 'from-slate-400/20 to-gray-300/10',
      accentColor: 'border-slate-500/30',
    },
  ];

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={onClose}
      initialBreakpoint={0.85}
      breakpoints={[0, 0.85, 1]}
      className='why-zero-modal'>
      <div className='h-full bg-gradient-to-br from-light-bg via-gradient-light-mid to-light-bg overflow-y-auto'>
        {/* Header */}
        <div className='sticky top-0 z-20 bg-gradient-to-b from-light-bg to-transparent backdrop-blur-sm pb-4'>
          <div className='flex items-center justify-between px-6 pt-6'>
            <div className='flex-1'>
              <h2 className='text-2xl font-bold text-text-primary'>
                Why is my IU staying at 0?
              </h2>
              <p className='text-sm text-text-secondary mt-1'>
                Understanding the science behind the sun
              </p>
            </div>
            <button
              onClick={onClose}
              className='w-10 h-10 rounded-full bg-black/5 hover:bg-black/10 active:scale-[0.98] transition-all flex items-center justify-center'>
              <svg
                className='w-5 h-5 text-text-primary'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M6 18L18 6M6 6l12 12'
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className='px-6 pb-20'>
          {/* Intro Message */}
          <div className='mb-6'>
            <GlassCardWrapper className='bg-gradient-to-br from-solar-flare/10 to-solar-warm/5 border-solar-flare/20'>
              <p className='text-sm text-text-primary leading-relaxed'>
                Even if it&apos;s bright out, your body needs{' '}
                <span className='font-semibold text-solar-warm'>
                  specific conditions
                </span>{' '}
                to create vitamin D. Here&apos;s what might be blocking it:
              </p>
            </GlassCardWrapper>
          </div>

          {/* The Three Pillars */}
          <div className='space-y-3 mb-8'>
            {pillars.map((pillar, index) => (
              <button
                key={pillar.id}
                onClick={() =>
                  setActiveSection(
                    activeSection === pillar.id ? null : pillar.id,
                  )
                }
                aria-expanded={activeSection === pillar.id}
                aria-label={`${pillar.title}. ${
                  pillar.isActive
                    ? 'Currently affecting your vitamin D production'
                    : ''
                }`}
                className={`w-full text-left transition-all duration-300 ${
                  activeSection === pillar.id
                    ? 'scale-[1.02]'
                    : 'active:scale-[0.98]'
                }`}
                style={{
                  animationDelay: `${index * 100}ms`,
                  animation: isOpen
                    ? 'slideInUp 0.4s ease-out forwards'
                    : 'none',
                  opacity: isOpen ? 1 : 0,
                }}>
                <GlassCardWrapper
                  className={`bg-gradient-to-br ${pillar.gradient} ${
                    pillar.isActive
                      ? `border-2 ${pillar.accentColor} shadow-lg`
                      : 'border-black/[0.04]'
                  } transition-all duration-300`}>
                  <div className='flex items-start gap-4'>
                    {/* Icon */}
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${
                        pillar.isActive
                          ? 'bg-white/60 shadow-md'
                          : 'bg-white/40'
                      } transition-all duration-300`}>
                      {pillar.icon}
                    </div>

                    {/* Content */}
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center gap-2 mb-1'>
                        <h3 className='text-base font-bold text-text-primary'>
                          {pillar.title}
                        </h3>
                        {pillar.isActive && (
                          <span className='px-2 py-0.5 rounded-full bg-ember-alert/20 text-ember-alert text-xs font-bold uppercase tracking-wider'>
                            Active
                          </span>
                        )}
                      </div>
                      <p className='text-sm text-text-secondary'>
                        {pillar.description}
                      </p>

                      {/* Expandable detail */}
                      {activeSection === pillar.id && (
                        <div
                          className='mt-3 pt-3 border-t border-black/5'
                          style={{
                            animation: 'fadeIn 0.3s ease-out',
                          }}>
                          <p className='text-xs text-text-primary leading-relaxed'>
                            {pillar.detail}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Chevron */}
                    <svg
                      className={`w-5 h-5 text-text-secondary flex-shrink-0 transition-transform duration-300 ${
                        activeSection === pillar.id ? 'rotate-180' : ''
                      }`}
                      fill='none'
                      viewBox='0 0 24 24'
                      stroke='currentColor'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M19 9l-7 7-7-7'
                      />
                    </svg>
                  </div>
                </GlassCardWrapper>
              </button>
            ))}
          </div>

          {/* Shadow Rule - The Key Takeaway */}
          <div
            className='mb-6'
            style={{
              animationDelay: '400ms',
              animation: isOpen ? 'slideInUp 0.5s ease-out forwards' : 'none',
              opacity: isOpen ? 1 : 0,
            }}>
            <GlassCardWrapper className='bg-gradient-to-br from-solar-flare/20 via-solar-warm/15 to-solar-flare/10 border-2 border-solar-flare/40 shadow-xl'>
              {/* Badge */}
              <div className='flex items-center gap-2 mb-3'>
                <span className='px-3 py-1 rounded-full bg-solar-flare/30 text-solar-warm text-xs font-bold uppercase tracking-wider'>
                  Pro Tip
                </span>
              </div>

              {/* Title */}
              <h3 className='text-lg font-bold text-text-primary mb-2 flex items-center gap-2'>
                <span>🌅</span>
                The Shadow Rule
              </h3>

              {/* Explanation */}
              <p className='text-sm text-text-primary leading-relaxed'>
                <span className='font-semibold'>Look at your shadow.</span> If
                your shadow is{' '}
                <span className='font-semibold text-ember-alert'>
                  longer than you are tall
                </span>
                , the sun angle is too low for vitamin D. If your shadow is{' '}
                <span className='font-semibold text-solar-warm'>
                  shorter than you
                </span>
                , it&apos;s prime time for vitamin D synthesis!
              </p>
            </GlassCardWrapper>
          </div>

          {/* Additional Context */}
          <div
            className='text-center'
            style={{
              animationDelay: '500ms',
              animation: isOpen ? 'fadeIn 0.5s ease-out forwards' : 'none',
              opacity: isOpen ? 1 : 0,
            }}>
            <p className='text-xs text-text-secondary leading-relaxed max-w-md mx-auto'>
              💡 Remember: Heat ≠ UV. You might feel hot because of infrared
              rays, but if the atmosphere is hazy or the sun is low, vitamin D
              production can still be zero.
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </IonModal>
  );
}
