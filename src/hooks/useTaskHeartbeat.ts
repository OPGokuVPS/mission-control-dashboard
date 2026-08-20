'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// Default 30-second ping interval
const DEFAULT_PING_INTERVAL_S = 30;

// ---------------------------------------------------------------------------
// useTaskHeartbeat — periodic heartbeat pinging hook
// --------------------------------------------------------------------------/

/**
 * Periodically pings POST /api/tasks/heartbeat while a task is active.
 *
 * @param taskId      - ID of the task to heartbeat. Pass null/0 to deactivate.
 * @param pingInterval - Seconds between pings (default 30).
 * @param isActive     - Whether the task should be considered "active" for
 *                       heartbeat purposes. Must match `status === 'active'`
 *                       AND task must have a start_time.
 */
export function useTaskHeartbeat(
    taskId: number | null,
    pingInterval: number = DEFAULT_PING_INTERVAL_S,
    isActive: boolean = false,
) {
    const [isAlive, setIsAlive] = useState(false);
    const [lastPing, setLastPing] = useState<string | null>(null);
    const [secondsSinceLastPing, setSecondsSinceLastPing] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const intervalIdRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const counterIdRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const pingFnRef = useRef<(() => void) | undefined>(undefined);

    // ── Core ping function ──────────────────────────────────────────────
    const doPing = useCallback(async () => {
        if (!taskId) return;
        try {
            const res = await fetch('/api/tasks/heartbeat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ task_id: taskId }),
            });

            if (!res.ok) {
                const errBody = await res.json().catch(() => ({}));
                setError(errBody.error ?? `HTTP ${res.status}`);
                setIsAlive(false);
                return;
            }

            const data = await res.json();
            setLastPing(data.last_ping ?? new Date().toISOString());
            setSecondsSinceLastPing(0);
            setError(null);
            setIsAlive(data.is_alive ?? true);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Ping failed');
        }
    }, [taskId]);

    // Keep ref up-to-date so intervals always call the latest closure
    useEffect(() => {
        pingFnRef.current = doPing;
    }, [doPing]);

    // ── Start / stop the interval ───────────────────────────────────────
    useEffect(() => {
        // Cleanup previous timers
        if (intervalIdRef.current) clearInterval(intervalIdRef.current);
        if (counterIdRef.current) clearInterval(counterIdRef.current);
        intervalIdRef.current = null;
        counterIdRef.current = null;

        if (!isActive || !taskId) {
            // Deactivate: reset all state
            setIsAlive(false);
            setLastPing(null);
            setSecondsSinceLastPing(0);
            return;
        }

        // First ping immediately
        doPing();

        // Then repeat every pingInterval seconds
        const intervalId = setInterval(doPing, pingInterval * 1000);
        intervalIdRef.current = intervalId;

        // Track elapsed seconds for UI display
        const counterId = setInterval(() => {
            setSecondsSinceLastPing((s) => s + 1);
        }, 1000);
        counterIdRef.current = counterId;

        return () => {
            clearInterval(intervalId);
            clearInterval(counterId);
        };
    }, [taskId, pingInterval, isActive, doPing]);

    return { isAlive, lastPing, secondsSinceLastPing, error };
}
