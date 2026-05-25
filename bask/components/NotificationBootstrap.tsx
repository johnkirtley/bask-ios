'use client';

import { useEffect } from 'react';
import { notificationService } from '../lib/services/notificationService';

export default function NotificationBootstrap() {
  useEffect(() => {
    void notificationService.registerHandlers();
  }, []);

  return null;
}
