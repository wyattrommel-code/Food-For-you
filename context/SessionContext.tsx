import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

function useSessionState() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    /**
     * `getSession()` returns AsyncStorage immediately — often with an expired
     * access_token. PostgREST then returns PGRST303 until refresh runs. We
     * await a refresh (or sign out) before exposing the session to the app.
     */
    async function boot() {
      try {
        const {
          data: { session: local },
        } = await supabase.auth.getSession();
        if (!mounted) return;

        if (local?.refresh_token) {
          const { data, error } = await supabase.auth.refreshSession();
          if (!mounted) return;
          if (error || !data.session) {
            await supabase.auth.signOut();
            setSession(null);
          } else {
            setSession(data.session);
          }
        } else {
          setSession(local);
        }
      } catch {
        if (mounted) setSession(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void boot();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, next) => {
      if (!mounted) return;
      // First load is handled by `boot()` so we never apply a stale INITIAL_SESSION.
      if (event === 'INITIAL_SESSION') return;
      setSession(next);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return {
    session,
    loading,
    userId: session?.user?.id ?? null,
  };
}

const Context=createContext<ReturnType<typeof useSessionState>|null>(null);
export function SessionProvider({children}:{children:React.ReactNode}) {
  const value=useSessionState();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useSession() {
  const value=useContext(Context);
  if(!value)throw Error('SessionProvider is required');
  return value;
}
