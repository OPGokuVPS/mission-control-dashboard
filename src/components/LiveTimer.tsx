'use client';

import { useState, useEffect } from 'react';

// ---------------------------------------------------------------------------
// LiveTimer — displays elapsed time since task start
// --------------------------------------------------------------------------/

interface LiveTimerProps {
    startTime: string | null | undefined;
}

/**
 * Human-readable duration formatting.
 */
function formatDuration(totalSeconds: number): string {
    if (totalSeconds < 0) return '—';

    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts: string[] = [];

    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0 || parts.length > 0) parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);

    return parts.join(' ');
}

/**
 * Color class based on elapsed duration.
 */
function getTimerColorClass(totalSeconds: number): string {
    if (totalSeconds <= 0) return 'text-slate-500 dark:text-slate-400';
    if (totalSeconds < 7200) return 'text-green-500 dark:text-green-400';     // < 2h → green
    if (totalSeconds < 28800) return 'text-yellow-500 dark:text-yellow-400';   // 2h–8h → yellow
    if (totalSeconds < 86400) return 'text-orange-500 dark:text-orange-400';   // 8h–24h → orange
    return 'text-red-500 dark:text-red-400';                                    // > 24h → red
}

export function LiveTimer({ startTime }: LiveTimerProps) {
    const [elapsed, setElapsed] = useState(0);
    const [startTimeMs, setStartTimeMs] = useState<number | null>(null);

    // Compute start timestamp once
    useEffect(() => {
        if (!startTime) {
            setStartTimeMs(null);
            setElapsed(0);
            return;
        }
        const t = new Date(startTime).getTime();
        if (!isNaN(t)) {
            setStartTimeMs(t);
        }
    }, [startTime]);

    // Update every second
    useEffect(() => {
        if (startTimeMs === null) return;

        const tick = () => {
            const now = Date.now();
            setElapsed(Math.max(0, Math.floor((now - startTimeMs) / 1000)));
        };

        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [startTimeMs]);

    if (!startTime) {
        return <span className="text-xs font-mono text-slate-400 dark:text-slate-500">—</span>;
    }

    return (
        <span
            className={`text-xs font-mono ${getTimerColorClass(elapsed)}`}
            title={formatDuration(elapsed)}
        >
            {formatDuration(elapsed)}
        </span>
    );
}
