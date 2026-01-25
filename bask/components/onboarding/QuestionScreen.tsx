'use client';

import { Haptics, ImpactStyle } from '@capacitor/haptics';
import AnswerOption from './AnswerOption';
import { OnboardingQuestion } from '../../lib/onboardingData';

interface QuestionScreenProps {
  question: OnboardingQuestion;
  selectedValues: string[];
  onToggle: (value: string) => void;
  onContinue: () => void;
}

export default function QuestionScreen({
  question,
  selectedValues,
  onToggle,
  onContinue,
}: QuestionScreenProps) {
  const handleContinue = async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      // Web fallback
    }
    onContinue();
  };

  const hasSelection = selectedValues.length > 0;
  const isMultiSelect = question.multiSelect !== false;

  return (
    <div className="flex flex-col h-full px-6 pt-safe">
      <div className="flex-1 flex flex-col justify-center">
        <h1 className="text-[28px] font-title text-umber text-center mb-2 leading-tight">
          {question.title}
        </h1>
        <p className="text-sm text-umber-muted text-center mb-8">
          {question.subtitle || (isMultiSelect ? 'Select all that apply' : 'Select one')}
        </p>

        <div className="space-y-3">
          {question.options.map((option) => (
            <AnswerOption
              key={option.value}
              label={option.label}
              description={option.description}
              isSelected={selectedValues.includes(option.value)}
              onToggle={() => onToggle(option.value)}
            />
          ))}
        </div>
      </div>

      <div className="pb-safe py-4">
        <button
          onClick={handleContinue}
          disabled={!hasSelection}
          className={`w-full py-4 rounded-full text-[17px] font-semibold transition-all duration-200 ${
            hasSelection
              ? 'bg-olive text-oat active:scale-[0.98]'
              : 'bg-olive/30 text-oat/60 cursor-not-allowed'
          }`}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
