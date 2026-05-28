'use client';

import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface ColorSwatchProps {
  color: string; // Hex color
  label: string;
  isSelected: boolean;
  onSelect: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export default function ColorSwatch({
  color,
  label,
  isSelected,
  onSelect,
  size = 'md',
}: ColorSwatchProps) {
  const handlePress = async () => {
    await Haptics.impact({ style: ImpactStyle.Light });
    onSelect();
  };

  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-18 h-18',
  };

  return (
    <button
      onClick={handlePress}
      className="flex flex-col items-center gap-2 transition-transform duration-200 active:scale-[0.98]"
    >
      <div
        className={`
          ${sizeClasses[size]} rounded-full transition-all duration-200
          ${isSelected ? 'swatch-selected' : 'ring-2 ring-black/10'}
        `}
        style={{ backgroundColor: color }}
      />
      <span className="text-xs text-text-secondary">{label}</span>
    </button>
  );
}
