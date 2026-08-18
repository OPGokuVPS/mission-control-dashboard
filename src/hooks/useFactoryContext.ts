import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import * as QUERY_KEYS from '@/lib/query-keys';
import type { FactoryContext } from '@/types';

export function useFactoryContext() {
    return useQuery({
        queryKey: QUERY_KEYS.factoryContext,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('settings')
                .select('value')
                .eq('key', 'factory_context')
                .maybeSingle();
            if (error) throw error;
            if (!data) return null;
            return (data.value ?? {}) as FactoryContext;
        },
        staleTime: 60_000,
    });
}

export function useUpdateFactoryContext() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (payload: Partial<FactoryContext>) => {
            const { data, error } = await supabase
                .from('settings')
                .upsert({ key: 'factory_context', value: payload }, { onConflict: 'key' })
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: QUERY_KEYS.factoryContext });
        },
        onError: (err) => console.error('useUpdateFactoryContext failed:', err),
    });
}