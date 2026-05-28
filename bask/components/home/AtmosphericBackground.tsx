'use client';

interface AtmosphericBackgroundProps {
  children: React.ReactNode;
}

/**
 * Warm cream background with subtle sun-tint radial glow from top.
 */
export default function AtmosphericBackground({
  children,
}: AtmosphericBackgroundProps) {
  return (
    <div
      className="min-h-screen atmospheric-transition"
      style={{ background: '#FBF6EB' }}
    >
      {children}
    </div>
  );
}
