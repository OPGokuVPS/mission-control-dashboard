import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import * as QUERY_KEYS from '@/lib/query-keys';
import type { AgentActivity } from '@/types';

export function useAgentActivity(limit = 50) {
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