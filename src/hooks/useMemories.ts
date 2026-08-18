import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import * as QUERY_KEYS from '@/lib/query-keys';
import type { MemoryEntry, MemoryType } from '@/types';

export function useMemories(category?: MemoryType | null) {
    const filters: Record<string, unknown> = {};
    if (category) filters.category = category;

    return useQuery({
        queryKey: QUERY_KEYS.memories.byCategory(category),
        queryFn: async () => {
            let q = supabase.from('memory_vault').select('*');
            for (const [key, val] of Object.entries(filters)) {
                q = q.eq(key, val as string);
            }
            const { data, error } = await q.order('created_at', { ascending: false });
            if (error) throw error;
            return data as MemoryEntry[];
        },
        staleTime: 30_000,
    });
}

export function useAddMemory() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (payload: Omit<MemoryEntry, 'id' | 'created_at'>) => {
            const { data, error } = await supabase.from('memory_vault').insert([payload]).select().single();
            if (error) throw error;
            return data as MemoryEntry;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: QUERY_KEYS.memories.all });
        },
        onError: (err) => console.error('useAddMemory failed:', err),
    });
}

export function useDeleteMemory() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) => {
            const { error } = await supabase.from('memory_vault').delete().eq('id', id);
            if (error) throw error;
            return id;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: QUERY_KEYS.memories.all });
        },
        onError: (err) => console.error('useDeleteMemory failed:', err),
    });
}