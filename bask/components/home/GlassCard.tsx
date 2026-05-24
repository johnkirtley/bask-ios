'use client';

import { useState } from 'react';

interface GlassCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  infoText?: string; // Explainer text shown when tapping the info icon
  isLoading?: boolean; // Show loading indicator instead of value
}

/**
 * Light frosted glass card - "Wellness Sanctuary" aesthetic
 * Captures and diffuses light like morning sun through spa glass
 */
export default function GlassCard({ label, value, subtext, infoText, isLoading }: GlassCardProps) {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="group relative backdrop-blur-xl bg-white/70 rounded-2xl px-4 py-3.5 border border-black/[0.04] shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-shadow duration-300">
      {/* Luminous gradient overlay - catches light like frosted glass */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-white/10 rounded-2xl pointer-events-none" />

      {/* Subtle inner glow for depth */}
      <div className="absolute inset-0 rounded-2xl pointer-events-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)]" />

      <div className="relative z-10 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="text-[11px] font-semibold text-text-secondary uppercase tracking-[0.08em] truncate">
              {label}
            </div>
            {infoText && (
              <button
                onClick={() => setShowInfo(!showInfo)}
                className="flex-shrink-0 w-[18px] h-[18px] rounded-full bg-black/[0.04] hover:bg-black/[0.08] active:scale-95 transition-all duration-200 flex items-center justify-center"
                aria-label="More information">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                  className="w-[11px] h-[11px] text-text-secondary">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
                  />
                </svg>
              </button>
            )}
          </div>
          <div className="flex items-baseline gap-2 flex-shrink-0">
            {isLoading ? (
              <>
                {/* Animated dot for motion users, hidden for reduced motion */}
                <div className="w-3 h-3 rounded-full bg-solar-flare animate-pulse-solar motion-reduce:hidden" />
                {/* Static text for reduced motion users */}
                <span className="hidden motion-reduce:inline text-sm text-text-muted">
                  Checking sun...
                </span>
              </>
            ) : (
              <>
                <div className="text-lg font-bold text-text-primary whitespace-nowrap tabular-nums">{value}</div>
                {subtext && <div className="text-[10px] font-medium text-text-muted whitespace-nowrap">{subtext}</div>}
              </>
            )}
          </div>
        </div>

        {/* Expandable info text with smooth reveal */}
        {infoText && showInfo && (
          <div className="text-[11px] text-text-secondary leading-relaxed pt-2 border-t border-black/[0.06] animate-in fade-in slide-in-from-top-1 duration-200">
            {infoText}
          </div>
        )}
      </div>
    </div>
  );
}
