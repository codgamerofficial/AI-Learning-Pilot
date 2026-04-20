import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export function useCloudState<T>(key: string, initialValue: T | (() => T)): [T, (value: T | ((val: T) => T)) => void] {
  const { session } = useAuth()
  
  // Start with initial state
  const [state, setState] = useState<T>(initialValue)

  // Fetch initial value from Supabase
  useEffect(() => {
    if (!session) return

    const loadState = async () => {
      const { data, error } = await supabase
        .from('user_settings')
        .select('value_json')
        .eq('key', key)
        .single()

      if (data && !error) {
        setState(data.value_json as T)
      }
    }
    
    loadState()
  }, [key, session])

  // Custom setter that syncs to state and Supabase
  const setCloudState = async (value: T | ((val: T) => T)) => {
    try {
      const newValue = value instanceof Function ? value(state) : value
      setState(newValue)
      
      if (!session) return

      await supabase
        .from('user_settings')
        .upsert({
          user_id: session.user.id,
          key,
          value_json: newValue,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id, key' })

    } catch (error) {
      console.warn(`Error setting cloud state for key "${key}":`, error)
    }
  }

  return [state, setCloudState]
}
