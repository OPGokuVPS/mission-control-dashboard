import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import * as QUERY_KEYS from '@/lib/query-keys';
import type { Alert, RiskSeverity, AlertSource } from '@/types';

export type { Alert, RiskSeverity, AlertSource };

export function useAlerts(filters?: { status?: 'active' | 'resolved' | 'acknowledged'; severity?: RiskSeverity }) {
    return useQuery({
        queryKey: [QUERY_KEYS.alerts],
        queryFn: async () => {
            let q = supabase.from('alerts').select('*').order('created_at', { ascending: false });
            if (filters?.status) q = q.eq('status', filters.status);
            if (filters?.severity) q = q.eq('severity', filters.severity);
            const { data, error } = await q;
            if (error) throw error;
            return data ?? [];
        },
    });
}

export function useResolveAlert() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...updates }: Pick<Alert, 'id'> & Partial<Pick<Alert, 'status' | 'description'>>) => {
            const { data, error } = await supabase
                .from('alerts')
                .update({ ...updates, resolved_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEYS.alerts] }),
        onError: (err) => console.error('useResolveAlert failed:', err),
    });
}