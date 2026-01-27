'use client';

interface AtmosphericBackgroundProps {
  children: React.ReactNode;
}

/**
 * Dark gradient background matching premium design reference
 * Deep navy/charcoal with warm undertones
 */
export default function AtmosphericBackground({
  children,
}: AtmosphericBackgroundProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-dark-bg via-dark-surface to-gradient-warm atmospheric-transition">
      {children}
    </div>
  );
}
