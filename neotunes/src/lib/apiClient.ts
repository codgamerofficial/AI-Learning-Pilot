import { Platform, NativeModules } from 'react-native';

const getBaseUrl = (): string => {
  // 1. If explicit env variable is set, use it
  if (Platform.OS === 'android' && process.env.EXPO_PUBLIC_API_URL_ANDROID) {
    return process.env.EXPO_PUBLIC_API_URL_ANDROID;
  }
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // 2. If running on web, we can check location
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return `http://${window.location.hostname}:4000`;
    }
    // In production, the backend is serverless-routed via /api on the same origin
    return `${window.location.origin}/api`;
  }

  // 3. For React Native mobile, extract host from bundle URL
  if (NativeModules.SourceCode?.scriptURL) {
    const scriptURL = NativeModules.SourceCode.scriptURL;
    const match = scriptURL.match(/^(?:https?|exp):\/\/([^:/]+)/);
    if (match && match[1]) {
      const host = match[1];
      // Ignore if it resolves to a local file asset path in release build
      if (host !== 'localhost' && !host.startsWith('file') && !host.includes('/')) {
        return `http://${host}:4000`;
      }
    }
  }

  // 4. Default fallbacks
  return Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000';
};

const BASE_URL = getBaseUrl();

export type ApiProviderError = {
  provider: string;
  error: string;
};

type ApiErrorPayload = {
  error?: string;
  providerErrors?: ApiProviderError[];
};

export class ApiRequestError extends Error {
  status: number;
  providerErrors: ApiProviderError[];

  constructor(message: string, status: number, providerErrors: ApiProviderError[] = []) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.providerErrors = providerErrors;
  }
}

async function buildApiError(response: Response, fallbackMessage: string) {
  let message = fallbackMessage;
  let providerErrors: ApiProviderError[] = [];

  try {
    const payload = (await response.json()) as ApiErrorPayload;
    if (payload?.error) message = payload.error;
    if (Array.isArray(payload?.providerErrors)) providerErrors = payload.providerErrors;
  } catch {
    // Ignore payload parse failures and keep fallback message.
  }

  return new ApiRequestError(message, response.status, providerErrors);
}

export function extractApiError(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiRequestError) {
    return {
      message: error.message,
      providerErrors: error.providerErrors,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message || fallbackMessage,
      providerErrors: [] as ApiProviderError[],
    };
  }

  return {
    message: fallbackMessage,
    providerErrors: [] as ApiProviderError[],
  };
}

export async function fetchSearch(query: string, source: 'youtube' | 'jamendo' | 'spotify' | 'all' = 'all') {
  let response: Response;

  try {
    response = await fetch(`${BASE_URL}/search?q=${encodeURIComponent(query)}&source=${source}`);
  } catch {
    throw new Error('Unable to reach search service.');
  }

  if (!response.ok) {
    throw await buildApiError(response, 'Search request failed.');
  }

  return await response.json();
}

export async function fetchTrending(region: 'global' | 'india' = 'global') {
  let response: Response;

  try {
    response = await fetch(`${BASE_URL}/trending?region=${region}`);
  } catch {
    throw new Error('Unable to reach trending service.');
  }

  if (!response.ok) {
    throw await buildApiError(response, 'Trending request failed.');
  }

  return await response.json();
}

export type ResolveResponse = {
  url?: string | null;
  id?: string;
  resolvedSource?: 'youtube' | 'jamendo' | string;
};

export async function fetchResolve(searchQuery: string): Promise<ResolveResponse | null> {
  try {
    const res = await fetch(`${BASE_URL}/resolve?searchQuery=${encodeURIComponent(searchQuery)}`);
    if (!res.ok) throw new Error('Network response was not ok');
    return (await res.json()) as ResolveResponse;
  } catch (err) {
    if (__DEV__) console.error('API Error (Resolve):', err);
    return null;
  }
}
