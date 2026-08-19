import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /auth/callback
 * Handles OAuth + email confirmation + magic link + password recovery callbacks from Supabase Auth.
 */
export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // --- Error case: show error on login page ---
    if (error || errorDescription) {
        return NextResponse.redirect(
            new URL(`/login?error=${encodeURIComponent(errorDescription || error || 'Authentication failed')}`, origin),
        );
    }

    // --- Email confirmation / password recovery / magic link ---
    // Supabase appends ?code=xxx after verifying the email/reset token.
    // We must exchange it for a session.
    if (code) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

        if (!supabaseUrl || !supabaseAnonKey) {
            console.error('[auth/callback] Missing Supabase env vars');
            return NextResponse.redirect(new URL('/login', origin));
        }

        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            auth: { autoRefreshToken: true, persistSession: true },
        });

        await supabase.auth.exchangeCodeForSession(code);

        // Verify the session was created (exchangeCodeForSession doesn't always throw)
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            console.error('[auth/callback] No session after exchangeCodeForSession');
            return NextResponse.redirect(new URL('/login?error=Failed to complete authentication', origin));
        }

        // For password recovery, redirect to a dedicated reset-password page
        const type = searchParams.get('type');
        if (type === 'recovery') {
            return NextResponse.redirect(new URL('/reset-password', origin));
        }

        // For email confirmation or normal login, go to home
        return NextResponse.redirect(new URL('/', origin));
    }

    // Fallback: redirect to login
    return NextResponse.redirect(new URL('/login', origin));
}
