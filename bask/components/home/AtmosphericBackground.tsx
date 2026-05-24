'use client';

interface AtmosphericBackgroundProps {
  children: React.ReactNode;
}

/**
 * Light gradient background for "Wellness Sanctuary" aesthetic
 * Warm off-white with airy, breathable tones
 */
export default function AtmosphericBackground({
  children,
}: AtmosphericBackgroundProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-light-bg via-[#F7F5F2] to-[#FFF8F0] atmospheric-transition">
      {children}
    </div>
  );
}
