'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient as createSupabaseClient } from '@/lib/supabase-browser';
import type { User } from '@supabase/supabase-js';

const supabase = createSupabaseClient();

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        // Check active session (now syncs with cookies via @supabase/ssr)
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            setLoading(false);
        }).catch((err) => {
            console.error('auth-provider: getSession failed:', err.message);
            setLoading(false);
        });

        // Listen for auth changes — now persisted to cookies automatically
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signIn = async (email: string, password: string) => {
        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) {
                console.error('[auth] signIn error:', error);
                throw new Error(error.message || 'Sign in failed');
            }
        } catch (e: any) {
            console.error('[auth] signIn exception:', e);
            // Re-throw to be caught by the calling component
            throw e;
        }
    };

    const signUp = async (email: string, password: string) => {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo:
                    process.env.NEXT_PUBLIC_SITE_URL ||
                    'https://mission-control-dashboard-op-ai-gokus-projects.vercel.app/auth/callback',
            },
        });
        if (error) throw error;
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    return <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    return useContext(AuthContext);
}
