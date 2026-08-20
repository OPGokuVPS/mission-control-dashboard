'use client';

import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import * as QUERY_KEYS from '@/lib/query-keys';
import type { AgentActivity } from '@/types';

export function useAgentActivity(limit = 50) {
    const qc = useQueryClient();

    // ── Real-time subscription — pushes new activity into cache ──
    const invalidateRef = useRef(qc.invalidateQueries.bind(qc));
    useEffect(() => { invalidateRef.current = qc.invalidateQueries.bind(qc); }, [qc]);
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const channel = supabase.channel('agent-activity-changes');
        channel
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'agent_activity' },
                (_payload) => {
                    // Re-fetch recent activity so the feed stays current.
                    invalidateRef.current({ queryKey: ['agent_activity'] });
                },
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') console.debug('[useAgentActivity] real-time sub OK');
                if (status === 'CHANNEL_ERROR') console.warn('[useAgentActivity] real-time sub error');
            });
        return () => { supabase.removeChannel(channel); };
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
    // Placeholder — actual recording will be done by agent system
    return { mutateAsync: async (_data: Partial<AgentActivity>) => { return _data; } };
}