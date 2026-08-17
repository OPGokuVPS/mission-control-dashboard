import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import * as QUERY_KEYS from '@/lib/query-keys';
import type { CostRecord } from '@/types';

export function useCostTracking(limit = 100) {
    return useQuery({
        queryKey: QUERY_KEYS.costs.recent(limit),
        queryFn: async () => {
            const { data, error } = await supabase
                .from('cost_tracking')
                .select('*')
                .order('recorded_at', { ascending: false })
                .limit(limit);
            if (error) throw error;
            return data as CostRecord[];
        },
        staleTime: 30_000,
    });
}