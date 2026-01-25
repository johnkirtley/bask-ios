'use client';

import { ReactNode, useRef, useEffect, useCallback, useState } from 'react';
import { useModal } from '../../contexts/ModalContext';

interface SlideSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  dismissThreshold?: number;
}

// Dismiss if swiped faster than 0.5px/ms
const VELOCITY_THRESHOLD = 0.5;

export default function SlideSheet({
  isOpen,
  onClose,
  children,
  dismissThreshold = 100,
}: SlideSheetProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const touchStartY = useRef(0);
  const touchStartTime = useRef(0);
  const touchStartScrollTop = useRef(0);
  const { setModalOpen } = useModal();

  // Notify modal context when sheet opens/closes
  useEffect(() => {
    setModalOpen(isOpen);
  }, [isOpen, setModalOpen]);

  // Prevent background scrolling when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    // Always restore on unmount or when isOpen changes
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Reset drag state when sheet closes
  useEffect(() => {
    if (!isOpen) {
      setDragOffset(0);
      setIsDragging(false);
    }
  }, [isOpen]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Ignore multi-touch gestures
    if (e.touches.length > 1) return;

    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
    touchStartScrollTop.current = contentRef.current?.scrollTop ?? 0;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // Ignore multi-touch gestures
    if (e.touches.length > 1) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY.current;

    // Only start dragging if scrolled to top and dragging down
    if (diff > 0 && touchStartScrollTop.current <= 0) {
      e.preventDefault();
      setIsDragging(true);
      // Clamp drag offset to prevent excessive dragging
      setDragOffset(Math.min(diff, 400));
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;

    const dragTime = Date.now() - touchStartTime.current;
    // Guard against division by zero
    const velocity = dragTime > 0 ? dragOffset / dragTime : 0;

    // Dismiss if dragged far enough or fast enough
    if (dragOffset > dismissThreshold || velocity > VELOCITY_THRESHOLD) {
      onClose();
    }

    setIsDragging(false);
    setDragOffset(0);
  }, [isDragging, dragOffset, dismissThreshold, onClose]);

  const getTransform = () => {
    if (isDragging) return `translateY(${dragOffset}px)`;
    if (isOpen) return 'translateY(0)';
    return 'translateY(100%)';
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`sheet-backdrop ${isOpen ? 'open' : ''}`}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        className={`slide-sheet ${isOpen ? 'open' : ''} ${isDragging ? 'dragging' : ''}`}
        style={{ transform: getTransform() }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag Handle */}
        <div className="py-3 cursor-grab active:cursor-grabbing">
          <div className="drag-handle" />
        </div>

        {/* Content */}
        <div ref={contentRef} className="sheet-content pb-safe">
          {children}
        </div>
      </div>
    </>
  );
}
