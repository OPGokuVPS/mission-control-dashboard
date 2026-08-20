import { NextResponse } from 'next/server';
import type { MarketDataPoint, MarketAlertThreshold } from '@/types';

const NASDAQ_SYMBOL = 'IXIC';
const NASDAQ_NAME = 'NASDAQ Composite';

/**
 * Validation rules for market price movements.
 */
const VALIDATION_RULES = {
    cautionThreshold: 1.0,   // ±1% change → caution
    warningThreshold: 2.0,   // ±2% change → warning / alert
};

/**
 * Determine the alert level based on absolute daily change percentage.
 */
function getAlertLevel(changePercent: number): MarketAlertThreshold {
    const absChange = Math.abs(changePercent);
    if (absChange >= VALIDATION_RULES.warningThreshold) return 'warning';
    if (absChange >= VALIDATION_RULES.cautionThreshold) return 'caution';
    return 'normal';
}

/**
 * Build a human-readable alert message when thresholds are crossed.
 */
function buildAlertMessage(
    symbol: string,
    name: string,
    changePercent: number,
    alertLevel: MarketAlertThreshold
): string | undefined {
    if (alertLevel === 'normal') return undefined;

    const direction = changePercent >= 0 ? 'rising' : 'falling';
    const absChange = Math.abs(changePercent).toFixed(2);
    const magnitude =
        alertLevel === 'warning' ? 'significant' : 'notable';

    return `${name} (${symbol}) showing ${magnitude} ${direction} — ${absChange}%`;
}

// ============================================================
// Fetch real data from Yahoo Finance public API
// ============================================================

async function fetchRealMarketData(): Promise<MarketDataPoint | null> {
    try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${NASDAQ_SYMBOL}?interval=1d&range=1d`;

        const response = await fetch(url, {
            headers: { 'User-Agent': 'MissionControlDashboard/2.0' },
            cache: 'no-store',
        });

        if (!response.ok) {
            console.warn(`Yahoo Finance returned ${response.status}, falling back to demo data`);
            return null;
        }

        const json = await response.json();
        const meta = json.chart?.result?.[0]?.meta;

        if (!meta) {
            console.warn('Yahoo Finance response missing meta field, falling back to demo data');
            return null;
        }

        const currentPrice = meta.regularMarketPrice;
        const previousClose = meta.chartPreviousClose ?? meta.previousClose;
        const change = currentPrice - previousClose;
        const changePercent = previousClose !== 0 ? ((change / previousClose) * 100) : 0;
        const timestamp = meta.regularMarketTime
            ? new Date(meta.regularMarketTime * 1000).toISOString()
            : new Date().toISOString();

        return {
            symbol: NASDAQ_SYMBOL,
            name: NASDAQ_NAME,
            currentPrice: Number(currentPrice.toFixed(2)),
            previousClose: Number(previousClose.toFixed(2)),
            change: Number(change.toFixed(2)),
            changePercent: Number(changePercent.toFixed(2)),
            timestamp,
            isDemoMode: false,
            alertLevel: getAlertLevel(changePercent),
            alertMessage: buildAlertMessage(NASDAQ_SYMBOL, NASDAQ_NAME, changePercent, getAlertLevel(changePercent)),
        };
    } catch (err) {
        console.error('Failed to fetch Yahoo Finance data:', err);
        return null;
    }
}

// ============================================================
// Fallback demo/mock data (used when API unavailable or no key)
// ============================================================

function generateDemoData(): MarketDataPoint {
    // Use realistic Nasdaq numbers as of mid-2025 ranges
    const previousClose = 19347.53;
    const mockChangePercent = 0.67; // ~+0.67% normal movement
    const currentPrice = +(previousClose * (1 + mockChangePercent / 100)).toFixed(2);
    const change = +(currentPrice - previousClose).toFixed(2);
    const alertLevel = getAlertLevel(mockChangePercent);

    return {
        symbol: NASDAQ_SYMBOL,
        name: NASDAQ_NAME,
        currentPrice,
        previousClose,
        change,
        changePercent: +mockChangePercent.toFixed(2),
        timestamp: new Date().toISOString(),
        isDemoMode: true,
        alertLevel,
        alertMessage: buildAlertMessage(NASDAQ_SYMBOL, NASDAQ_NAME, mockChangePercent, alertLevel),
    };
}

// ============================================================
// API Handlers
// ============================================================

export async function GET(request: Request) {
    const url = new URL(request.url);
    const forceDemo = url.searchParams.get('demo') === 'true';

    try {
        let data: MarketDataPoint;

        if (forceDemo) {
            data = generateDemoData();
            console.log('[market-data] Returning demo mode data');
        } else {
            // Attempt real data first
            const realData = await fetchRealMarketData();
            if (realData) {
                data = realData;
            } else {
                data = generateDemoData();
                console.log('[market-data] Real data unavailable — returning demo mode data');
            }
        }

        return NextResponse.json(
            { ...data, updatedAt: new Date().toISOString() },
            { status: 200 }
        );
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        console.error('[market-data] Unexpected error:', message);

        // Always return a valid JSON even on failure
        return NextResponse.json(
            {
                error: message,
                timestamp: new Date().toISOString(),
            },
            { status: 500 }
        );
    }
}
