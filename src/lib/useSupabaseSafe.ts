import { supabase } from './supabase';
import { useSyncMetrics } from '@/hooks/useSyncMetrics';

/**
 * Safe Supabase wrapper with retry logic and error logging.
 * Usage:
 *   const { data, error, execute } = useSupabaseSafe('tasks');
 *   const { data, error } = await execute(supabase.from('tasks').select('*'));
 */
export function useSupabaseSafe(componentName: string) {
  const { markSuccess, recordError } = useSyncMetrics();
  const RETRIES = 3;
  const BACKOFF_MS = 300;

  const execute = async <T,>(
    fn: () => Promise<{ data: T | null; error: any | null }>
  ): Promise<{ data: T | null; error: any | null }> => {
    let lastError: any = null;

    for (let attempt = 1; attempt <= RETRIES; attempt++) {
      try {
        const result = await fn();
        if (result.error) {
          lastError = result.error;
          if (attempt < RETRIES) {
            await new Promise((r) => setTimeout(r, BACKOFF_MS * attempt));
            continue;
          }
        } else {
          markSuccess(componentName);
          return result;
        }
      } catch (e: any) {
        lastError = e;
        if (attempt < RETRIES) {
          await new Promise((r) => setTimeout(r, BACKOFF_MS * attempt));
        }
      }
    }

    // All retries exhausted
    recordError(componentName, lastError);
    return { data: null, error: lastError };
  };

  return { execute };
}

/**
 * Helper to log errors manually to the errors table.
 */
export async function logErrorToDb(component: string, severity: 'error' | 'warning' | 'info', message: string, details?: any) {
  try {
    await supabase.from('errors').insert({
      component,
      severity,
      message,
      details: details ? { ...details, timestamp: new Date().toISOString() } : null,
    });
  } catch (e) {
    // If error logging fails, fail silently to avoid loops
    console.error('Failed to log error:', e);
  }
}
