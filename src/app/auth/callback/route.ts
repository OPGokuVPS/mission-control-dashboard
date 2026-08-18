import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /auth/callback
 * Handles OAuth + magic link callbacks from Supabase Auth.
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (error) {
        return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(errorDescription || error)}`, request.url));
    }

    // Success: redirect to dashboard or home
    return NextResponse.redirect(new URL('/', request.url));
}