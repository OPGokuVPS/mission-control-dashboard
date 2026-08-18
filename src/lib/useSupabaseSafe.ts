import { supabase } from '@/lib/supabase';

/**
 * Safely logs an error to the database errors table.
 * Non-blocking — failures are swallowed and logged to console only.
 */
export async function logErrorToDatabase(
    params: { service: string; severity: string; message: string; metadata?: Record<string, unknown> }
): Promise<void> {
    try {
        await supabase.from('errors').insert([{
            service: params.service,
            severity: params.severity,
            message: params.message,
            metadata_json: params.metadata,
        }]);
    } catch (e) {
        console.warn('Failed to log error to Supabase:', e);
    }
}