'use client';

import SingleSelectScreen from './SingleSelectScreen';
import { attireOptions } from '../../lib/onboardingData';

interface TypicalAttireScreenProps {
  selectedValue: string | null;
  onSelect: (value: string) => void;
  onContinue: () => void;
}

export default function TypicalAttireScreen({
  selectedValue,
  onSelect,
  onContinue,
}: TypicalAttireScreenProps) {
  return (
    <SingleSelectScreen
      title="When you're outside, what's your standard sun outfit?"
      subtitle="This helps us estimate your exposed skin area"
      options={attireOptions}
      selectedValue={selectedValue}
      onSelect={onSelect}
      onContinue={onContinue}
    />
  );
}
