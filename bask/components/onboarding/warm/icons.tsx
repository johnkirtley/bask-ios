import React from 'react';

interface IconProps {
  color?: string;
  size?: number;
  strokeWidth?: number;
}

const base = (size: number) => ({
  width: size,
  height: size,
  display: 'block' as const,
});

export const BackIcon = ({ color = '#2A2419', size = 22 }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" style={base(size)}>
    <path d="M15 19l-7-7 7-7" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const CheckIcon = ({ color = '#fff', size = 15, strokeWidth = 2.8 }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" style={base(size)}>
    <path d="M5 13l4 4L19 7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const SparkleIcon = ({ color = '#F4A536', size = 16 }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" style={base(size)}>
    <path
      d="M12 3l1.6 5.1L18.8 9.7l-4.4 2.9L16 18l-4-3.1L8 18l1.6-5.4L5.2 9.7l5.2-1.6L12 3z"
      fill={color}
    />
  </svg>
);

export const LocationIcon = ({ color = '#F4A536', size = 32 }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" style={base(size)}>
    <path
      d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const BellIcon = ({ color = '#F4A536', size = 32 }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" style={base(size)}>
    <path
      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const HeartIcon = ({ color = '#FF4D4D', size = 30 }: IconProps) => (
  <svg viewBox="0 0 24 24" fill={color} style={base(size)}>
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </svg>
);

export const InfoIcon = ({ color = '#F4A536', size = 20 }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" style={base(size)}>
    <path d="M12 16v-5M12 8h.01" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ArrowDownIcon = ({ color = '#fff', size = 14 }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" style={base(size)}>
    <path d="M12 5v14M19 12l-7 7-7-7" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
