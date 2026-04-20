import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useAsyncStorage<T>(key: string, initialValue: T): [T, (val: T | ((curr: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  useEffect(() => {
    async function loadStoredValue() {
      try {
        const item = await AsyncStorage.getItem(key);
        if (item !== null) {
          setStoredValue(JSON.parse(item));
        }
      } catch (error) {
        console.warn(`Error reading AsyncStorage key "${key}":`, error);
      }
    }
    loadStoredValue();
  }, [key]);

  const setValue = async (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      await AsyncStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.warn(`Error setting AsyncStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
}
