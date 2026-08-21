import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import * as QUERY_KEYS from '@/lib/query-keys';
import type { Task, Subtask } from '@/types';

// ---------------------------------------------------------------------------
// Real-time subscription for the tasks table — pushes Postgres changes
// directly into React Query's in-memory cache so components never flicker.
// --------------------------------------------------------------------------/\

interface PayloadTask {
    id: number;
    title: string;
    description?: string;
    status: string;
    priority: string;
    assigned_agent?: string;
    owner?: string;
    subtasks?: Subtask[];
    deadline?: string;
    impact_score?: number;
    created_at: string;
    updated_at?: string;
    tags?: unknown;
    linked_business_id?: number;
    created_by?: string;
}

type ChangeType = 'INSERT' | 'UPDATE' | 'DELETE';

/**
 * Subscribe to real-time postgres_changes on the **tasks** table.
 * Updates are merged into React Query cache (no stale-data flicker).
 */
export function useTasksSubscription() {
    const qc = useQueryClient();
    // Stable ref to the latest invalidateQueries so subscribers don't
    // close over a stale closure after React strict-mode double-mounts.
    const invalidateRef = useRef(qc.invalidateQueries.bind(qc));

    useEffect(() => {
        invalidateRef.current = qc.invalidateQueries.bind(qc);
    }, [qc]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const channel = supabase.channel('tasks-changes');
        let unsubscribed = false;

        // Set up listener BEFORE subscribing to avoid SDK race condition
        channel.on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'tasks' },
            (payload) => {
                const type: ChangeType = payload.eventType as ChangeType;
                const record = payload.new as PayloadTask | null;
                const oldId = (payload.old as Partial<PayloadTask>)?.id;

                switch (type) {
                    case 'INSERT':
                    case 'UPDATE': {
                        invalidateRef.current({ queryKey: QUERY_KEYS.tasks.all });
                        invalidateRef.current({ queryKey: QUERY_KEYS.task.byId(record!.id) });
                        break;
                    }
                    case 'DELETE': {
                        invalidateRef.current({ queryKey: QUERY_KEYS.tasks.all });
                        invalidateRef.current({ queryKey: QUERY_KEYS.task.byId(oldId! as number) });
                        break;
                    }
                }
            },
        );

        // Subscribe with error handling — failure here used to CRASH the entire app
        try {
            channel.subscribe((status) => {
                if (unsubscribed) return;
                if (status === 'SUBSCRIBED') {
                    console.debug('[useTasksSubscription] subscribed');
                } else if (status === 'CHANNEL_ERROR') {
                    console.warn('[useTasksSubscription] channel error');
                }
            });
        } catch (err) {
            console.error('[useTasksSubscription] realtime subscription failed:', err);
        }

        return () => {
            unsubscribed = true;
            channel.unsubscribe();
            supabase.removeChannel(channel);
        };
    }, []);
}
