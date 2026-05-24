'use client';

import { useState } from 'react';
import { IonActionSheet } from '@ionic/react';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { generatePhysicianReport, ReportPeriod } from '../../lib/services/physicianReportService';

const DownloadIcon = () => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    className='w-5 h-5'>
    <path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' />
    <polyline points='7 10 12 15 17 10' />
    <line x1='12' y1='15' x2='12' y2='3' />
  </svg>
);

const ChevronRightIcon = () => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    viewBox='0 0 24 24'
    fill='currentColor'
    className='w-5 h-5'>
    <path
      fillRule='evenodd'
      d='M16.28 11.47a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 01-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 011.06-1.06l7.5 7.5z'
      clipRule='evenodd'
    />
  </svg>
);

interface ExportPhysicianReportProps {
  className?: string;
}

export default function ExportPhysicianReport({ className = '' }: ExportPhysicianReportProps) {
  const [showPeriodSelector, setShowPeriodSelector] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleExport = async (period: ReportPeriod) => {
    setIsGenerating(true);
    try {
      // Generate the PDF
      const pdfBlob = await generatePhysicianReport(period);

      const periodLabel = period === '30' ? 'Last_30_Days' : period === '90' ? 'Last_90_Days' : 'All_Time';
      const fileName = `Bask_Vitamin_D_Report_${periodLabel}_${new Date().toISOString().split('T')[0]}.pdf`;

      if (Capacitor.isNativePlatform()) {
        // Convert blob to base64
        const reader = new FileReader();
        reader.readAsDataURL(pdfBlob);
        reader.onloadend = async () => {
          const base64Data = (reader.result as string).split(',')[1];

          // Write to filesystem
          const savedFile = await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Cache,
          });

          // Share the file using the native share sheet
          await Share.share({
            title: 'Bask Vitamin D Report',
            text: 'My vitamin D tracking report from Bask',
            url: savedFile.uri,
            dialogTitle: 'Share Report with Physician',
          });
        };
      } else {
        // Web fallback: trigger download
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setIsGenerating(false);
      setShowPeriodSelector(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowPeriodSelector(true)}
        disabled={isGenerating}
        className={`w-full p-4 flex items-center gap-3 text-left active:bg-black/5 transition-all disabled:opacity-50 ${className}`}>
        <span className='text-text-secondary'>
          <DownloadIcon />
        </span>
        <div className='flex-1'>
          <span className='text-text-primary'>
            {isGenerating ? 'Generating Report...' : 'Export for Physician'}
          </span>
          <p className='text-xs text-text-secondary'>
            Generate PDF report with vitamin D data
          </p>
        </div>
        <span className='text-text-primary/40'>
          <ChevronRightIcon />
        </span>
      </button>

      {/* Period Selection Action Sheet */}
      <IonActionSheet
        isOpen={showPeriodSelector}
        onDidDismiss={() => setShowPeriodSelector(false)}
        header='Select Report Period'
        buttons={[
          {
            text: 'Last 30 Days',
            handler: () => handleExport('30'),
          },
          {
            text: 'Last 90 Days',
            handler: () => handleExport('90'),
          },
          {
            text: 'All Time',
            handler: () => handleExport('all'),
          },
          {
            text: 'Cancel',
            role: 'cancel',
          },
        ]}
      />
    </>
  );
}
