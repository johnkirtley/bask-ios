'use client';

import { IonActionSheet } from '@ionic/react';
import type { ClothingPreset } from '../../lib/mockData';

interface ClothingPresetSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (presetId: string) => void;
  presets: ClothingPreset[];
  selectedId: string;
}

/**
 * Action sheet for selecting clothing preset
 * Determines skin exposure percentage for vitamin D calculations
 */
export default function ClothingPresetSelector({
  isOpen,
  onClose,
  onSelect,
  presets,
  selectedId,
}: ClothingPresetSelectorProps) {
  return (
    <IonActionSheet
      isOpen={isOpen}
      onDidDismiss={onClose}
      header="Choose Your Clothing"
      subHeader="More skin exposed = more vitamin D"
      buttons={[
        ...presets.map((preset) => ({
          text: `${preset.name} (${100 - preset.coveragePercent}% exposed)`,
          handler: () => {
            onSelect(preset.id);
          },
          cssClass: preset.id === selectedId ? 'action-sheet-selected' : '',
        })),
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'action-sheet-cancel',
        },
      ]}
    />
  );
}
