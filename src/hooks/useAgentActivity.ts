'use client';

import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { subscribeToChanges } from '@/lib/realtime';
import * as QUERY_KEYS from '@/lib/query-keys';
import type { AgentActivity } from '@/types';

export function useAgentActivity(limit = 50) {
    const qc = useQueryClient();

    // ── Real-time subscription — pushes new activity into cache ──
    // Uses the shared realtime singleton (one 'agent-activity-changes' channel
    // for the whole app, no duplicate-channel crash).
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const unsubscribe = subscribeToChanges('agent-activity-changes', 'agent_activity', () => {
            qc.invalidateQueries({ queryKey: ['agent_activity'] });
        });
        return () => { unsubscribe(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return useQuery({
        queryKey: QUERY_KEYS.agentActivity.recent(limit),
        queryFn: async () => {
            const { data, error } = await supabase
                .from('agent_activity')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);
            if (error) throw error;
            return data as AgentActivity[];
        },
        staleTime: 5_000,
        refetchInterval: 5_000, // Poll every 5 seconds for real-time feel
    });
}

export function useRecordActivity() {
    return { mutateAsync: async (_data: Partial<AgentActivity>) => { return _data; } };
}
