'use client';

interface GlassCardWrapperProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Consistent glass card wrapper for the "Wellness Sanctuary" design
 * Provides standard frosted glass styling with gradient overlays
 */
export default function GlassCardWrapper({ children, className = '' }: GlassCardWrapperProps) {
  return (
    <div className={`relative backdrop-blur-xl bg-white/70 rounded-2xl p-4 border border-black/[0.04] shadow-[0_2px_12px_rgba(0,0,0,0.04)] ${className}`}>
      {/* Luminous gradient overlay - catches light like frosted glass */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-white/10 rounded-2xl pointer-events-none" />

      {/* Subtle inner glow for depth */}
      <div className="absolute inset-0 rounded-2xl pointer-events-none shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)]" />

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
