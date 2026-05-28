'use client';

interface LoadingSpinnerProps {
  /** sm = 32px, md = 48px (default), lg = 64px */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<LoadingSpinnerProps['size']>, string> = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
};

/**
 * Shared brand loading spinner — solar-flare ring on a faint track.
 * Use everywhere a loading indicator is needed so the app reads as one system.
 */
export default function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  return (
    <div
      role='status'
      aria-label='Loading'
      className={`${SIZE_CLASSES[size]} border-4 border-solar-flare/30 border-t-solar-flare rounded-full animate-spin mx-auto ${className}`}
    />
  );
}
