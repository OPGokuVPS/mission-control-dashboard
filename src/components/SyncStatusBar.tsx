"use client";

import { useSyncMetrics } from '@/hooks/useSyncMetrics';

export function SyncStatusBar() {
  const { metrics } = useSyncMetrics();
  const hasErrors = Object.values(metrics.errorCounts).some((c) => c > 0);
  const lastPoll = Object.values(metrics.lastSuccessfulPoll).sort().pop() || 'Never';

  const getStaleness = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    return `${min}m ago`;
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white border rounded-lg shadow-lg p-3 text-xs z-50 max-w-xs">
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-2 h-2 rounded-full ${metrics.isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="font-semibold">Sync Status</span>
      </div>
      <div className="space-y-1 text-gray-600">
        <div className="flex justify-between">
          <span>Network:</span>
          <span className={metrics.isOnline ? 'text-green-600' : 'text-red-600'}>
            {metrics.isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Last poll:</span>
          <span title={lastPoll}>{getStaleness(lastPoll)}</span>
        </div>
        <div className="flex justify-between">
          <span>Errors (24h):</span>
          <span className={hasErrors ? 'text-red-600 font-bold' : 'text-green-600'}>
            {Object.values(metrics.errorCounts).reduce((a, b) => a + b, 0)}
          </span>
        </div>
        {hasErrors && (
          <div className="mt-2 pt-2 border-t text-red-600">
            Failing components:{' '}
            {Object.entries(metrics.errorCounts)
              .filter(([, c]) => c > 0)
              .map(([c]) => c)
              .join(', ')}
          </div>
        )}
      </div>
    </div>
  );
}
