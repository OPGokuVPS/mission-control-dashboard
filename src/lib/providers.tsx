'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/lib/auth-provider';
import { Suspense } from 'react';
import { getQueryClient } from '@/lib/query-client';
import { PanelSkeleton } from '@/components/SkeletonLoader';

export function Providers({ children }: { children: React.ReactNode }) {
    const queryClient = getQueryClient();

    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <Suspense fallback={<PanelSkeleton />}>
                    {children}
                </Suspense>
            </AuthProvider>
        </QueryClientProvider>
    );
}
