'use client';

interface GlassCardProps {
  label: string;
  value: string | number;
  subtext?: string;
}

/**
 * Frosted glass card component for displaying stats
 * Matches the premium glassmorphism aesthetic from reference
 */
export default function GlassCard({ label, value, subtext }: GlassCardProps) {
  return (
    <div className="relative backdrop-blur-xl bg-white/10 rounded-2xl p-5 border border-white/20 shadow-lg">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-2xl pointer-events-none" />

      <div className="relative z-10 text-center">
        <div className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2">
          {label}
        </div>
        <div className="text-3xl font-bold text-white">
          {value}
        </div>
        {subtext && (
          <div className="text-xs text-text-muted mt-1">
            {subtext}
          </div>
        )}
      </div>
    </div>
  );
}
