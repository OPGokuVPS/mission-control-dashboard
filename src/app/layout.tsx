import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthProvider } from '@/lib/auth-provider';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PanelSkeleton } from '@/components/SkeletonLoader';
import { getQueryClient } from '@/lib/query-client';
import './globals.css';

export const metadata: Metadata = {
    title: 'Mission Control — AI Software Factory',
    description: 'Autonomous AI Software Factory dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    const queryClient = getQueryClient();

    return (
        <html lang="en">
            <body className="antialiased bg-gray-50 text-slate-900">
                <QueryClientProvider client={queryClient}>
                    <AuthProvider>
                        <Suspense fallback={<PanelSkeleton />}>
                            {children}
                        </Suspense>
                    </AuthProvider>
                </QueryClientProvider>
            </body>
        </html>
    );
}