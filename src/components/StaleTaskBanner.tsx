'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { LiveTimer } from './LiveTimer';

// ---------------------------------------------------------------------------
// StaleTaskBanner — visual indicator for stale/inactive tasks
// --------------------------------------------------------------------------/

interface StaleTaskItem {
    task_id: number;
    title: string;
    started_at: string;
    assigned_agent?: string | null;
    last_ping: string | null;
    seconds_since_ping?: number;
    reason: 'timeout' | 'no_heartbeat';
    warning: string;
}

interface StaleApiResponse {
    stale_tasks: StaleTaskItem[];
    total_stale: number;
    total_active_checked: number;
}

/** Storage key prefix for per-task dismissals */
const DISMISS_PREFIX = 'stale_banner_dismissed_';

/** How often to re-fetch stale tasks (ms) */
const REFRESH_INTERVAL_MS = 60_000;

export function StaleTaskBanner() {
    const [staleTasks, setStaleTasks] = useState<StaleTaskItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Track which task IDs have been dismissed this session
    const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set());

    // Fetch stale tasks
    const fetchStale = useCallback(async () => {
        try {
            const res = await fetch('/api/tasks/stale');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data: StaleApiResponse = await res.json();
            setStaleTasks(data.stale_tasks ?? []);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to fetch stale tasks');
        } finally {
            setLoading(false);
        }
    }, []);

    // Load on mount and refresh periodically
    useEffect(() => {
        fetchStale();
        const id = setInterval(fetchStale, REFRESH_INTERVAL_MS);
        return () => clearInterval(id);
    }, [fetchStale]);

    /** Dismiss a single stale task banner item */
    const handleDismiss = useCallback((taskId: number) => {
        setDismissedIds((prev) => new Set([...prev, taskId]));
    }, []);

    /** Dismiss all visible items */
    const handleDismissAll = useCallback(() => {
        setDismissedIds((prev) => {
            const next = new Set(prev);
            staleTasks.forEach((t) => next.add(t.task_id));
            return next;
        });
    }, [staleTasks]);

    // Filter out dismissed tasks
    const visibleTasks = staleTasks.filter((t) => !dismissedIds.has(t.task_id));

    // No stale tasks → nothing to render
    if (visibleTasks.length === 0 && loading) return null;

    return (
        <div className="rounded-xl border border-yellow-400/50 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-700/50 p-3 sm:p-4 animate-pulse-once shadow-sm">
            <div className="flex items-start gap-3">
                <span className="text-lg shrink-0 mt-0.5">⚠️</span>
                <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-300 mb-2">
                        {visibleTasks.length === 1
                            ? `${visibleTasks.length} task appears stale`
                            : `${visibleTasks.length} tasks appear stale`}
                    </h4>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {visibleTasks.map((task) => (
                            <div
                                key={task.task_id}
                                className="flex items-start justify-between gap-2 rounded-lg bg-white/60 dark:bg-slate-800/60 px-3 py-2 text-sm"
                            >
                                <div className="min-w-0 flex-1">
                                    <span className="font-medium text-slate-900 dark:text-white truncate block">
                                        {task.title}
                                    </span>
                                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        <LiveTimer startTime={task.started_at} />
                                        <span className="inline-block w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                                        <span className="capitalize">{task.reason}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDismiss(task.task_id)}
                                    className="shrink-0 text-xs text-slate-400 hover:text-red-500 transition-colors px-2 py-1 rounded"
                                    aria-label={`Dismiss alert for "${task.title}"`}
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>

                    {visibleTasks.length > 1 && (
                        <button
                            onClick={handleDismissAll}
                            className="mt-2 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                        >
                            Dismiss all
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
