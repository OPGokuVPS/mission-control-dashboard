// Re-export from supabase.ts which now uses @supabase/ssr with cookie sync
// This file exists for backwards compatibility with any existing imports
export { supabase, createClient } from '@/lib/supabase';