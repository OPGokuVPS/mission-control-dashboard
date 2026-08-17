import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import * as QUERY_KEYS from '@/lib/query-keys';
import type { AppError } from '@/types';

export function useErrors(limit = 50) {
    return useQuery({
        queryKey: QUERY_KEYS.errors.recent(limit),
        queryFn: async () => {
            const { data, error } = await supabase
                .from('errors')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);
            if (error) throw error;
            return data as AppError[];
        },
        staleTime: 30_000,
    });
}