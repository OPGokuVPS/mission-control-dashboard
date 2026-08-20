/**
 * Tests for AgentPerformanceMetricsPanel.
 * Validates: time-range selector buttons, error state, loading state,
 * and summary card rendering with mock data.
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentPerformanceMetricsPanel } from './AgentPerformanceMetricsPanel';

// ---------------------------------------------------------------------------
// Mock useAgentMetrics hook
// ---------------------------------------------------------------------------

const mockReport = {
    metrics: [
        {
            agent_role: 'strategy',
            total_tasks: 42,
            completed_tasks: 38,
            completion_rate_pct: 90.5,
            avg_completion_time_sec: 120.5,
            median_inter_gap_sec: 60.2,
        },
        {
            agent_role: 'backend_engineer',
            total_tasks: 87,
            completed_tasks: 75,
            completion_rate_pct: 86.2,
            avg_completion_time_sec: 180.0,
            median_inter_gap_sec: 90.0,
        },
        {
            agent_role: 'frontend_engineer',
            total_tasks: 55,
            completed_tasks: 50,
            completion_rate_pct: 90.9,
            avg_completion_time_sec: 95.0,
            median_inter_gap_sec: 45.0,
        },
    ],
    quality_breakdown: [
        {
            agent_role: 'strategy',
            total_tasks: 42,
            critical_outcomes: 5,
            high_outcomes: 30,
            medium_outcomes: 5,
            low_outcomes: 1,
            unknown_outcomes: 1,
            critical_quality_pct: 11.9,
            high_quality_pct: 71.4,
            low_quality_pct: 2.4,
        },
    ],
    recent_activities: [],
    throughput_trends: [
        { date: '2025-08-14T00:00:00Z', total_activities: 10, completed_activities: 8, completion_rate_pct: 80.0 },
        { date: '2025-08-15T00:00:00Z', total_activities: 15, completed_activities: 12, completion_rate_pct: 80.0 },
        { date: '2025-08-16T00:00:00Z', total_activities: 8, completed_activities: 7, completion_rate_pct: 87.5 },
    ],
    summary: {
        total_roles: 11,
        active_roles: 3,
        total_tasks_all_roles: 184,
        overall_completion_rate_pct: 87.5,
        fastest_avg_completion_sec: 95.0,
        slowest_avg_completion_sec: 180.0,
        total_assigned_tasks: 150,
        tasks_by_status: { active: 50, backlog: 60, done: 40 },
    },
};

vi.mock('@/hooks/useAgentPerformance', () => ({
    useAgentMetrics: vi.fn(),
    useAgentMetricsSuspended: vi.fn(),
}));

vi.mock('@/components/SkeletonLoader', () => ({
    CardSkeleton: () => <div className="skeleton" />,
}));

const { useAgentMetrics } = await import('@/hooks/useAgentPerformance');

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

describe('AgentPerformanceMetricsPanel', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ---- Time-range selector ----

    it('renders all time-range preset buttons', () => {
        (useAgentMetrics as any).mockReturnValue({
            data: mockReport,
            isLoading: false,
            error: null,
        });

        render(<AgentPerformanceMetricsPanel />);

        expect(screen.getByText('Last 24h')).toBeInTheDocument();
        expect(screen.getByText('Last 7d')).toBeInTheDocument();
        expect(screen.getByText('Last 30d')).toBeInTheDocument();
        expect(screen.getByText('Custom')).toBeInTheDocument();
    });

    it('calls useAgentMetrics with correct timeRange preset', async () => {
        const mockFn = vi.fn().mockReturnValue({ data: mockReport, isLoading: false, error: null });
        (useAgentMetrics as any).mockImplementation(mockFn);

        render(<AgentPerformanceMetricsPanel />);

        // Initially rendered with default '7d' preset
        expect(mockFn).toHaveBeenCalledWith('7d');

        // Click "24h"
        const btn24h = screen.getByText('Last 24h');
        await userEvent.click(btn24h);

        // Hook should be called again with '24h'
        expect(mockFn).toHaveBeenCalledWith('24h');
    });

    it('switches to custom date-picker mode', async () => {
        (useAgentMetrics as any).mockReturnValue({ data: mockReport, isLoading: false, error: null });

        render(<AgentPerformanceMetricsPanel />);

        // Date pickers should appear after clicking Custom
        const customBtn = screen.getByText('Custom');
        await userEvent.click(customBtn);

        // Check for date inputs by ID
        const startInput = document.getElementById('cp-start');
        const endInput = document.getElementById('cp-end');

        expect(startInput).toBeTruthy();
        expect(endInput).toBeTruthy();
    });

    // ---- Summary cards ----

    it('renders summary KPI cards with correct values', () => {
        (useAgentMetrics as any).mockReturnValue({ data: mockReport, isLoading: false, error: null });

        render(<AgentPerformanceMetricsPanel />);

        expect(screen.getByText(/Total Roles/i)).toBeInTheDocument();
        expect(screen.getByText(/Active Roles/i)).toBeInTheDocument();
        expect(screen.getByText('Activities')).toBeInTheDocument();
        // Verify completion count shows expected value from mock report
        expect(screen.getByText('87.5%')).toBeInTheDocument();
    });

    it('displays overall completion rate in summary', () => {
        (useAgentMetrics as any).mockReturnValue({ data: mockReport, isLoading: false, error: null });

        render(<AgentPerformanceMetricsPanel />);

        // Verify percentages appear on the page (from KPI cards and role breakdown table)
        const percentageTexts = screen.queryAllByText(/\d+\.?\d*%/);
        expect(percentageTexts.length).toBeGreaterThan(0);
    });

    // ---- Throughput chart ----

    it('renders throughput chart title', () => {
        (useAgentMetrics as any).mockReturnValue({ data: mockReport, isLoading: false, error: null });

        render(<AgentPerformanceMetricsPanel />);

        expect(screen.getByText(/Throughput Trends/i)).toBeInTheDocument();
    });

    it('shows legend items in chart', () => {
        (useAgentMetrics as any).mockReturnValue({ data: mockReport, isLoading: false, error: null });

        render(<AgentPerformanceMetricsPanel />);

        // Legend contains labels for Total Activities, Completed, Completion Rate
        expect(screen.getByText(/Total Activities/i)).toBeInTheDocument();
    });

    // ---- Role breakdown ----

    it('renders role breakdown header', () => {
        (useAgentMetrics as any).mockReturnValue({ data: mockReport, isLoading: false, error: null });

        render(<AgentPerformanceMetricsPanel />);

        expect(screen.getByText(/Performance Breakdown by Role/i)).toBeInTheDocument();
    });

    it('shows role names in the breakdown section', () => {
        (useAgentMetrics as any).mockReturnValue({ data: mockReport, isLoading: false, error: null });

        render(<AgentPerformanceMetricsPanel />);

        // Strategy label appears once via ROLE_LABELS mapping
        const strategyLabels = screen.queryAllByText(/Strategy/);
        expect(strategyLabels.length).toBeGreaterThan(0);
    });

    it('displays completion percentages in role breakdown', () => {
        (useAgentMetrics as any).mockReturnValue({ data: mockReport, isLoading: false, error: null });

        render(<AgentPerformanceMetricsPanel />);

        // Each role should have a completion rate percentage displayed
        const allPercentages = screen.queryAllByText(/\d+\.\d+%/);
        expect(allPercentages.length).toBeGreaterThan(0);
    });

    // ---- Loading state ----

    it('shows skeleton loaders when loading', () => {
        (useAgentMetrics as any).mockReturnValue({
            data: undefined,
            isLoading: true,
            error: null,
        });

        render(<AgentPerformanceMetricsPanel />);

        // Skeleton loaders should appear (at least 3 per original layout)
        const skeletons = document.querySelectorAll('.skeleton');
        expect(skeletons.length).toBeGreaterThanOrEqual(3);
    });

    // ---- Error state ----

    it('shows error message when data fetch fails', () => {
        (useAgentMetrics as any).mockReturnValue({
            data: null,
            isLoading: false,
            error: new Error('Network error'),
        });

        render(<AgentPerformanceMetricsPanel />);

        expect(screen.getByText(/Failed to load performance metrics/i)).toBeInTheDocument();
        expect(screen.getByText(/Network error/i)).toBeInTheDocument();
    });
});
