'use client';

import { Component, ErrorInfo, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';

interface Props {
    children: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
    severity: 'error' | 'fatal';
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null, severity: 'error' };
    }

    static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error,
            errorInfo: null,
            severity: error.message.includes('fatal') || error.message.includes('FATAL') ? 'fatal' : 'error',
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        const severity = error.message.includes('fatal') || error.message.includes('FATAL') ? 'fatal' : 'error';

        this.setState({ errorInfo, severity });

        // Log to Supabase errors table
        this.logErrorToDb(error, errorInfo, severity);

        // Also log to console for DevMode
        console.error('ErrorBoundary caught:', error, errorInfo);

        // Call parent callback if provided
        this.props.onError?.(error, errorInfo);
    }

    async logErrorToDb(error: Error, errorInfo: ErrorInfo, severity: string) {
        try {
            await supabase.from('errors').insert([{
                service: 'dashboard',
                severity,
                message: error.message,
                metadata_json: {
                    componentStack: errorInfo.componentStack,
                    errorName: error.name,
                    stack: error.stack?.slice(0, 2000),
                    timestamp: new Date().toISOString(),
                },
            }]);
        } catch (e) {
            console.warn('Failed to log error to database:', e);
        }
    }

    render() {
        if (this.state.hasError && this.state.error) {
            if (this.state.severity === 'fatal') {
                return (
                    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 p-4">
                        <div className="bg-white dark:bg-slate-800 border border-red-200 dark:border-red-800 rounded-xl shadow-lg max-w-md w-full p-6 text-center">
                            <div className="text-4xl mb-3">💥</div>
                            <h2 className="text-xl font-bold text-red-800 dark:text-red-300 mb-2">Critical System Error</h2>
                            <p className="text-sm text-red-600 dark:text-red-400 mb-4">{this.state.error.message}</p>
                            <details className="mb-4 text-left text-xs text-red-500 dark:text-red-300 font-mono bg-red-50 dark:bg-red-900/30 p-3 rounded-lg overflow-x-auto">
                                <summary className="cursor-pointer font-medium">View details</summary>
                                <pre className="mt-2 whitespace-pre-wrap break-all">{this.state.error.stack}</pre>
                            </details>
                            <button
                                onClick={() => window.location.reload()}
                                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                            >
                                Reload Application
                            </button>
                        </div>
                    </div>
                );
            }

            return (
                <div className="max-h-[600px] border-l-4 border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 rounded-r-xl p-4 m-4">
                    <h2 className="text-lg font-bold text-red-800 dark:text-red-300 mb-1">Component Error</h2>
                    <p className="text-sm text-red-700 dark:text-red-400 mb-3">{this.state.error.message}</p>
                    <details className="text-xs text-red-600 dark:text-red-400 font-mono bg-red-100 dark:bg-red-900/30 p-2 rounded overflow-x-auto mb-3">
                        <summary className="cursor-pointer font-medium">Stack trace</summary>
                        <pre className="mt-1 whitespace-pre-wrap">{this.state.error.stack}</pre>
                    </details>
                    <button
                        onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                        Try to recover
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}