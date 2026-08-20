import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Server-safe Supabase client — uses @supabase/ssr's createBrowserClient
 * with cookie read/set/remove handlers so middleware can detect sessions.
 */
export const supabase = createBrowserClient(
    supabaseUrl,
    supabaseAnonKey,
    {
        cookies: {
            get(name: string) {
                if (typeof document === 'undefined') return undefined;
                const value = document.cookie
                    .split('; ')
                    .find(row => row.startsWith(`${name}=`))
                    ?.split('=')
                    .slice(1)
                    .join('=');

                if (value) {
                    try { return JSON.parse(decodeURIComponent(value)); }
                    catch { return value; }
                }
                return undefined;
            },
            set(name: string, value: any, options: any) {
                if (typeof document === 'undefined') return;
                let cookieString = `${name}=${encodeURIComponent(typeof value === 'object' ? JSON.stringify(value) : value)};`;

                if (options?.path) cookieString += ` Path=${options.path};`;
                if (options?.domain) cookieString += ` Domain=${options.domain};`;
                if (options?.maxAge) cookieString += ` Max-Age=${options.maxAge};`;
                if (options?.expires) cookieString += ` Expires=${options.expires.toUTCString()};`;
                if (options?.httpOnly) cookieString += ' HttpOnly;';
                if (options?.secure) cookieString += ' Secure;';
                if (options?.sameSite === 'strict') cookieString += ' SameSite=Strict;';
                else if (options?.sameSite === 'lax') cookieString += ' SameSite=Lax;';

                document.cookie = cookieString;
            },
            remove(name: string, options: any) {
                if (typeof document === 'undefined') return;
                let cookieString = `${name}=;`;

                if (options?.path) cookieString += ` Path=${options.path};`;
                if (options?.domain) cookieString += ` Domain=${options.domain};`;
                cookieString += ' Max-Age=0;';

                document.cookie = cookieString;
            },
        },
    }
);

// Legacy compatibility — some imports expect createClient()
export function createClient() {
    return supabase;
}
