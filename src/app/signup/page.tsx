'use client';

import { useState, FormEvent } from 'react';
import { useAuth } from '@/lib/auth-provider';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

/* ── Inline Icons ─────────────────────────────────────────────── */
const EyeOpenIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
);
const EyeOffIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
);
const SpinnerIcon = () => (
    <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
);
const LogoSvg = ({ size }: { size: 'sm' | 'lg' }) => (
    <svg className={`w-${size === 'sm' ? 5 : 10} h-${size === 'sm' ? 5 : 10} text-white`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
);
const MailIcon = () => <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>;
const LockIcon = () => <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>;
const AlertIcon = () => <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const CheckCircleIcon = () => (
    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);

export default function SignupPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const { signUp } = useAuth();
    const router = useRouter();

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError('');

        if (password !== confirm) { setError('Passwords do not match'); return; }
        if (password.length < 8) { setError('Password must be at least 8 characters'); return; }

        setLoading(true);
        try {
            await signUp(email, password);
            router.push(`/signup-success?email=${encodeURIComponent(email)}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Signup failed');
        } finally {
            setLoading(false);
        }
    }

    async function handleOAuth(provider: 'google' | 'github') {
        setError('');
        setLoading(true);
        try {
            await supabase.auth.signInWithOAuth({
                provider,
                options: { redirectTo: `${window.location.origin}/auth/callback` },
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : `${provider} sign-in failed`);
            setLoading(false);
        }
    }

    return (
        <div className="h-screen flex overflow-hidden bg-slate-950">
            {/* LEFT: Brand Panel */}
            <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 items-center justify-center p-12">
                <div className="grid-bg absolute inset-0"></div>
                <div className="orb orb-1"></div>
                <div className="orb orb-2"></div>

                <div className="relative z-10 max-w-lg text-center">
                    <div className="mb-8 flex justify-center">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/30">
                            <LogoSvg size="lg" />
                        </div>
                    </div>
                    <h1 className="text-4xl xl:text-5xl font-bold text-white mb-4 tracking-tight">Mission Control</h1>
                    <p className="text-lg text-slate-400 mb-10 leading-relaxed">
                        Autonomous AI Software Factory Dashboard.<br />
                        Monitor, direct, and optimize your agent fleet.
                    </p>
                    <div className="flex gap-8 justify-center">
                        <div className="text-center"><div className="text-2xl font-semibold text-white">9</div><div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Agents</div></div>
                        <div className="w-px bg-white/10"></div>
                        <div className="text-center"><div className="text-2xl font-semibold text-white">24/7</div><div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Uptime</div></div>
                        <div className="w-px bg-white/10"></div>
                        <div className="text-center"><div className="text-2xl font-semibold text-white">Auto</div><div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Orchestration</div></div>
                    </div>
                </div>
            </div>

            {/* RIGHT: Form Panel */}
            <div className="flex-1 flex items-center justify-center bg-white p-8 xl:p-12 overflow-y-auto">
                <div className="w-full max-w-md">
                    <div className="lg:hidden mb-8 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center"><LogoSvg size="sm" /></div>
                        <span className="text-lg font-semibold text-slate-900">Mission Control</span>
                    </div>

                    <div className="flex items-center gap-3 mb-1">
                        <div className="h-px bg-slate-200 flex-1"></div>
                        <span className="text-xs font-medium text-indigo-600 uppercase tracking-widest">Registration</span>
                        <div className="h-px bg-slate-200 flex-1"></div>
                    </div>

                    <h2 className="text-2xl font-semibold text-slate-900 mb-1">Create your account</h2>
                    <p className="text-slate-500 mb-8">Join the autonomous AI software factory</p>

                    {/* Social login */}
                    <div className="flex gap-3 mb-6">
                        <button type="button" onClick={() => handleOAuth('google')} disabled={loading} className="social-btn flex-1 flex items-center justify-center gap-2 py-2.5 px-4 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 transition-all duration-200">
                            <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                            Google
                        </button>
                        <button type="button" onClick={() => handleOAuth('github')} disabled={loading} className="social-btn flex-1 flex items-center justify-center gap-2 py-2.5 px-4 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 transition-all duration-200">
                            <svg className="w-4 h-4" fill="#181717" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                            GitHub
                        </button>
                    </div>

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                        <div className="relative flex justify-center text-xs"><span className="bg-white px-3 text-slate-400 uppercase tracking-wider">or sign up with email</span></div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
                                <AlertIcon />{error}
                            </div>
                        )}

                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><MailIcon /></div>
                                <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" placeholder="you@example.com" autoComplete="email" />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><LockIcon /></div>
                                <input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" placeholder="Min 8 characters" autoComplete="new-password" />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors">{showPassword ? <EyeOffIcon /> : <EyeOpenIcon />}</button>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="confirm" className="block text-sm font-medium text-slate-700 mb-1.5">Confirm Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><LockIcon /></div>
                                <input id="confirm" type={showConfirm ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} required className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" placeholder="Re-enter password" autoComplete="new-password" />
                                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors">{showConfirm ? <EyeOffIcon /> : <EyeOpenIcon />}</button>
                            </div>
                        </div>

                        <p className="text-xs text-slate-400">Password must be at least 8 characters. Include letters, numbers, and symbols for a stronger password.</p>

                        <button type="submit" disabled={loading} className="btn-shimmer w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-indigo-400 disabled:to-purple-400 text-white font-semibold py-2.5 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/25">
                            {loading ? <span className="flex items-center justify-center gap-2"><SpinnerIcon /> Creating account...</span> : 'Create Account'}
                        </button>
                    </form>

                    <p className="mt-8 text-center text-sm text-slate-500">Already have an account?{' '}<a href="/login" className="text-indigo-600 hover:text-indigo-500 font-semibold">Sign in</a></p>
                    <p className="mt-6 text-center text-xs text-slate-400">Powered by Supabase Auth · Secure & encrypted</p>
                </div>
            </div>
        </div>
    );
}
