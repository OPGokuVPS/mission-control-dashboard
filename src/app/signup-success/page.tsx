'use client';

import { useRouter, useSearchParams } from 'next/navigation';

export default function SignupSuccessPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get('email') || 'your inbox';

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
                            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                            </svg>
                        </div>
                    </div>
                    <h1 className="text-4xl xl:text-5xl font-bold text-white mb-4 tracking-tight">Mission Control</h1>
                    <p className="text-lg text-slate-400 leading-relaxed">Autonomous AI Software Factory Dashboard.</p>
                </div>
            </div>

            {/* RIGHT: Success Panel */}
            <div className="flex-1 flex items-center justify-center bg-white p-8 xl:p-12">
                <div className="w-full max-w-md text-center">
                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                    </div>
                    <h2 className="text-2xl font-semibold text-slate-900 mb-2">Check your email</h2>
                    <p className="text-slate-500 mb-4 leading-relaxed">
                        We sent a confirmation link to <strong className="text-slate-700">{email}</strong>.
                        Please verify your email address before signing in.
                    </p>
                    <p className="text-xs text-slate-400 mb-8">
                        Can&apos;t find it? Check your spam folder or try signing up again.
                    </p>
                    <a
                        href="/login"
                        className="inline-block w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-500/25"
                    >
                        Go to Sign In
                    </a>
                </div>
            </div>
        </div>
    );
}