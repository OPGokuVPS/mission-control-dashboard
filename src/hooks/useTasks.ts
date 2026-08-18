import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import * as QUERY_KEYS from '@/lib/query-keys';
import type { Task, TaskStatus, PriorityLevel, AgentRole, Subtask } from '@/types';

// ---------------------------------------------------------------------------
// Tasks Hook — central source of truth for all task data
// --------------------------------------------------------------------------/

export function useTasks() {
    return useQuery({
        queryKey: QUERY_KEYS.tasks.all,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data as Task[];
        },
        staleTime: 10_000,
        refetchOnWindowFocus: 'always',
    });
}

export function useTask(id: number | null) {
    return useQuery({
        queryKey: id ? QUERY_KEYS.task.byId(id) : ['task', 'noop'],
        queryFn: async () => {
            if (!id) return null;
            const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .eq('id', id)
                .maybeSingle();
            if (error) throw error;
            return data as Task | null;
        },
        enabled: id !== null && id !== undefined,
    });
}

export function useCreateTask() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (payload: Omit<Task, 'id' | 'created_at'>) => {
            const { data, error } = await supabase
                .from('tasks')
                .insert([payload])
                .select()
                .single();
            if (error) throw error;
            return data as Task;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: QUERY_KEYS.tasks.all });
        },
    });
}

export function useUpdateTask() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...updates }: { id: number } & Partial<Omit<Task, 'id'>>) => {
            const { data, error } = await supabase
                .from('tasks')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data as Task;
        },
        onSuccess: (_, vars) => {
            qc.invalidateQueries({ queryKey: QUERY_KEYS.tasks.all });
            qc.invalidateQueries({ queryKey: QUERY_KEYS.task.byId(vars.id) });
        },
    });
}

export function useDeleteTask() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) => {
            const { error } = await supabase.from('tasks').delete().eq('id', id);
            if (error) throw error;
            return id;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: QUERY_KEYS.tasks.all });
        },
    });
}