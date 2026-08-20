'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as QUERY_KEYS from '@/lib/query-keys';
import type { Task } from '@/types';

// ---------------------------------------------------------------------------
// useTaskStartStop — React hooks for starting and stopping task work
// --------------------------------------------------------------------------/

const ACTIVE_STATUSES = ['active', 'backlog'];

// ── Cache key helpers ────────────────────────────────────────────────────────
function invalidateQueries(qc: ReturnType<typeof useQueryClient>) {
    qc.invalidateQueries({ queryKey: QUERY_KEYS.tasks.all });
}

// ── useTaskStart hook ────────────────────────────────────────────────────────
export function useTaskStart() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async ({ taskId }: { taskId: number }) => {
            const res = await fetch('/api/tasks/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ task_id: taskId }),
            });

            if (!res.ok) {
                const errBody = await res.json().catch(() => ({}));
                throw new Error(errBody.error ?? `HTTP ${res.status}`);
            }

            return (await res.json()) as Task;
        },
        // Optimistic UI: immediately update card state before server response
        onMutate: async ({ taskId }) => {
            // Cancel outgoing refetches so we don't overwrite the optimistic update
            await qc.cancelQueries({ queryKey: QUERY_KEYS.tasks.all });

            // Snapshot the current cache
            const previousTasks = qc.getQueryData<Task[]>(QUERY_KEYS.tasks.all);

            // Optimistically update the task to reflect start_time
            if (previousTasks) {
                const now = new Date().toISOString();
                qc.setQueryData<Task[]>(QUERY_KEYS.tasks.all, (prev = []) =>
                    prev.map((t) =>
                        t.id === taskId ? { ...t, status: 'active', start_time: now } : t,
                    ),
                );
            }

            return { previousTasks };
        },
        onError: (_err, _vars, context) => {
            // Rollback to snapshot on failure
            if (context?.previousTasks != null) {
                qc.setQueryData(QUERY_KEYS.tasks.all, context.previousTasks);
            }
        },
        onSettled: () => {
            invalidateQueries(qc);
        },
    });
}

// ── useTaskStop hook ─────────────────────────────────────────────────────────
export function useTaskStop() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: async ({ taskId }: { taskId: number }) => {
            const res = await fetch('/api/tasks/stop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ task_id: taskId }),
            });

            if (!res.ok) {
                const errBody = await res.json().catch(() => ({}));
                throw new Error(errBody.error ?? `HTTP ${res.status}`);
            }

            return res.json() as Promise<Task & { duration_ms: number }>;
        },
        onMutate: async ({ taskId }) => {
            await qc.cancelQueries({ queryKey: QUERY_KEYS.tasks.all });

            const previousTasks = qc.getQueryData<Task[]>(QUERY_KEYS.tasks.all);

            if (previousTasks) {
                const now = new Date().toISOString();
                qc.setQueryData<Task[]>(QUERY_KEYS.tasks.all, (prev = []) =>
                    prev.map((t) =>
                        t.id === taskId
                            ? { ...t, status: 'done', end_time: now }
                            : t,
                    ),
                );
            }

            return { previousTasks };
        },
        onError: (_err, _vars, context) => {
            if (context?.previousTasks != null) {
                qc.setQueryData(QUERY_KEYS.tasks.all, context.previousTasks);
            }
        },
        onSettled: () => {
            invalidateQueries(qc);
        },
    });
}
