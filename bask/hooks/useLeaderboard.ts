'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  leaderboardService,
  LeaderboardEntry,
  LeaderboardLocation,
} from '../lib/supabase/leaderboardService';
import type { LocationPrecision } from '../lib/leaderboard/countries';

interface UseLeaderboardResult {
  isOptedIn: boolean;
  anonymousName: string | null;
  location: LeaderboardLocation;
  isLoading: boolean;
  leaderboard: LeaderboardEntry[];
  isLoadingLeaderboard: boolean;
  nudgeDismissed: boolean;
  myRankToday: number | null;
  myRankWeek: number | null;
  optIn: (location?: Partial<LeaderboardLocation>) => Promise<void>;
  optOut: () => Promise<void>;
  deleteLeaderboardData: () => Promise<void>;
  updateName: (name: string) => Promise<void>;
  randomizeName: () => Promise<void>;
  setLocation: (location: Partial<LeaderboardLocation>) => Promise<void>;
  refreshLeaderboard: (period?: 'today' | 'week', countryCode?: string) => Promise<void>;
  dismissNudge: () => Promise<void>;
}

const DEFAULT_LOCATION: LeaderboardLocation = {
  countryCode: '',
  regionLabel: '',
  cityLabel: '',
  locationPrecision: 'none',
};

export function useLeaderboard(): UseLeaderboardResult {
  const [isOptedIn, setIsOptedIn] = useState(false);
  const [anonymousName, setAnonymousName] = useState<string | null>(null);
  const [location, setLocationState] = useState<LeaderboardLocation>(DEFAULT_LOCATION);
  const [isLoading, setIsLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [myRankToday, setMyRankToday] = useState<number | null>(null);
  const [myRankWeek, setMyRankWeek] = useState<number | null>(null);

  const loadState = useCallback(async () => {
    const [opted, dismissed, loc] = await Promise.all([
      leaderboardService.isOptedIn(),
      leaderboardService.isNudgeDismissed(),
      leaderboardService.getLocation(),
    ]);
    setIsOptedIn(opted);
    setNudgeDismissed(dismissed);
    setLocationState(loc);
    if (opted) {
      const name = await leaderboardService.getOrCreateAnonymousName();
      setAnonymousName(name);
      const [rankToday, rankWeek] = await Promise.all([
        leaderboardService.getMyRank('today'),
        leaderboardService.getMyRank('week'),
      ]);
      setMyRankToday(rankToday);
      setMyRankWeek(rankWeek);
    } else {
      setAnonymousName(null);
      setMyRankToday(null);
      setMyRankWeek(null);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  const optIn = useCallback(async (loc?: Partial<LeaderboardLocation>) => {
    const { anonymousName: name } = await leaderboardService.optIn(loc);
    setIsOptedIn(true);
    setAnonymousName(name);
    const updatedLoc = await leaderboardService.getLocation();
    setLocationState(updatedLoc);
  }, []);

  const optOut = useCallback(async () => {
    await leaderboardService.optOut();
    setIsOptedIn(false);
  }, []);

  const deleteLeaderboardData = useCallback(async () => {
    await leaderboardService.deleteLeaderboardData();
    setIsOptedIn(false);
    setAnonymousName(null);
    setLocationState(DEFAULT_LOCATION);
    setMyRankToday(null);
    setMyRankWeek(null);
    setLeaderboard([]);
  }, []);

  const updateName = useCallback(async (name: string) => {
    await leaderboardService.updateAnonymousName(name);
    setAnonymousName(name.trim().toLowerCase().replace(/\s+/g, '-'));
  }, []);

  const randomizeName = useCallback(async () => {
    const newName = await leaderboardService.randomizeName();
    setAnonymousName(newName);
  }, []);

  const setLocation = useCallback(async (loc: Partial<LeaderboardLocation>) => {
    await leaderboardService.setLocation(loc);
    const updated = await leaderboardService.getLocation();
    setLocationState(updated);
  }, []);

  const refreshLeaderboard = useCallback(
    async (period: 'today' | 'week' = 'week', countryCode?: string) => {
      setIsLoadingLeaderboard(true);
      const entries = await leaderboardService.getLeaderboard(period, countryCode);
      setLeaderboard(entries);
      if (isOptedIn) {
        const [rankToday, rankWeek] = await Promise.all([
          leaderboardService.getMyRank('today'),
          leaderboardService.getMyRank('week'),
        ]);
        setMyRankToday(rankToday);
        setMyRankWeek(rankWeek);
      }
      setIsLoadingLeaderboard(false);
    },
    [isOptedIn],
  );

  const dismissNudge = useCallback(async () => {
    await leaderboardService.dismissNudge();
    setNudgeDismissed(true);
  }, []);

  return {
    isOptedIn,
    anonymousName,
    location,
    isLoading,
    leaderboard,
    isLoadingLeaderboard,
    nudgeDismissed,
    myRankToday,
    myRankWeek,
    optIn,
    optOut,
    deleteLeaderboardData,
    updateName,
    randomizeName,
    setLocation,
    refreshLeaderboard,
    dismissNudge,
  };
}
