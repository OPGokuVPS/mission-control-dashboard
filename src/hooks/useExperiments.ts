import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import * as QUERY_KEYS from '@/lib/query-keys';
import type { Experiment, ExperimentStatus, ExperimentDecision } from '@/types';

export function useExperiments(status?: ExperimentStatus | null) {
    const filters: Record<string, unknown> = {};
    if (status) filters.status = status;

    return useQuery({
        queryKey: QUERY_KEYS.experiments.byStatus(status),
        queryFn: async () => {
            let q = supabase.from('experiments').select('*');
            Object.entries(filters).forEach(([key, val]) => {
                q = (q as any).eq(key, val);
            });
            const { data, error } = await q.order('created_at', { ascending: false });
            if (error) throw error;
            return data as Experiment[];
        },
        staleTime: 15_000,
    });
}

export function useCreateExperiment() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (payload: Omit<Experiment, 'id' | 'created_at'>) => {
            const { data, error } = await supabase.from('experiments').insert([{ ...payload, status: 'running' }]).select().single();
            if (error) throw error;
            return data as Experiment;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: QUERY_KEYS.experiments.all });
        },
    });
}

export function useUpdateExperiment() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...updates }: { id: number } & Partial<Omit<Experiment, 'id'>>) => {
            const { data, error } = await supabase.from('experiments').update(updates).eq('id', id).select().single();
            if (error) throw error;
            return data as Experiment;
        },
        onSuccess: (_, vars) => {
            qc.invalidateQueries({ queryKey: QUERY_KEYS.experiments.all });
        },
    });
}