'use client';

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Haptics, NotificationType } from '@capacitor/haptics';
import { Share } from '@capacitor/share';
import { useModal } from '../../contexts/ModalContext';

interface StreakMilestoneOverlayProps {
  milestone: number | null;
  onDismiss: () => Promise<void>;
}

async function createShareImage(milestone: number): Promise<string | null> {
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const gradient = ctx.createLinearGradient(0, 0, 1200, 630);
  gradient.addColorStop(0, '#FFB347');
  gradient.addColorStop(1, '#FF8A1C');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1200, 630);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.beginPath();
  ctx.arc(250, 180, 180, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(1000, 500, 260, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.font = '700 120px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(`${milestone} Day Streak!`, 600, 280);
  ctx.font = '500 48px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('I hit my daily vitamin D goal with Bask', 600, 370);
  ctx.font = '700 92px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('🔥', 600, 500);

  const data = canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
  const fileName = `bask-${milestone}-day-streak.png`;

  if (!Capacitor.isNativePlatform()) {
    return canvas.toDataURL('image/png');
  }

  const saved = await Filesystem.writeFile({
    path: fileName,
    data,
    directory: Directory.Cache,
  });

  return saved.uri;
}

export default function StreakMilestoneOverlay({
  milestone,
  onDismiss,
}: StreakMilestoneOverlayProps) {
  const [isSharing, setIsSharing] = useState(false);
  const { setModalOpen } = useModal();
  const isOpen = milestone !== null;

  useEffect(() => {
    setModalOpen(isOpen);
  }, [isOpen, setModalOpen]);

  useEffect(() => {
    if (!isOpen) return;
    Haptics.notification({ type: NotificationType.Success }).catch(() => {});
  }, [isOpen]);

  if (milestone === null) return null;

  const handleShare = async () => {
    setIsSharing(true);
    try {
      const imageUri = await createShareImage(milestone);
      await Share.share({
        title: `${milestone} Day Streak!`,
        text: `I hit a ${milestone}-day vitamin D goal streak with Bask.`,
        url: imageUri ?? undefined,
        dialogTitle: 'Share your streak',
      });
    } catch (error) {
      console.warn('Failed to share streak milestone:', error);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div
      role='dialog'
      aria-modal='true'
      className='fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-6 backdrop-blur-xl'>
      <div className='relative w-full max-w-sm overflow-hidden rounded-[2rem] bg-light-bg p-8 text-center shadow-2xl'>
        <div className='absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-solar-flare/30 blur-3xl' />
        <div className='relative'>
          <div className='mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-solar-flare to-solar-warm text-5xl shadow-xl flame-pulse'>
            🔥
          </div>
          <p className='mt-6 text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary'>
            Milestone reached
          </p>
          <h2 className='mt-2 text-4xl font-bold text-text-primary'>
            {milestone} Day Streak!
          </h2>
          <p className='mt-3 text-sm leading-relaxed text-text-secondary'>
            You hit your daily vitamin D goal {milestone} days in a row.
          </p>

          <div className='mt-8 grid grid-cols-2 gap-3'>
            <button
              type='button'
              onClick={handleShare}
              disabled={isSharing}
              className='rounded-full bg-black/5 px-4 py-3 text-sm font-semibold text-text-primary active:scale-95 disabled:opacity-60'>
              {isSharing ? 'Sharing...' : 'Share'}
            </button>
            <button
              type='button'
              onClick={onDismiss}
              className='rounded-full bg-gradient-to-r from-solar-flare to-solar-warm px-4 py-3 text-sm font-bold text-white shadow-lg active:scale-95'>
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
