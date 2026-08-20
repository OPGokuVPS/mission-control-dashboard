import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import * as QUERY_KEYS from '@/lib/query-keys';
import type { AgentActivity } from '@/types';

// ---------------------------------------------------------------------------
// Real-time subscription for the agent_activity table — pushes Postgres
// changes directly into React Query's in-memory cache so components
// never flicker when agents log new activity.
// --------------------------------------------------------------------------/\

interface PayloadActivity {
    id: number;
    agent_name: string;
    agent_role: string;
    objective: string;
    actions: string[];
    tools_used?: string[];
    result?: string;
    outcome_quality?: 'high' | 'medium' | 'low';
    correction_applied?: boolean;
    status: string;
    created_at: string;
}

type ChangeType = 'INSERT' | 'UPDATE' | 'DELETE';

/**
 * Subscribe to real-time postgres_changes on the **agent_activity**
 * table.  New inserts trigger a full re-fetch of the recent activity
 * list (it's append-only so invalidation is cheap), while updates
 /  and deletes refresh whatever views may be showing them.
 */
export function useAgentActivitySubscription() {
    const qc = useQueryClient();
    const invalidateRef = useRef(qc.invalidateQueries.bind(qc));

    useEffect(() => {
        invalidateRef.current = qc.invalidateQueries.bind(qc);
    }, [qc]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const channel = supabase.channel('agent-activity-changes');

        channel
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'agent_activity' },
                (payload) => {
                    const type: ChangeType = payload.eventType as ChangeType;
                    const record = payload.new as PayloadActivity | null;

                    // Re-fetch recent activity so the UI picks up the new
                    // row immediately without waiting for the next poll cycle.
                    invalidateRef.current({ queryKey: ['agent_activity'] });

                    if (record && (type === 'INSERT' || type === 'UPDATE')) {
                        // Also refresh individual-activity queries in case
                        // some detail view is pinned on this ID.
                        invalidateRef.current({
                            predicate: (query) => {
                                const key = query.queryKey as unknown[];
                                return typeof key[0] === 'string' &&
                                       key[0].includes('agent_activity');
                            },
                        });
                    }
                },
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.debug('[useAgentActivitySubscription] subscribed');
                } else if (status === 'CHANNEL_ERROR') {
                    console.warn('[useAgentActivitySubscription] channel error');
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);
}
