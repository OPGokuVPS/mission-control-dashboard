import { useQuery } from '@tanstack/react-query';
import type { MarketDataPoint } from '@/types';

const REFRESH_INTERVAL = 300_000; // 5 minutes — market data doesn't change that fast

export function useMarketData(forceDemo: boolean = false) {
    return useQuery({
        queryKey: ['market-data', forceDemo],
        queryFn: async (): Promise<MarketDataPoint> => {
            const params = new URLSearchParams();
            if (forceDemo) params.set('demo', 'true');

            const url = `/api/market-data?${params.toString()}`;
            const response = await fetch(url);

            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({}));
                throw new Error(
                    errorBody.error ?? `Market data API returned ${response.status}`
                );
            }

            return response.json();
        },
        staleTime: REFRESH_INTERVAL / 2, // consider fresh for 2.5 min
        gcTime: REFRESH_INTERVAL * 4,     // cache for 20 minutes
        retry: 1,
        refetchOnWindowFocus: false,
    });
}
