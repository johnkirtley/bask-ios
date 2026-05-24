'use client';

import { ReactNode, useRef, useState, useCallback, useEffect } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface SwipeableCardProps {
  children: ReactNode;
  onDelete: () => void;
  isOpen: boolean;
  onSwipeOpen: () => void;
  onSwipeClose: () => void;
}

const SWIPE_THRESHOLD = 80;
const VELOCITY_THRESHOLD = 0.3;
const TAP_THRESHOLD = 10;

export default function SwipeableCard({
  children,
  onDelete,
  isOpen,
  onSwipeOpen,
  onSwipeClose,
}: SwipeableCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchStartTime = useRef(0);
  const totalMovement = useRef(0);
  const hasTriggeredHaptic = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setDragOffset(SWIPE_THRESHOLD);
    } else {
      setDragOffset(0);
    }
  }, [isOpen]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length > 1) return;

    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
    totalMovement.current = 0;
    hasTriggeredHaptic.current = false;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length > 1) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - touchStartX.current;
    const diffY = currentY - touchStartY.current;

    totalMovement.current = Math.abs(diffX);

    // Check if this is a horizontal swipe (more horizontal than vertical)
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
      e.preventDefault();
      setIsDragging(true);

      // Only allow left swipe (negative offset)
      const newOffset = Math.max(0, Math.min(-diffX, SWIPE_THRESHOLD));
      setDragOffset(newOffset);
    }
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (!isDragging) {
      // This was a tap (minimal movement)
      if (totalMovement.current < TAP_THRESHOLD) {
        if (isOpen) {
          onSwipeClose();
        }
      }
      return;
    }

    const dragTime = Date.now() - touchStartTime.current;
    const velocity = dragTime > 0 ? dragOffset / dragTime : 0;

    // Snap to open or closed
    if (dragOffset > SWIPE_THRESHOLD / 2 || velocity > VELOCITY_THRESHOLD) {
      setDragOffset(SWIPE_THRESHOLD);
      onSwipeOpen();

      // Haptic feedback when opening
      if (!hasTriggeredHaptic.current) {
        try {
          await Haptics.impact({ style: ImpactStyle.Light });
          hasTriggeredHaptic.current = true;
        } catch {}
      }
    } else {
      setDragOffset(0);
      onSwipeClose();
    }

    setIsDragging(false);
  }, [isDragging, dragOffset, isOpen, onSwipeOpen, onSwipeClose]);

  const getTransform = () => {
    return `translateX(-${dragOffset}px)`;
  };

  return (
    <div className="swipeable-card-container">
      {/* Delete action button behind the card */}
      <div className={`swipeable-card-actions bg-red-500 ${isDragging || isOpen ? 'opacity-100' : 'opacity-0'}`}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="text-white font-semibold px-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-6 h-6">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
            />
          </svg>
        </button>
      </div>

      {/* Card content */}
      <div
        className={`swipeable-card-content ${isDragging ? 'dragging' : ''}`}
        style={{ transform: getTransform() }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}>
        {children}
      </div>
    </div>
  );
}
