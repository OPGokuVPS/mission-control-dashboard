import { QueryClient } from '@tanstack/react-query';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: { staleTime: 10_000, retry: 3, refetchOnWindowFocus: false },
        mutations: { retry: 1 },
    },
});

export { queryClient };

export function getQueryClient(): QueryClient {
    return queryClient;
}