import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import * as QUERY_KEYS from '@/lib/query-keys';
import type { Alert, RiskSeverity, AlertSource } from '@/types';

export function useAlerts(severity?: RiskSeverity | null, source?: AlertSource | null) {
    const filters: Record<string, unknown> = {};
    if (severity) filters.severity = severity;
    if (source) filters.source = source;

    return useQuery({
        queryKey: QUERY_KEYS.alerts.byFilter(severity, source),
        queryFn: async () => {
            let q = supabase.from('alerts').select('*');
            Object.entries(filters).forEach(([key, val]) => {
                q = (q as any).eq(key, val);
            });
            const { data, error } = await q.order('created_at', { ascending: false });
            if (error) throw error;
            return data as Alert[];
        },
        staleTime: 10_000,
        refetchInterval: 10_000,
    });
}

export function useResolveAlert() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) => {
            const { data, error } = await supabase
                .from('alerts')
                .update({ status: 'resolved', resolved_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data as Alert;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: QUERY_KEYS.alerts.all });
        },
    });
}