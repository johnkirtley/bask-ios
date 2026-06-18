'use client';

import { useState } from 'react';
import SwipeableCard from '../history/SwipeableCard';
import { classifyNgMl, formatLabValue, type LabUnit } from '../../lib/labUtils';
import type { LabResult } from '../../lib/database';

interface LabHistoryListProps {
  results: LabResult[];
  unit: LabUnit;
  onEdit: (result: LabResult) => void;
  onDelete: (id: number) => void;
}

function formatTestDate(dateStr: string): string {
  // test_date is a local YYYY-MM-DD; parse as local to avoid TZ drift.
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function LabHistoryList({ results, unit, onEdit, onDelete }: LabHistoryListProps) {
  const [openId, setOpenId] = useState<number | null>(null);

  return (
    <div className="space-y-2.5">
      {results.map((result) => {
        const band = classifyNgMl(result.value_ng_ml);
        return (
          <SwipeableCard
            key={result.id}
            isOpen={openId === result.id}
            onSwipeOpen={() => setOpenId(result.id)}
            onSwipeClose={() => setOpenId(null)}
            onDelete={() => onDelete(result.id)}>
            <button
              onClick={() => onEdit(result)}
              className="w-full text-left flex items-center gap-3.5 backdrop-blur-xl bg-white/70 rounded-card p-4 border border-black/5 shadow-sm active:scale-[0.99] transition-transform">
              {/* Value chip, tinted by band */}
              <div
                className="flex-shrink-0 w-14 h-14 rounded-2xl flex flex-col items-center justify-center"
                style={{ background: `${band.color}1A` }}>
                <span className="text-lg font-bold leading-none" style={{ color: band.color }}>
                  {result.entered_unit === unit
                    ? result.entered_value
                    : formatLabValue(result.value_ng_ml, unit).split(' ')[0]}
                </span>
                <span className="text-[9px] font-medium mt-0.5" style={{ color: band.color }}>
                  {unit}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: `${band.color}1A`, color: band.color }}>
                    {band.label}
                  </span>
                </div>
                <p className="text-text-primary text-sm font-medium mt-1.5 whitespace-nowrap">
                  {formatTestDate(result.test_date)}
                </p>
                {(result.source || result.notes) && (
                  <p className="text-text-secondary text-xs mt-0.5 truncate">
                    {[result.source, result.notes].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>

              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-4 h-4 text-text-secondary flex-shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </SwipeableCard>
        );
      })}
    </div>
  );
}
