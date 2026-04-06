import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';

interface SyncMetrics {
  lastSuccessfulPoll: Record<string, string>; // component -> ISO timestamp
  errorCounts: Record<string, number>;        // component -> count
  isOnline: boolean;
}

export function useSyncMetrics() {
  const [metrics, setMetrics] = useState<SyncMetrics>({
    lastSuccessfulPoll: {},
    errorCounts: {},
    isOnline: typeof window !== 'undefined' ? navigator.onLine : true,
  });

  // Update last successful poll for a component
  const markSuccess = (component: string) => {
    const now = new Date().toISOString();
    setMetrics((prev) => ({
      ...prev,
      lastSuccessfulPoll: { ...prev.lastSuccessfulPoll, [component]: now },
      errorCounts: { ...prev.errorCounts, [component]: 0 }, // reset errors on success
    }));
  };

  // Increment error count for a component
  const recordError = (component: string, error?: Error) => {
    setMetrics((prev) => ({
      ...prev,
      errorCounts: {
        ...prev.errorCounts,
        [component]: (prev.errorCounts[component] || 0) + 1,
      },
    }));

    // Log to errors table
    if (error) {
      supabase
        .from('errors')
        .insert({
          component,
          severity: 'error',
          message: error.message,
          details: {
            stack: error.stack,
            timestamp: new Date().toISOString(),
          },
        })
        .catch(() => {}); // Don't throw - we're already in error handling
    }
  };

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setMetrics((p) => ({ ...p, isOnline: true }));
    const handleOffline = () => setMetrics((p) => ({ ...p, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { metrics, markSuccess, recordError };
}
