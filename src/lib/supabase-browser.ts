import { createBrowserClient } from '@supabase/ssr';

/**
 * Creates a browser-side Supabase client configured via @supabase/ssr.
 * This ensures the auth session is written to cookies that middleware
 * can detect, eliminating the silent redirect-after-login loop.
 */
export function createClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    if (typeof document === 'undefined') return undefined;
                    // Read cookie from document.cookie (client-side)
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
}
