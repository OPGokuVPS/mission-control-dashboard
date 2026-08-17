'use client';

import { useEffect, useState } from 'react';

export function SyncStatusBar() {
    const [isOnline, setIsOnline] = useState(true);
    const [lastSync, setLastSync] = useState(Date.now());

    useEffect(() => {
        function handleOnline() { setIsOnline(true); setLastSync(Date.now()); }
        function handleOffline() { setIsOnline(false); }

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Track sync interval
        const interval = setInterval(() => setLastSync(Date.now()), 10000);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(interval);
        };
    }, []);

    const isStale = !isOnline || Date.now() - lastSync > 60000; // 1 minute threshold

    if (isStale) {
        return (
            <div className={`fixed bottom-4 left-4 z-50 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 shadow-lg border ${
                isOnline
                    ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700'
                    : 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700'
            }`}>
                <span>{isOnline ? '⚠️' : '📴'}</span>
                {isOnline ? `Stale (${Math.round((Date.now() - lastSync) / 1000)}s)` : 'Offline — re-syncing...'}
            </div>
        );
    }

    return null; // Don't show when everything is fine
}