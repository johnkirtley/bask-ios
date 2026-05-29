'use client';

import { useState } from 'react';
import { IonToggle, IonAlert, IonModal, IonToast } from '@ionic/react';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { useLeaderboard } from '../../hooks/useLeaderboard';
import { LEADERBOARD_COUNTRIES } from '../../lib/leaderboard/countries';
import { isAnonymousNameTakenError } from '../../lib/leaderboard/nameErrors';
import LeaderboardLocationModal from './LeaderboardLocationModal';

const LEADERBOARD_URL = 'https://getbask.app/leaderboard';

const DATA_DISCLOSURE = [
  { sent: 'Random public ID + write token (not linked to Apple ID)', never: 'Name, email, Apple ID' },
  { sent: 'Your chosen anonymous name', never: 'Precise GPS coordinates' },
  { sent: 'Sun IU + duration per completed session', never: 'Skin type, age, weight, blood tests' },
  { sent: 'Optional country/region/city (if you choose)', never: 'Supplements, cofactors, HealthKit data' },
];

export default function LeaderboardSettings() {
  const {
    isOptedIn,
    hasCredentials,
    anonymousName,
    location,
    isLoading,
    optIn,
    optOut,
    deleteLeaderboardData,
    updateName,
    randomizeName,
    setLocation,
  } = useLeaderboard();

  const [showNameEdit, setShowNameEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showOptOutConfirm, setShowOptOutConfirm] = useState(false);
  const [showLocationEdit, setShowLocationEdit] = useState(false);
  const [showDataDisclosure, setShowDataDisclosure] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [pendingName, setPendingName] = useState<string | null>(null);
  const [shuffling, setShuffling] = useState(false);

  const handleOpenLeaderboard = async () => {
    if (Capacitor.isNativePlatform()) {
      await Browser.open({ url: LEADERBOARD_URL });
    } else {
      window.open(LEADERBOARD_URL, '_blank');
    }
  };

  const handleToggle = async () => {
    if (isOptedIn) {
      setShowOptOutConfirm(true);
    } else {
      try {
        await optIn();
      } catch {
        setNameError("Couldn't join leaderboard. Try again.");
      }
    }
  };

  const handleSaveName = (rawName?: string): boolean | void => {
    if (!rawName) return;

    const trimmed = rawName.trim().toLowerCase().replace(/\s+/g, '-');
    if (!trimmed || trimmed.length < 3 || trimmed.length > 30) {
      setNameError('Name must be 3-30 characters (lowercase, hyphens allowed).');
      setPendingName(rawName);
      return false;
    }

    setPendingName(rawName);
    updateName(rawName)
      .then(() => setPendingName(null))
      .catch((e) => {
        if (isAnonymousNameTakenError(e)) {
          setNameError('This name is already taken. Try another.');
          setTimeout(() => setShowNameEdit(true), 0);
        } else if (e instanceof Error && e.message.includes('3-30')) {
          setNameError(e.message);
          setTimeout(() => setShowNameEdit(true), 0);
        } else {
          setNameError('Could not update name. Try again.');
          setPendingName(null);
        }
      });
  };

  const handleShuffle = async () => {
    setShuffling(true);
    try {
      await randomizeName();
    } catch {
      setNameError("Couldn't find a unique name. Try again.");
    } finally {
      setShuffling(false);
    }
  };

  if (isLoading) return null;

  return (
    <>
      <div className='backdrop-blur-xl bg-white/70 border border-black/5 shadow-sm rounded-xl overflow-hidden'>
        <div className='p-4 flex items-center justify-between border-b border-black/5'>
          <div className='flex items-center gap-3'>
            <span className='text-text-secondary'>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                strokeLinecap='round'
                strokeLinejoin='round'
                className='w-5 h-5'>
                <path d='M8 21h8m-4-4v4m-5-8a5 5 0 0 1-3-5V4h16v4a5 5 0 0 1-3 5' />
                <path d='M5 4H3v3a3 3 0 0 0 3 3M19 4h2v3a3 3 0 0 1-3 3' />
              </svg>
            </span>
            <div>
              <span className='text-text-primary'>Touch Grass Leaderboard</span>
              <p className='text-xs text-text-secondary mt-0.5'>
                Opt-in anonymous community leaderboard
              </p>
            </div>
          </div>
          <IonToggle checked={isOptedIn} onIonChange={handleToggle} />
        </div>

        <div className='p-4 border-b border-black/5'>
          <p className='text-xs text-text-secondary'>
            Bask is private by default. If you join, only anonymous session scores are sent—never
            supplements or health profile data.
          </p>
          <button
            type='button'
            onClick={() => setShowDataDisclosure(true)}
            className='mt-2 text-xs font-medium text-solar-flare active:opacity-60 transition-opacity'>
            What we collect & don&apos;t collect
          </button>
        </div>

        <button
          type='button'
          onClick={() => void handleOpenLeaderboard()}
          className='w-full p-4 flex items-center justify-between border-b border-black/5 text-left active:bg-black/5 transition-all'>
          <span className='text-text-primary'>View the leaderboard</span>
          <svg
            xmlns='http://www.w3.org/2000/svg'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
            className='w-4 h-4 text-text-secondary'>
            <path d='m9 18 6-6-6-6' />
          </svg>
        </button>

        {isOptedIn && anonymousName && (
          <>
            <div className='p-4 flex items-center justify-between border-b border-black/5'>
              <div>
                <span className='text-xs text-text-secondary'>Your name</span>
                <p className='font-medium text-text-primary'>{anonymousName}</p>
              </div>
              <div className='flex gap-2'>
                <button
                  type='button'
                  onClick={() => void handleShuffle()}
                  disabled={shuffling}
                  className='px-3 py-1.5 rounded-lg bg-black/5 text-text-secondary text-xs font-medium active:bg-black/10 transition-all disabled:opacity-40'>
                  {shuffling ? '…' : 'Shuffle'}
                </button>
                <button
                  type='button'
                  onClick={() => setShowNameEdit(true)}
                  className='px-3 py-1.5 rounded-lg bg-black/5 text-text-primary text-xs font-medium active:bg-black/10 transition-all'>
                  Edit
                </button>
              </div>
            </div>

            <div className='p-4 border-b border-black/5'>
              <div className='flex items-center justify-between mb-3'>
                <div>
                  <span className='text-xs text-text-secondary'>Public location</span>
                  <p className='text-sm text-text-primary mt-0.5'>
                    {location.locationPrecision === 'none'
                      ? 'Hidden'
                      : location.locationPrecision === 'country'
                        ? LEADERBOARD_COUNTRIES.find((c) => c.code === location.countryCode)?.name ??
                          location.countryCode
                        : location.locationPrecision === 'region'
                          ? `${location.regionLabel || '—'}, ${location.countryCode}`
                          : `${location.cityLabel || '—'}, ${location.regionLabel || '—'}`}
                  </p>
                </div>
                <button
                  type='button'
                  onClick={() => setShowLocationEdit(true)}
                  className='px-3 py-1.5 rounded-lg bg-black/5 text-text-primary text-xs font-medium active:bg-black/10 transition-all'>
                  Edit
                </button>
              </div>
              <p className='text-xs text-text-secondary'>
                Optional. Never uses precise GPS — you choose what appears on the public leaderboard.
              </p>
            </div>

            <button
              type='button'
              onClick={() => setShowDeleteConfirm(true)}
              className='w-full p-4 text-left text-sm text-red-600 active:bg-red-50 transition-all'>
              Delete my leaderboard data
            </button>
          </>
        )}

        {!isOptedIn && hasCredentials && anonymousName && (
          <>
            <div className='p-4 border-b border-black/5'>
              <span className='text-xs text-text-secondary'>Your name</span>
              <p className='font-medium text-text-primary mt-0.5'>{anonymousName}</p>
              <p className='text-xs text-text-secondary mt-2'>
                You&apos;re paused. Turn on to rejoin with the same name.
              </p>
            </div>

            <button
              type='button'
              onClick={() => setShowDeleteConfirm(true)}
              className='w-full p-4 text-left text-sm text-red-600 active:bg-red-50 transition-all'>
              Delete my leaderboard data
            </button>
          </>
        )}
      </div>

      <IonModal
        isOpen={showDataDisclosure}
        onDidDismiss={() => setShowDataDisclosure(false)}
        initialBreakpoint={0.9}
        breakpoints={[0, 0.9, 1]}>
        <div className='bg-light-bg min-h-full p-6 pb-safe flex flex-col'>
          <div className='mb-6'>
            <h2 className='text-[17px] font-semibold text-text-primary'>Leaderboard data</h2>
            <p className='text-sm text-text-secondary mt-1'>
              If you opt in, only the items below are sent after each completed sun session.
              Supplements are never included.
            </p>
          </div>

          <div className='flex-1 overflow-y-auto'>
            <div className='rounded-lg bg-black/[0.03] overflow-hidden text-xs'>
              <div className='grid grid-cols-2 gap-px bg-black/5'>
                <div className='bg-white/80 p-2 font-medium text-text-primary'>
                  Sent when opted in
                </div>
                <div className='bg-white/80 p-2 font-medium text-text-primary'>Never sent</div>
              </div>
              {DATA_DISCLOSURE.map((row, i) => (
                <div
                  key={i}
                  className='grid grid-cols-2 gap-px bg-black/5 border-t border-black/5'>
                  <div className='bg-white/80 p-2 text-text-secondary'>{row.sent}</div>
                  <div className='bg-white/80 p-2 text-text-secondary'>{row.never}</div>
                </div>
              ))}
            </div>

            <div className='mt-4 space-y-2'>
              <p className='text-xs text-text-secondary'>
                When off: we stop uploading and hide you from the public board (profile kept for
                rejoin).
              </p>
              <p className='text-xs text-text-secondary'>
                Delete: permanently removes your server data.
              </p>
            </div>
          </div>

          <button
            type='button'
            onClick={() => setShowDataDisclosure(false)}
            className='mt-6 w-full py-3.5 rounded-full text-[15px] font-semibold bg-black text-white active:scale-[0.98] transition-all'>
            Done
          </button>
        </div>
      </IonModal>

      <IonAlert
        key={`name-edit-${showNameEdit}-${pendingName ?? anonymousName ?? ''}`}
        isOpen={showNameEdit}
        onDidDismiss={() => setShowNameEdit(false)}
        header='Change Name'
        message='Enter a new anonymous name (3-30 characters, lowercase, hyphens allowed)'
        inputs={[
          {
            name: 'newName',
            type: 'text',
            value: pendingName ?? anonymousName ?? '',
            placeholder: 'e.g. swift-meadow',
          },
        ]}
        buttons={[
          {
            text: 'Cancel',
            role: 'cancel',
            handler: () => setPendingName(null),
          },
          {
            text: 'Save',
            handler: (data: { newName?: string }) => handleSaveName(data.newName),
          },
        ]}
      />

      <LeaderboardLocationModal
        isOpen={showLocationEdit}
        location={location}
        onClose={() => setShowLocationEdit(false)}
        onSave={setLocation}
      />

      <IonAlert
        isOpen={showOptOutConfirm}
        onDidDismiss={() => setShowOptOutConfirm(false)}
        header='Leave the leaderboard?'
        message="You'll be removed from the public rankings and we won't upload new sessions. Your profile is saved so you can rejoin anytime. Use Delete my data to remove everything permanently."
        buttons={[
          { text: 'Cancel', role: 'cancel' },
          {
            text: 'Leave leaderboard',
            handler: () => {
              void optOut();
            },
          },
        ]}
      />

      <IonAlert
        isOpen={showDeleteConfirm}
        onDidDismiss={() => setShowDeleteConfirm(false)}
        header='Delete Leaderboard Data?'
        message='This removes your scores and profile from the public leaderboard. Your local Bask data is not affected.'
        buttons={[
          { text: 'Cancel', role: 'cancel' },
          {
            text: 'Delete',
            role: 'destructive',
            handler: () => {
              void deleteLeaderboardData();
            },
          },
        ]}
      />

      <IonToast
        isOpen={!!nameError}
        onDidDismiss={() => setNameError(null)}
        message={nameError ?? ''}
        duration={5000}
        color='danger'
        position='top'
      />
    </>
  );
}
