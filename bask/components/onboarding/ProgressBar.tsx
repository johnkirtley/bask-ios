interface ProgressBarProps {
  currentStep: number; // 0-6
  totalSteps: number; // 7
}

export default function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  const progressPercent = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className="w-full px-6 pt-safe">
      <div className="h-[3px] w-full bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full onboarding-progress-fill progress-shimmer rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}
