import { Platform } from 'react-native';

// React Native Android emulator maps localhost to 10.0.2.2.
// Web and iOS simulator can use standard localhost.
const BASE_URL = Platform.OS === 'android'
  ? process.env.EXPO_PUBLIC_API_URL_ANDROID ?? 'http://10.0.2.2:4000'
  : process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

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
    console.error('API Error (Resolve):', err);
    return null;
  }
}
