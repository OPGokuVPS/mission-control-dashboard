import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import * as QUERY_KEYS from '@/lib/query-keys';
import type { Workflow, AgentRole } from '@/types';

export function useWorkflows(status?: string | null) {
    const filters: Record<string, unknown> = {};
    if (status) filters.status = status;

    return useQuery({
        queryKey: QUERY_KEYS.workflows.byStatus(status),
        queryFn: async () => {
            let q = supabase.from('workflows').select('*');
            for (const [key, val] of Object.entries(filters)) {
                q = q.eq(key, val as string);
            }
            const { data, error } = await q.order('created_at', { ascending: false });
            if (error) throw error;
            return data as Workflow[];
        },
        staleTime: 15_000,
    });
}

export function useCreateWorkflow() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (payload: Omit<Workflow, 'id' | 'created_at'>) => {
            const { data, error } = await supabase.from('workflows').insert([payload]).select().single();
            if (error) throw error;
            return data as Workflow;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: QUERY_KEYS.workflows.all });
        },
        onError: (err) => console.error('useCreateWorkflow failed:', err),
    });
}

export function useUpdateWorkflow() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...updates }: { id: number } & Partial<Omit<Workflow, 'id'>>) => {
            const { data, error } = await supabase.from('workflows').update(updates).eq('id', id).select().single();
            if (error) throw error;
            return data as Workflow;
        },
        onSuccess: (_, vars) => {
            qc.invalidateQueries({ queryKey: QUERY_KEYS.workflows.all });
        },
        onError: (err) => console.error('useUpdateWorkflow failed:', err),
    });
}