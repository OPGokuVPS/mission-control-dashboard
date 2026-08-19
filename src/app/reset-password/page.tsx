'use client';

import { useState, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

/* ── Icons ─────────────────────────────────────────────── */
const LockIcon = () => (
    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
);
const EyeOpenIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
);
const EyeOffIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
);
const SpinnerIcon = () => (
    <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
);
const AlertIcon = () => (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);
const CheckCircleIcon = () => (
    <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

export default function ResetPasswordPage() {
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const next = searchParams.get('next') || '/';

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError('');

        if (password !== confirm) {
            setError('Passwords do not match');
            return;
        }
        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        setLoading(true);
        try {
            const { error: updateError } = await supabase.auth.updateUser({ password });
            if (updateError) throw updateError;
            setSuccess(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update password');
        } finally {
            setLoading(false);
        }
    }

    // After success, sign out all sessions and redirect to login
    const handleSignIn = async () => {
        setLoading(true);
        try {
            await supabase.auth.signOut();
            router.push('/login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 px-4">
            <div className="max-w-md w-full space-y-8">
                {success ? (
                    <div className="bg-white/10 border border-green-500/30 rounded-2xl p-8 text-center space-y-6">
                        <div className="flex justify-center">{/* ...CheckCircleIcon... */}</div>
                        <h2 className="text-xl font-semibold text-white">Password updated</h2>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            Your password has been changed successfully. You can now sign in with your new password.
                        </p>
                        <button
                            onClick={handleSignIn}
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-indigo-400 disabled:to-purple-400 text-white font-semibold py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-500/25"
                        >
                            {loading ? <span className="flex items-center justify-center gap-2"><SpinnerIcon /> Redirecting...</span> : 'Go to Sign In'}
                        </button>
                    </div>
                ) : (
                    <div className="bg-white/10 border border-slate-200/30 rounded-2xl p-8 space-y-6">
                        <div className="flex justify-start">
                            <a href="/login" className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                Back to login
                            </a>
                        </div>

                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-600/20 mb-4">
                                <LockIcon />
                            </div>
                            <h1 className="text-3xl font-bold text-white">Reset password</h1>
                            <p className="text-slate-400 mt-2">Choose a new password for your account</p>
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg text-sm">
                                <AlertIcon />{error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1.5">New password</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><LockIcon /></div>
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={8}
                                        className="w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white/5 text-white placeholder-slate-400"
                                        placeholder="Min 8 characters"
                                        autoComplete="new-password"
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white transition-colors">
                                        {showPassword ? <EyeOffIcon /> : <EyeOpenIcon />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label htmlFor="confirm" className="block text-sm font-medium text-slate-300 mb-1.5">Confirm new password</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><LockIcon /></div>
                                    <input
                                        id="confirm"
                                        type={showConfirm ? 'text' : 'password'}
                                        value={confirm}
                                        onChange={(e) => setConfirm(e.target.value)}
                                        required
                                        className="w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white/5 text-white placeholder-slate-400"
                                        placeholder="Re-enter new password"
                                        autoComplete="new-password"
                                    />
                                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white transition-colors">
                                        {showConfirm ? <EyeOffIcon /> : <EyeOpenIcon />}
                                    </button>
                                </div>
                            </div>

                            <p className="text-xs text-slate-400">Password must be at least 8 characters.</p>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-indigo-400 disabled:to-purple-400 text-white font-semibold py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-500/25"
                            >
                                {loading ? <span className="flex items-center justify-center gap-2"><SpinnerIcon /> Updating...</span> : 'Update Password'}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
