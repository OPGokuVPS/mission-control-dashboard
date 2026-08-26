'use client';

import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import * as QUERY_KEYS from '@/lib/query-keys';
import type { AgentActivity } from '@/types';

export function useAgentActivity(limit = 50) {
    const qc = useQueryClient();
    const invalidateRef = useRef(qc.invalidateQueries.bind(qc));
    useEffect(() => { invalidateRef.current = qc.invalidateQueries.bind(qc); }, [qc]);

    // ── Real-time subscription — pushes new activity into cache ──
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const channel = supabase.channel('agent-activity-changes');

        // Set up listener BEFORE subscribing
        channel.on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'agent_activity' },
            (_payload) => {
                invalidateRef.current({ queryKey: ['agent_activity'] });
            },
        );

        // Subscribe with error handling
        try {
            channel.subscribe((status) => {
                if (status === 'SUBSCRIBED') console.debug('[useAgentActivity] real-time sub OK');
                if (status === 'CHANNEL_ERROR') console.warn('[useAgentActivity] real-time sub error');
            });
        } catch (err) {
            console.error('[useAgentActivity] realtime subscription failed:', err);
        }

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
    return { mutateAsync: async (_data: Partial<AgentActivity>) => { return _data; } };
}
