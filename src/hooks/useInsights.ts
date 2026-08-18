import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import * as QUERY_KEYS from '@/lib/query-keys';
import type { Insight, MetricCategory, ImpactLevel } from '@/types';

export function useInsights(category?: MetricCategory | null) {
    const filters: Record<string, unknown> = {};
    if (category) filters.category = category;

    return useQuery({
        queryKey: QUERY_KEYS.insights.byCategory(category),
        queryFn: async () => {
            let q = supabase.from('insights').select('*');
            Object.entries(filters).forEach(([key, val]) => {
                q = (q as any).eq(key, val);
            });
            const { data, error } = await q.order('created_at', { ascending: false });
            if (error) throw error;
            return data as Insight[];
        },
        staleTime: 30_000,
    });
}

export function useAddInsight() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (payload: Omit<Insight, 'id' | 'created_at'>) => {
            const { data, error } = await supabase.from('insights').insert([payload]).select().single();
            if (error) throw error;
            return data as Insight;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: QUERY_KEYS.insights.all });
        },
        onError: (err) => console.error('useAddInsight failed:', err),
    });
}