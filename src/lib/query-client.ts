import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersistedClient, Persister } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

const persister = createSyncStoragePersister({ storage: typeof window !== 'undefined' ? window.localStorage : undefined as unknown as Storage });

const queryClient = new QueryClient({
    defaultOptions: {
        queries: { staleTime: 10_000, retry: 3, refetchOnWindowFocus: false },
        mutations: { retry: 1 },
    },
    persistor: persister,
});

export { queryClient };

// Re-export for convenience
export function getQueryClient(): QueryClient {
    return queryClient;
}