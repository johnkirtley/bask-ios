'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { sessionsRepository } from '../database/repositories/sessionsRepository';
import { supplementsRepository } from '../database/repositories/supplementsRepository';
import { labResultsRepository } from '../database/repositories/labResultsRepository';
import { cofactorsRepository } from '../database/repositories/cofactorsRepository';
import { userProfileRepository } from '../database/repositories/userProfileRepository';
import { settingsRepository } from '../database/repositories/settingsRepository';
import {
  resolveAge,
  resolveDailyGoal,
  resolveFitzpatrickType,
  resolveWeight,
} from '../profileUtils';
import { DEFAULT_DAILY_GOAL_IU } from '../constants';
import { OnboardingAnswers } from '../../types';

export type ReportPeriod = '30' | '90' | 'all';

interface ReportData {
  // Patient profile
  profile: {
    age: number | null;
    weight: number | null;
    weightUnit: string | null;
    fitzpatrickType: number;
    dailyGoal: number;
    bloodTestValue: number | null;
    bloodTestUnit: string | null;
    bloodTestDate: string | null;
    skinTone: string | null;
    eyeColor: string | null;
    sunReaction: string | null;
  };

  // Sun exposure summary
  sessions: {
    count: number;
    totalIU: number;
    avgDuration: number;
    avgUV: number;
    daysWithSessions: number;
  };

  // Supplement summary
  supplements: {
    count: number;
    totalIU: number;
    avgDailyIU: number;
  };

  // Cofactor compliance
  cofactors: {
    magnesiumDays: number;
    k2Days: number;
    totalDays: number;
  };

  // Consistency/streak
  consistency: {
    currentStreak: number;
    longestStreak: number;
    activeDays: number;
    totalDays: number;
  };

  // Weekly IU totals
  weeklyTotals: Array<{
    weekStart: string;
    sunIU: number;
    supplementIU: number;
    totalIU: number;
  }>;
}

/**
 * Calculate date range based on selected period
 */
function getDateRange(period: ReportPeriod): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();

  if (period === '30') {
    start.setDate(start.getDate() - 30);
  } else if (period === '90') {
    start.setDate(start.getDate() - 90);
  } else {
    // 'all' - use a very old date (10 years ago)
    start.setFullYear(start.getFullYear() - 10);
  }

  return { start, end };
}

/**
 * Calculate streaks from session dates
 */
function calculateStreaks(sessionDates: string[]): { current: number; longest: number } {
  if (sessionDates.length === 0) return { current: 0, longest: 0 };

  // Convert to date strings (YYYY-MM-DD)
  const dates = sessionDates
    .map(d => d.split('T')[0])
    .sort()
    .filter((v, i, arr) => arr.indexOf(v) === i); // unique dates

  let longestStreak = 1;
  let currentStreak = 1;

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // Calculate longest streak
  for (let i = 1; i < dates.length; i++) {
    const prevDate = new Date(dates[i - 1]);
    const currDate = new Date(dates[i]);
    const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / 86400000);

    if (diffDays === 1) {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }

  // Calculate current streak (must include today or yesterday)
  currentStreak = 0;
  if (dates.includes(today) || dates.includes(yesterday)) {
    const startDate = dates.includes(today) ? today : yesterday;
    let checkDate = new Date(startDate);

    while (dates.includes(checkDate.toISOString().split('T')[0])) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
  }

  return { current: currentStreak, longest: longestStreak };
}

/**
 * Aggregate data into weekly buckets
 */
function aggregateWeeklyData(sessions: any[], supplements: any[]): ReportData['weeklyTotals'] {
  const weekMap = new Map<string, { sunIU: number; supplementIU: number }>();

  // Aggregate sessions
  sessions.forEach(s => {
    const date = new Date(s.started_at);
    const weekStart = getWeekStart(date);
    const existing = weekMap.get(weekStart) || { sunIU: 0, supplementIU: 0 };
    existing.sunIU += s.iu_gained || 0;
    weekMap.set(weekStart, existing);
  });

  // Aggregate supplements
  supplements.forEach(s => {
    const date = new Date(s.logged_at);
    const weekStart = getWeekStart(date);
    const existing = weekMap.get(weekStart) || { sunIU: 0, supplementIU: 0 };
    existing.supplementIU += s.dosage_iu || 0;
    weekMap.set(weekStart, existing);
  });

  // Convert to array and sort
  return Array.from(weekMap.entries())
    .map(([weekStart, data]) => ({
      weekStart,
      sunIU: data.sunIU,
      supplementIU: data.supplementIU,
      totalIU: data.sunIU + data.supplementIU,
    }))
    .sort((a, b) => b.weekStart.localeCompare(a.weekStart)); // newest first
}

/**
 * Get the Monday of the week for a given date (ISO week)
 */
function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

function parseOnboardingData(raw: string | null): {
  answers: OnboardingAnswers | null;
} | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed?.answers ? parsed : { answers: parsed };
  } catch {
    return null;
  }
}

const EMPTY_REPORT_DATA: ReportData = {
  profile: {
    age: null,
    weight: null,
    weightUnit: null,
    fitzpatrickType: 2,
    dailyGoal: DEFAULT_DAILY_GOAL_IU,
    bloodTestValue: null,
    bloodTestUnit: null,
    bloodTestDate: null,
    skinTone: null,
    eyeColor: null,
    sunReaction: null,
  },
  sessions: {
    count: 0,
    totalIU: 0,
    avgDuration: 0,
    avgUV: 0,
    daysWithSessions: 0,
  },
  supplements: { count: 0, totalIU: 0, avgDailyIU: 0 },
  cofactors: { magnesiumDays: 0, k2Days: 0, totalDays: 0 },
  consistency: {
    currentStreak: 0,
    longestStreak: 0,
    activeDays: 0,
    totalDays: 0,
  },
  weeklyTotals: [],
};

/**
 * Collect all data needed for the report
 */
async function collectReportData(period: ReportPeriod): Promise<ReportData> {
  const { start, end } = getDateRange(period);
  const startISO = start.toISOString();
  const endISO = end.toISOString();

  let sessions: Awaited<ReturnType<typeof sessionsRepository.getByDateRange>> = [];
  let supplements: Awaited<ReturnType<typeof supplementsRepository.getByDateRange>> = [];
  let cofactors: Awaited<ReturnType<typeof cofactorsRepository.getByDateRange>> = [];
  let userProfile: Awaited<ReturnType<typeof userProfileRepository.get>> = null;
  let latestLab: Awaited<ReturnType<typeof labResultsRepository.getLatest>> = null;
  let onboardingAnswers: OnboardingAnswers | null = null;

  try {
    [sessions, supplements, cofactors, userProfile, latestLab] = await Promise.all([
      sessionsRepository.getByDateRange(startISO, endISO),
      supplementsRepository.getByDateRange(startISO, endISO),
      cofactorsRepository.getByDateRange(startISO, endISO),
      userProfileRepository.get(),
      labResultsRepository.getLatest(),
    ]);
  } catch (error) {
    console.error('Failed to fetch report data:', error);
    return { ...EMPTY_REPORT_DATA };
  }

  try {
    const onboardingData = await settingsRepository.get('onboarding');
    onboardingAnswers = parseOnboardingData(onboardingData)?.answers ?? null;
  } catch (error) {
    console.warn('Failed to parse onboarding data for report:', error);
  }

  // Calculate total days in period
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / 86400000);

  // Sessions summary
  const totalSessionIU = sessions.reduce((sum, s) => sum + (s.iu_gained || 0), 0);
  const avgDuration = sessions.length > 0
    ? sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / sessions.length
    : 0;
  const avgUV = sessions.length > 0
    ? sessions.reduce((sum, s) => sum + (s.uv_index || 0), 0) / sessions.length
    : 0;

  const sessionDates = sessions.map(s => s.started_at);
  const uniqueSessionDates = Array.from(new Set(sessionDates.map(d => d.split('T')[0])));

  // Supplements summary
  const totalSupplementIU = supplements.reduce((sum, s) => sum + (s.dosage_iu || 0), 0);
  const avgDailySupplementIU = totalDays > 0 ? totalSupplementIU / totalDays : 0;

  // Cofactor compliance
  const magnesiumDays = new Set(
    cofactors
      .filter(c => c.cofactor_type === 'magnesium')
      .map(c => c.logged_at.split('T')[0])
  ).size;

  const k2Days = new Set(
    cofactors
      .filter(c => c.cofactor_type === 'vitamin_k2')
      .map(c => c.logged_at.split('T')[0])
  ).size;

  // Streaks
  const streaks = calculateStreaks(sessionDates);

  // Active days (days with any activity)
  const allActivityDates = new Set(
    sessionDates.map(d => d.split('T')[0]).concat(
      supplements.map(s => s.logged_at.split('T')[0])
    )
  );

  // Weekly aggregation
  const weeklyTotals = aggregateWeeklyData(sessions, supplements);

  const { weight, unit: weightUnit } = resolveWeight(userProfile, onboardingAnswers);

  return {
    profile: {
      age: resolveAge(userProfile, onboardingAnswers),
      weight,
      weightUnit,
      fitzpatrickType: resolveFitzpatrickType(userProfile, onboardingAnswers),
      dailyGoal: resolveDailyGoal(userProfile),
      bloodTestValue:
        latestLab?.entered_value ?? onboardingAnswers?.bloodTestValue ?? null,
      bloodTestUnit:
        latestLab?.entered_unit ?? onboardingAnswers?.bloodTestUnit ?? null,
      bloodTestDate:
        latestLab?.test_date ?? onboardingAnswers?.bloodTestDate ?? null,
      skinTone: onboardingAnswers?.skinTone ?? null,
      eyeColor: onboardingAnswers?.eyeColor ?? null,
      sunReaction: onboardingAnswers?.sunReaction ?? null,
    },
    sessions: {
      count: sessions.length,
      totalIU: totalSessionIU,
      avgDuration: Math.round(avgDuration),
      avgUV: Math.round(avgUV * 10) / 10,
      daysWithSessions: uniqueSessionDates.length,
    },
    supplements: {
      count: supplements.length,
      totalIU: totalSupplementIU,
      avgDailyIU: Math.round(avgDailySupplementIU),
    },
    cofactors: {
      magnesiumDays,
      k2Days,
      totalDays,
    },
    consistency: {
      currentStreak: streaks.current,
      longestStreak: streaks.longest,
      activeDays: allActivityDates.size,
      totalDays,
    },
    weeklyTotals,
  };
}

/**
 * Format date for display
 */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Get Fitzpatrick type label
 */
function getFitzpatrickLabel(type: number): string {
  const labels = {
    1: 'I (Very Fair)',
    2: 'II (Fair)',
    3: 'III (Medium)',
    4: 'IV (Olive)',
    5: 'V (Brown)',
    6: 'VI (Dark Brown/Black)',
  };
  return labels[type as keyof typeof labels] || `Type ${type}`;
}

/**
 * Generate the PDF report
 */
export async function generatePhysicianReport(period: ReportPeriod): Promise<Blob> {
  let data: ReportData;
  try {
    data = await collectReportData(period);
  } catch (error) {
    console.error('Failed to collect report data:', error);
    throw new Error('Unable to generate report. Please try again.');
  }

  // Create PDF
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Bask Vitamin D Report', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const periodLabel = period === '30' ? 'Last 30 Days' : period === '90' ? 'Last 90 Days' : 'All Time';
  doc.text(`Generated: ${formatDate(new Date().toISOString())}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 5;
  doc.text(`Period: ${periodLabel}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // Patient Profile Section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('PATIENT PROFILE', 14, yPos);
  yPos += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const profileLines = [];
  if (data.profile.age !== null || data.profile.weight !== null) {
    let line = '';
    if (data.profile.age !== null) line += `Age: ${data.profile.age}`;
    if (data.profile.weight !== null) {
      if (line) line += ' | ';
      line += `Weight: ${data.profile.weight} ${data.profile.weightUnit || 'lbs'}`;
    }
    profileLines.push(line);
  }
  profileLines.push(`Skin Type: Fitzpatrick ${getFitzpatrickLabel(data.profile.fitzpatrickType)}`);
  profileLines.push(`Daily Goal: ${data.profile.dailyGoal.toLocaleString()} IU`);

  if (data.profile.bloodTestValue !== null) {
    profileLines.push(
      `Blood 25(OH)D: ${data.profile.bloodTestValue} ${data.profile.bloodTestUnit || 'ng/mL'}`
    );
    if (data.profile.bloodTestDate) {
      profileLines.push(`  (drawn: ${formatDate(data.profile.bloodTestDate)})`);
    }
  }

  profileLines.forEach(line => {
    doc.text(line, 14, yPos);
    yPos += 5;
  });
  yPos += 5;

  // Sun Exposure Summary
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('SUN EXPOSURE SUMMARY', 14, yPos);
  yPos += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Sessions: ${data.sessions.count} | Days with sessions: ${data.sessions.daysWithSessions}`, 14, yPos);
  yPos += 5;
  doc.text(`Total IU (sun): ${data.sessions.totalIU.toLocaleString()}`, 14, yPos);
  yPos += 5;
  doc.text(`Avg session duration: ${Math.round(data.sessions.avgDuration / 60)} minutes`, 14, yPos);
  yPos += 5;
  doc.text(`Avg UV index: ${data.sessions.avgUV}`, 14, yPos);
  yPos += 8;

  // Supplement Summary
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('SUPPLEMENT SUMMARY', 14, yPos);
  yPos += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Doses logged: ${data.supplements.count}`, 14, yPos);
  yPos += 5;
  doc.text(`Total IU (supplements): ${data.supplements.totalIU.toLocaleString()}`, 14, yPos);
  yPos += 5;
  doc.text(`Avg daily: ${data.supplements.avgDailyIU.toLocaleString()} IU`, 14, yPos);
  yPos += 8;

  // Cofactor Compliance
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('COFACTOR COMPLIANCE', 14, yPos);
  yPos += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const mgPercent = data.cofactors.totalDays > 0
    ? Math.round((data.cofactors.magnesiumDays / data.cofactors.totalDays) * 100)
    : 0;
  const k2Percent = data.cofactors.totalDays > 0
    ? Math.round((data.cofactors.k2Days / data.cofactors.totalDays) * 100)
    : 0;
  doc.text(`Magnesium: ${data.cofactors.magnesiumDays}/${data.cofactors.totalDays} days (${mgPercent}%)`, 14, yPos);
  yPos += 5;
  doc.text(`Vitamin K2: ${data.cofactors.k2Days}/${data.cofactors.totalDays} days (${k2Percent}%)`, 14, yPos);
  yPos += 8;

  // Consistency
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('CONSISTENCY', 14, yPos);
  yPos += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Current streak: ${data.consistency.currentStreak} days`, 14, yPos);
  yPos += 5;
  doc.text(`Longest streak: ${data.consistency.longestStreak} days`, 14, yPos);
  yPos += 5;
  const activePercent = data.consistency.totalDays > 0
    ? Math.round((data.consistency.activeDays / data.consistency.totalDays) * 100)
    : 0;
  doc.text(`Active days: ${data.consistency.activeDays}/${data.consistency.totalDays} (${activePercent}%)`, 14, yPos);
  yPos += 10;

  // Weekly IU Totals (table)
  if (data.weeklyTotals.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('WEEKLY IU TOTALS', 14, yPos);
    yPos += 5;

    autoTable(doc, {
      startY: yPos,
      head: [['Week of', 'Sun IU', 'Supplement IU', 'Total IU']],
      body: data.weeklyTotals.slice(0, 12).map(w => [
        formatDate(w.weekStart),
        w.sunIU.toLocaleString(),
        w.supplementIU.toLocaleString(),
        w.totalIU.toLocaleString(),
      ]),
      theme: 'striped',
      headStyles: { fillColor: [141, 169, 152] }, // sage color
      styles: { fontSize: 9 },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // Medical Disclaimer
  const disclaimerY = doc.internal.pageSize.getHeight() - 20;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text('⚠ This report is generated by Bask and is not medical advice.', pageWidth / 2, disclaimerY, {
    align: 'center',
  });
  doc.text('Please consult with your healthcare provider for medical guidance.', pageWidth / 2, disclaimerY + 5, {
    align: 'center',
  });

  return doc.output('blob');
}
