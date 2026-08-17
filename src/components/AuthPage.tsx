'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-provider';
import { useRouter, useSearchParams } from 'next/navigation';
import type { FormEvent } from 'react';

export function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showSignup, setShowSignup] = useState(false);
    const { signIn } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const nextPath = searchParams.get('next') || '/';

    async function handleSignIn(e: FormEvent) {
        e.preventDefault();
        setLoading(true);
        try {
            await signIn(email, password);
            router.push(nextPath);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Sign in failed');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 px-4">
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-600 mb-4">
                        <span className="text-3xl">🚀</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Mission Control</h1>
                    <p className="text-slate-400">Autonomous AI Software Factory</p>
                </div>

                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-8">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">
                        {showSignup ? 'Create Account' : 'Sign In'}
                    </h2>

                    <form onSubmit={handleSignIn} className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Email address
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                placeholder="you@example.com"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                placeholder="••••••••"
                                required
                                minLength={8}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !email || !password}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 rounded-lg font-medium transition-colors"
                        >
                            {loading ? 'Signing in...' : showSignup ? 'Create account' : 'Sign in'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <button
                            onClick={() => setShowSignup(!showSignup)}
                            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                            {showSignup ? 'Already have an account? Sign in' : "Don't have an account? Create one"}
                        </button>
                    </div>

                    <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                        <p className="text-xs text-center text-slate-500 dark:text-slate-400">
                            By continuing you agree to our terms of service.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}