'use client';

import { CommandInterface } from '@/components/CommandInterface';

/**
 * Renders the CommandInterface as an overlay panel positioned
 * directly below the sticky header, floating above all page content.
 * Uses max-height + opacity for a smooth slide/fade animation.
 */
export function CommandOverlay({
    show,
    onUpdate,
}: {
    show: boolean;
    onUpdate: () => void;
}) {
    return (
        <div
            className={`absolute left-0 right-0 top-16 sm:top-[64px] z-30 bg-gray-50 dark:bg-slate-900 transition-all duration-200 overflow-hidden ${
                show ? 'max-h-[calc(100vh-64px)] opacity-100' : 'max-h-0 opacity-0'
            }`}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
                <CommandInterface onUpdate={onUpdate} />
            </div>
        </div>
    );
}
