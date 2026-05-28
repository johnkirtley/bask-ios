'use client';

interface GlassCardWrapperProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Consistent card wrapper — solid white with warm shadow and 28px radius.
 */
export default function GlassCardWrapper({ children, className = '' }: GlassCardWrapperProps) {
  return (
    <div className={`bg-white rounded-card p-5 shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_6px_24px_rgba(40,30,10,0.06)] ${className}`}>
      {children}
    </div>
  );
}
