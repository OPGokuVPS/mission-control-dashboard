'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// ConnectionStatusIndicator — single-channel lifecycle managed via ref so
// we never leak or double-register channels. Green = live sync is active;
// red/orange = disconnected (clickable to force reconnect).
// --------------------------------------------------------------------------/

export function ConnectionStatusIndicator() {
    const [connected, setConnected] = useState(false);
    const [mounted, setMounted] = useState(false);
    const channelRef = useRef<{ channel: any; unsub: (() => void) | null }>({ channel: null, unsub: null });
    const mountedRef = useRef(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        setMounted(true);
        mountedRef.current = true;

        // Create exactly ONE channel for the entire lifetime until cleanup
        const hb = supabase.channel('connection-heartbeat');
        let unsubscribed = false;

        // Listen for connection-level status changes via subscribe callback
        hb.subscribe((status: string) => {
            if (unsubscribed || !mountedRef.current) return;
            if (status === 'SUBSCRIBED') setConnected(true);
            if (status === 'CHANNEL_ERROR') setConnected(false);
        });

        channelRef.current = { channel: hb, unsub: () => { unsubscribed = true; } };

        // Safety timeout: if we haven't received SUBSCRIBED within 2s, mark offline
        const timeout = setTimeout(() => {
            if (mountedRef.current) {
                setConnected(false);
                console.warn('[ConnectionStatusIndicator] never received SUBSCRIBED from Supabase');
            }
        }, 2000);

        // Periodic reconnect every 60 s
        intervalRef.current = setInterval(() => {
            if (!mountedRef.current || unsubscribed) return;
            // Remove old channel and create fresh one (singleton handles name reuse)
            supabase.removeChannel(hb);
            const fresh = supabase.channel('connection-heartbeat');
            fresh.subscribe((status: string) => {
                if (unsubscribed || !mountedRef.current) return;
                if (status === 'SUBSCRIBED') setConnected(true);
                if (status === 'CHANNEL_ERROR') setConnected(false);
            });
            channelRef.current = { channel: fresh, unsub: null };
        }, 60_000);

        return () => {
            mountedRef.current = false;
            unsubscribed = true;
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            clearTimeout(timeout);
            if (channelRef.current.channel) supabase.removeChannel(channelRef.current.channel);
            channelRef.current = { channel: null, unsub: null };
        };
    }, []);

    /** Force-reconnect */
    const handleReconnect = () => {
        setConnected(false);
        // Tear down existing channel, force recreate
        if (channelRef.current.channel) {
            supabase.removeChannel(channelRef.current.channel);
        }
        const fresh = supabase.channel('connection-heartbeat');
        fresh.subscribe((status: string) => {
            if (status === 'SUBSCRIBED') setConnected(true);
            if (status === 'CHANNEL_ERROR') setConnected(false);
        });
        channelRef.current = { channel: fresh, unsub: null };
    };

    if (!mounted) {
        return (
            <div className="flex items-center gap-1.5 text-[13px]" title="Loading connection status…">
                <span className="inline-block h-2 w-2 rounded-full bg-slate-400" />
                <span className="text-slate-500">Checking…</span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-1.5 text-[13px]" title={connected ? 'Real-time sync connected' : 'Disconnected'}>
            <button
                type="button"
                onClick={handleReconnect}
                className={`inline-block h-2 w-2 rounded-full transition-colors duration-300 ${
                    connected
                        ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,.5)] cursor-default'
                        : 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,.5)] cursor-pointer hover:bg-red-400 animate-pulse'
                }`}
                aria-label={connected ? 'Connected to real-time updates' : 'Disconnected — click to reconnect'}
            />
            <span className={connected ? 'text-slate-500 dark:text-slate-400' : 'text-red-500 font-medium'}>
                {connected ? 'Live' : 'Offline'}
            </span>
        </div>
    );
}

