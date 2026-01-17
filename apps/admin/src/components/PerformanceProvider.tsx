'use client';

import { useEffect } from 'react';

import { apiClient } from '../lib/api';
import { createPerformanceTrackedApiClient } from '../lib/performance';

interface PerformanceProviderProps {
  children: React.ReactNode;
}

export function PerformanceProvider({ children }: PerformanceProviderProps) {
  useEffect(() => {
    // Wrap API client with performance tracking
    createPerformanceTrackedApiClient(apiClient);

    // Log initial memory usage in development
    if (process.env.NODE_ENV === `development`) {
      // Use dynamic import to avoid issues in production
      import(`../lib/performance`).then(({ logMemoryUsage }) => {
        logMemoryUsage();

        // Log memory usage every 30 seconds in development
        const interval = setInterval(logMemoryUsage, 30000);
        return () => clearInterval(interval);
      });
    }
  }, []);

  return <>{children}</>;
}
