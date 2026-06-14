import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { User, AuthChangeEvent, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  initialize: () => () => void; // returns cleanup function
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true, // start as true so App waits before deciding which screen to show
  setUser: (user) => set({ user }),
  initialize: () => {
    // 1. Get existing session immediately on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({ user: session?.user ?? null, loading: false });
    });

    // 2. Listen for all future auth changes (OTP verify, sign out, token refresh, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        set({ user: session?.user ?? null, loading: false });
      }
    );

    // 3. Return cleanup unsubscribe so React.useEffect can call it on unmount
    return () => subscription.unsubscribe();
  },
}));
