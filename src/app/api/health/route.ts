import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Quick DB connectivity check
    const { data, error } = await supabase
      .from('tasks')
      .select('count', { count: 'exact', head: true });

    if (error) throw error;

    // Get latest sync metrics from sync_metrics table (if it exists)
    // For now we just return DB connectivity status
    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (e: any) {
    return NextResponse.json(
      { status: 'error', database: 'disconnected', error: e.message },
      { status: 500 }
    );
  }
}
