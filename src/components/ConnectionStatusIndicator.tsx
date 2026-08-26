'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// ConnectionStatusIndicator — single channel lifecycle managed via ref so
// we never leak or double-register channels.  Green = live sync is active;
// red/orange = disconnected (clickable to force reconnect).
// --------------------------------------------------------------------------/\

export function ConnectionStatusIndicator() {
    const [connected, setConnected] = useState(false);
    const [mounted, setMounted] = useState(false);
    const channelRef = useRef<any>(null); // track the single channel instance
    const mountedRef = useRef(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        setMounted(true);
        mountedRef.current = true;

        // Create exactly ONE channel for the entire lifetime of this component
        const hb = supabase.channel('connection-heartbeat');
        hb.subscribe((status) => {
            if (!mountedRef.current) return;
            if (status === 'SUBSCRIBED')      setConnected(true);
            if (status === 'CHANNEL_ERROR')   setConnected(false);
        });
        channelRef.current = hb;

        // Safety timeout: if we haven't received SUBSCRIBED within 2s, mark offline
        const timeout = setTimeout(() => {
            if (mountedRef.current) {
                setConnected(false);
                console.warn('[ConnectionStatusIndicator] never received SUBSCRIBED from Supabase');
            }
        }, 2000);

        // Periodic reconnect every 60 s — remove & recreate the SINGLE channel
        const interval = setInterval(() => {
            if (!mountedRef.current) return;
            supabase.removeChannel(hb);
            const fresh = supabase.channel('connection-heartbeat');
            fresh.subscribe((status) => {
                if (!mountedRef.current) return;
                if (status === 'SUBSCRIBED')      setConnected(true);
                if (status === 'CHANNEL_ERROR')   setConnected(false);
            });
            channelRef.current = fresh;
        }, 60_000);

        return () => {
            mountedRef.current = false;
            clearInterval(interval);
            clearTimeout(timeout);
            if (channelRef.current) supabase.removeChannel(channelRef.current);
            channelRef.current = null;
        };
    }, []);

    /** Force-reconnect */
    const handleReconnect = () => {
        setConnected(false);
        // Tear down all existing channels, recreate heartbeat
        const channels = supabase.getChannels();
        channels.forEach(ch => supabase.removeChannel(ch));
        const fresh = supabase.channel('connection-heartbeat');
        fresh.subscribe((status) => {
            if (status === 'SUBSCRIBED') setConnected(true);
            if (status === 'CHANNEL_ERROR') setConnected(false);
        });
        channelRef.current = fresh;
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
