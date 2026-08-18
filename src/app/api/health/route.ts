import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/health
 * Health check endpoint for monitoring.
 */
export async function GET() {
    const status = new Date().toISOString();

    return NextResponse.json({
        status: 'ok',
        timestamp: status,
        uptime: process.uptime?.() ?? 0,
        memory_usage: process.memoryUsage?.() ?? null,
        version: '2.0.0',
    });
}