'use client';

interface PageIndicatorProps {
  totalPages: number;
  currentPage: number;
}

export default function PageIndicator({ totalPages, currentPage }: PageIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: totalPages }).map((_, index) => (
        <div
          key={index}
          className={`w-2 h-2 rounded-full transition-all duration-300 ${
            index === currentPage
              ? 'bg-olive w-6'
              : index < currentPage
                ? 'bg-olive/50'
                : 'bg-border-warm'
          }`}
        />
      ))}
    </div>
  );
}
