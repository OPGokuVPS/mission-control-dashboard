'use client';

import { useEffect, useRef } from 'react';
import { CommandInterface } from '@/components/CommandInterface';

/**
 * Renders the CommandInterface as an overlay panel positioned
 * directly below the sticky header, floating above all page content.
 * Uses max-height + opacity for a smooth slide/fade animation.
 *
 * The `key` prop forces a full remount whenever `show` toggles,
 * which re-triggers the CLI's internal autoFocus so every open
 * gets a ready-to-type input without manual tab navigation.
 */
export function CommandOverlay({
    show,
    onUpdate,
}: {
    show: boolean;
    onUpdate: () => void;
}) {
    const containerRef = useRef<HTMLDivElement>(null);

    // When the overlay becomes visible, move focus into the CLI input
    // after React commits the DOM.  We use requestAnimationFrame so the
    // element is painted before we attempt focus.
    useEffect(() => {
        if (!show) return;
        const raf = requestAnimationFrame(() => {
            containerRef.current?.focus();
        });
        return () => cancelAnimationFrame(raf);
    }, [show]);

    return (
        <div
            ref={containerRef}
            key={show ? 1 : 0}
            className={`absolute left-0 right-0 top-16 sm:top-[64px] z-30 bg-gray-50 dark:bg-slate-900 transition-all duration-200 overflow-hidden outline-none ${
                show ? 'max-h-[calc(100vh-64px)] opacity-100' : 'max-h-0 opacity-0'
            }`}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
                <CommandInterface onUpdate={onUpdate} />
            </div>
        </div>
    );
}
