import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public routes that don't require authentication
const PUBLIC_PATHS = [
    '/login',
    '/signup',
    '/signup-success',
    '/forgot-password',
    '/reset-password',
    '/api/auth/',
    '/auth/callback',
    '/sketch/',
];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow public paths
    if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
        return NextResponse.next();
    }

    // Whitelist API routes (except login which is public) so Supabase server calls pass through
    if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/login')) {
        return NextResponse.next();
    }

    // Check for ANY Supabase auth token cookie.
    // Supabase names them: sb-<project-ref>-auth-access-token etc.
    // We read the raw Cookie header to cover all variants.
    const cookieHeader = request.headers.get('cookie') || '';
    const hasSupabaseCookie = cookieHeader.split(';').some(c => c.trim().startsWith('sb-'));

    if (!hasSupabaseCookie) {
        // Redirect to login, preserving the return URL
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('next', pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

// Run middleware only on specific paths
export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};