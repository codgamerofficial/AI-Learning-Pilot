import { createContext, useEffect, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export interface UserProfile {
  id: string
  subscription_status: 'free' | 'pro'
  tokens_used: number
  razorpay_customer_id?: string
  updated_at: string
}

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  isLoading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signup: (data: { name: string; email: string; password: string; emergencyContact: string }) => Promise<{ success: boolean; error?: string }>
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshProfile = useCallback(async () => {
    if (!user) return
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!error && data) {
      setProfile(data as UserProfile)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      refreshProfile()
    } else {
      setProfile(null)
    }
  }, [user, refreshProfile])

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setIsLoading(false)
    })

    // Listen to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`
      }
    })
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const login = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return { success: false, error: error.message }
      return { success: true }
    } catch {
      return { success: false, error: 'Login failed' }
    }
  }

  const signup = async (data: { name: string; email: string; password: string; emergencyContact: string }) => {
    try {
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.name,
            emergency_contact: data.emergencyContact
          }
        }
      })
      if (error) return { success: false, error: error.message }
      return { success: true }
    } catch {
      return { success: false, error: 'Signup failed' }
    }
  }

  return (
    <AuthContext.Provider value={{ user, session, profile, isLoading, signInWithGoogle, signOut, refreshProfile, login, signup }}>
      {children}
    </AuthContext.Provider>
  )
}
