'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// ConnectionStatusIndicator — small dot that reflects whether any Supabase
// realtime channel is currently connected.  Green = live sync is active;
// red/orange = disconnected (clickable to force reconnect).
// --------------------------------------------------------------------------/\

export function ConnectionStatusIndicator() {
    const [connected, setConnected] = useState(false); // unknown → false until confirmed

    useEffect(() => {
        if (typeof window === 'undefined') return;

        // A lightweight channel whose sole purpose is connection tracking.
        // We only care about SUBSCRIBED / CHANNEL_ERROR state changes.
        const hb = supabase.channel('connection-heartbeat');

        hb.subscribe((status) => {
            if (status === 'SUBSCRIBED')      setConnected(true);
            if (status === 'CHANNEL_ERROR')   setConnected(false);
        });

        // Safety timeout: if we haven't received SUBSCRIBED within
        // 2 seconds something is wrong (no network, no Supabase project, …).
        const timeout = setTimeout(() => {
            setConnected(false);
            console.warn('[ConnectionStatusIndicator] never received SUBSCRIBED from Supabase');
        }, 2000);

        // Periodic reconnect every 60 s to catch stale WebSocket frames.
        const interval = setInterval(() => {
            // Re-subscribe forces a fresh handshake.
            supabase.removeChannel(hb);
            const fresh = supabase.channel('connection-heartbeat');
            fresh.subscribe((status) => {
                if (status === 'SUBSCRIBED')      setConnected(true);
                if (status === 'CHANNEL_ERROR')   setConnected(false);
            });
        }, 60_000);

        return () => {
            clearInterval(interval);
            clearTimeout(timeout);
            supabase.removeChannel(hb);
        };
    }, []);

    /**
     * Force-reconnect by tearing down all existing channels and
     * creating a brand-new heartbeat.
     */
    const handleReconnect = () => {
        setConnected(false);
        setTimeout(() => setConnected(false), 100);
        // Quick double-create triggers a fresh subscribe cycle.
        const channels = supabase.getChannels();
        channels.forEach(ch => supabase.removeChannel(ch));
        const fresh = supabase.channel('connection-heartbeat');
        fresh.subscribe((status) => {
            if (status === 'SUBSCRIBED') setConnected(true);
            if (status === 'CHANNEL_ERROR') setConnected(false);
        });
    };

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
