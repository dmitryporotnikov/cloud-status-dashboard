import { CACHE_REVALIDATE_SECONDS, PROVIDER_TIMEOUT_MS } from './constants';

type ExtendedRequestInit = RequestInit & {
  next?: {
    revalidate?: number;
  };
};

export function normalizeText(text: string | null | undefined): string {
  return text?.replace(/\s+/g, ' ').trim() ?? '';
}

export async function fetchWithTimeout(
  input: string,
  init: ExtendedRequestInit = {},
  timeoutMs = PROVIDER_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal,
      next: {
        revalidate: CACHE_REVALIDATE_SECONDS,
        ...init.next,
      },
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    return response;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Timeout');
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchJsonWithTimeout<T>(
  input: string,
  init: ExtendedRequestInit = {},
  timeoutMs = PROVIDER_TIMEOUT_MS
): Promise<T> {
  const response = await fetchWithTimeout(input, init, timeoutMs);
  return (await response.json()) as T;
}

export async function fetchTextWithTimeout(
  input: string,
  init: ExtendedRequestInit = {},
  timeoutMs = PROVIDER_TIMEOUT_MS
): Promise<string> {
  const response = await fetchWithTimeout(input, init, timeoutMs);
  return response.text();
}
