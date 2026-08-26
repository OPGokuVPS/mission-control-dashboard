'use client';

import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Realtime subscription singleton — guarantees exactly ONE Supabase channel per
// logical topic across the ENTIRE app, no matter how many components/hooks call
// it.  Supabase keys channels by topic name; creating a channel with an existing
// name returns the SAME (already-subscribed) object, and calling `.on()` on a
// subscribed channel throws:
//   "cannot add `postgres_changes` callbacks for realtime:<topic> after `subscribe()`."
// By owning each topic here and fanning changes out to registered handlers, we
// eliminate that race + duplicate-channel crash for good.
// ---------------------------------------------------------------------------

interface TopicState {
    channel: RealtimeChannel;
    /** registered handlers; shallow-copied at dispatch so removal during iteration is safe */
    handlers: Set<(payload: any) => void>;
}

const topics = new Map<string, TopicState>();

function ensureChannel(topic: string, table: string): TopicState {
    const existing = topics.get(topic);
    if (existing && existing.channel) return existing;

    const channel = supabase.channel(topic);
    const handlers = new Set<(payload: any) => void>();

    // Register the single listener BEFORE subscribing (avoids the SDK race).
    channel.on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
        for (const h of [...handlers]) {
            try {
                h(payload);
            } catch (err) {
                // A handler error must never break the shared channel.
                console.error(`[realtime] handler error on "${topic}":`, err);
            }
        }
    });

    try {
        channel.subscribe((status) => {
            if (status === 'SUBSCRIBED') console.debug(`[realtime] "${topic}" subscribed`);
            if (status === 'CHANNEL_ERROR') console.warn(`[realtime] "${topic}" channel error`);
        });
    } catch (err) {
        console.error(`[realtime] subscribe failed for "${topic}":`, err);
    }

    const state: TopicState = { channel, handlers };
    topics.set(topic, state);
    return state;
}

/**
 * Subscribe a callback to Postgres realtime changes for a topic/table.
 * Returns an unsubscribe function. The underlying channel is created once,
 * reused by every subsequent subscriber, and torn down when the last handler
 * unsubscribes.
 */
export function subscribeToChanges(
    topic: string,
    table: string,
    handler: (payload: any) => void,
): () => void {
    const state = ensureChannel(topic, table);
    state.handlers.add(handler);

    return () => {
        state.handlers.delete(handler);
        // If no handlers remain, tear the channel down so a future subscriber
        // rebuilds it cleanly (avoids any stale/duplicate state).
        if (state.handlers.size === 0) {
            const removed = topics.delete(topic);
            if (removed) {
                supabase.removeChannel(state.channel);
            }
        }
    };
}