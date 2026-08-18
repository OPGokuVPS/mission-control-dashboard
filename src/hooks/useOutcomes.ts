import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import * as QUERY_KEYS from '@/lib/query-keys';
import type { Outcome, MetricCategory } from '@/types';

export function useOutcomes(metricCategory?: MetricCategory | null) {
    const filters: Record<string, unknown> = {};
    if (metricCategory) filters.metric_type = metricCategory;

    return useQuery({
        queryKey: metricCategory ? QUERY_KEYS.outcomes.byMetric(metricCategory) : QUERY_KEYS.outcomes.all,
        queryFn: async () => {
            let q = supabase.from('outcomes').select('*');
            Object.entries(filters).forEach(([key, val]) => {
                q = (q as any).eq(key, val);
            });
            const { data, error } = await q.order('measured_at', { ascending: false });
            if (error) throw error;
            return data as Outcome[];
        },
        staleTime: 30_000,
    });
}

export function useRecordOutcome() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (payload: Omit<Outcome, 'id'>) => {
            const { data, error } = await supabase.from('outcomes').insert([payload]).select().single();
            if (error) throw error;
            return data as Outcome;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: QUERY_KEYS.outcomes.all });
        },
        onError: (err) => console.error('useRecordOutcome failed:', err),
    });
}