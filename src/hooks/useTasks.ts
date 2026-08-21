'use client';

import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import * as QUERY_KEYS from '@/lib/query-keys';
import type { Task, TaskStatus, PriorityLevel, AgentRole, Subtask } from '@/types';

// ---------------------------------------------------------------------------
// Tasks Hook — central source of truth for all task data
// --------------------------------------------------------------------------/

export function useTasks() {
    const qc = useQueryClient();

    // ── Real-time subscription — merges Postgres changes into cache ──
    const invalidateRef = useRef(qc.invalidateQueries.bind(qc));
    useEffect(() => { invalidateRef.current = qc.invalidateQueries.bind(qc); }, [qc]);
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const channel = supabase.channel('tasks-changes');
        let unsubscribed = false;

        // Set up listener BEFORE subscribing to avoid SDK race condition
        const onTaskChange = channel.on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'tasks' },
            (payload) => {
                const id = (payload.new as Partial<Task>)?.id ??
                           ((payload.old as Partial<Task>)?.id as number);
                if (id != null) {
                    invalidateRef.current({ queryKey: QUERY_KEYS.tasks.all });
                    invalidateRef.current({ queryKey: QUERY_KEYS.task.byId(id) });
                } else {
                    invalidateRef.current({ queryKey: QUERY_KEYS.tasks.all });
                }
            },
        );

        // Subscribe with error handling — failure here used to CRASH the entire app
        try {
            channel.subscribe((status) => {
                if (unsubscribed) return;
                if (status === 'SUBSCRIBED') {
                    console.debug('[useTasks] real-time sub OK');
                } else if (status === 'CHANNEL_ERROR') {
                    console.warn('[useTasks] real-time sub error');
                }
            });
        } catch (err) {
            // Subscription failed (e.g., CSP blocking WS) — log but DON'T crash
            console.error('[useTasks] realtime subscription failed:', err);
        }

        return () => {
            unsubscribed = true;
            channel.unsubscribe();
            supabase.removeChannel(channel);
        };
    }, []);
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
        onError: (err) => console.error('useCreateTask failed:', err),
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
        onError: (err) => console.error('useUpdateTask failed:', err),
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