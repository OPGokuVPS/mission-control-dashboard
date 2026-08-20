'use client';

import { useRef, useEffect } from 'react';

/**
 * FilterPresets — a horizontal-scroll chip bar for quick filter selection.
 * Designed for touch targets (min 44px height) with smooth iOS-style scrolling.
 */
export function FilterPresets({
    presets,
    activePreset,
    onSelect,
}: {
    presets: Array<{ id: string; label: string; icon: string; count?: number }>;
    activePreset: string;
    onSelect: (id: string) => void;
}) {
    const scrollRef = useRef<HTMLDivElement>(null);

    return (
        <div className="w-full overflow-hidden">
            <div
                ref={scrollRef}
                className="filter-chips-scroll flex gap-2 overflow-x-auto px-1 pb-1 snap-x snap-mandatory"
                role="tablist"
                aria-label="Filter presets"
                style={{ WebkitOverflowScrolling: 'touch' }}
            >
                {presets.map((preset) => {
                    const isActive = activePreset === preset.id;
                    return (
                        <button
                            key={preset.id}
                            onClick={() => onSelect(preset.id)}
                            role="tab"
                            aria-selected={isActive}
                            className={`
                                flex shrink-0 items-center gap-1.5
                                min-h-[44px] px-3 sm:min-w-0
                                rounded-full text-sm font-medium
                                transition-all duration-200 snap-start
                                focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
                                ${isActive
                                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md scale-[1.02]'
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500'
                                }
                            `}
                        >
                            <span className="text-base leading-none">{preset.icon}</span>
                            <span className="whitespace-nowrap">{preset.label}</span>
                            {preset.count !== undefined && (
                                <span className={`
                                    ml-0.5 text-xs font-bold
                                    ${isActive ? 'opacity-80' : 'text-slate-400 dark:text-slate-500'}
                                `}>
                                    {preset.count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

/**
 * MobileFilterSheet — A bottom-sheet panel that slides up from the bottom of the screen.
 * Contains full filter controls (status, agent, priority, date range).
 * Dismissed by swiping down or tapping the overlay.
 */
export function MobileFilterSheet({
    isOpen,
    onClose,
    children,
}: {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
}) {
    const sheetRef = useRef<HTMLDivElement>(null);
    const startYRef = useRef(0);
    const currentYRef = useRef(0);
    const draggingRef = useRef(false);

    // Close on escape
    useEffect(() => {
        function handleKey(e: KeyboardEvent) {
            if (e.key === 'Escape') onClose();
        }
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [onClose]);

    // Prevent body scroll when sheet is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            return () => { document.body.style.overflow = ''; };
        }
    }, [isOpen]);

    function handleTouchStart(e: React.TouchEvent) {
        startYRef.current = e.touches[0].clientY;
        currentYRef.current = startYRef.current;
        draggingRef.current = true;
    }

    function handleTouchMove(e: React.TouchEvent) {
        if (!draggingRef.current) return;
        currentYRef.current = e.touches[0].clientY;
    }

    function handleTouchEnd() {
        if (!draggingRef.current) return;
        draggingRef.current = false;
        const diff = currentYRef.current - startYRef.current;
        // If dragged down more than 80px, close
        if (diff > 80) {
            onClose();
        }
    }

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop / Overlay */}
            <div
                className="mobile-sheet-overlay fixed inset-0 z-50 bg-black/50 sm:hidden"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Sheet Panel */}
            <div
                ref={sheetRef}
                className="mobile-sheet-panel mobile-sheet-enter mobile-sheet-active fixed bottom-0 left-0 right-0 z-50 sm:hidden"
                style={{ maxHeight: '85vh' }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                role="dialog"
                aria-modal="true"
                aria-label="Filter options"
            >
                {/* Handle bar at top */}
                <div className="flex justify-center pt-3 pb-2">
                    <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                </div>

                {/* Scrollable content */}
                <div className="overflow-y-auto bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 rounded-t-2xl px-4 pb-8">
                    {children}
                </div>
            </div>
        </>
    );
}

/**
 * Floating Action Button (FAB) — positioned in the bottom-right thumb zone.
 * Visible only on screens < 768px. Includes slide-up entrance animation.
 */
export function FAB({
    onClick,
    icon = '+',
    label = 'New Task',
    ariaLabel,
}: {
    onClick: () => void;
    icon?: string;
    label?: string;
    ariaLabel?: string;
}) {
    return (
        <button
            onClick={onClick}
            aria-label={ariaLabel || label}
            className="fab-animate fixed bottom-6 right-4 z-40 sm:hidden
                w-14 h-14 rounded-full shadow-lg
                bg-blue-600 hover:bg-blue-700 active:bg-blue-800
                text-white text-2xl font-bold
                flex items-center justify-center
                focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2
                transition-colors duration-150"
            style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
            {icon}
            <span className="sr-only">{label}</span>
        </button>
    );
}

// Touch-friendly expand/collapse toggle button used inside compact headers
export function ExpandCollapseToggle({
    expanded,
    onToggle,
    label,
}: {
    expanded: boolean;
    onToggle: () => void;
    label: string;
}) {
    return (
        <button
            onClick={onToggle}
            aria-expanded={expanded}
            aria-label={label}
            className="sm:hidden flex items-center gap-1 min-h-[44px] px-3 py-2
                text-sm font-medium text-slate-600 dark:text-slate-400
                bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700
                rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-blue-500"
        >
            <span className={`
                inline-block transition-transform duration-200
                ${expanded ? 'rotate-180' : ''}
            `}>
                ▼
            </span>
            <span>{label}</span>
        </button>
    );
}
