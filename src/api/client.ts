import type { AuthResponse, ProblemDetails, UserDto } from '../types/api';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '/api/v1';

const REFRESH_TOKEN_STORAGE_KEY = 'drinks_refresh_token';
const USER_STORAGE_KEY = 'drinks_auth_user';

let memoryAccessToken: string | null = null;
let refreshPromise: Promise<AuthResponse | null> | null = null;
let authStateChangeListeners: Array<() => void> = [];

export class ApiError extends Error {
  status: number;
  code: string;
  title: string;
  detail: string;
  errors: Record<string, string[]>;

  constructor(params: {
    status: number;
    code?: string;
    title?: string;
    detail?: string;
    errors?: Record<string, string[]>;
  }) {
    const message = params.detail || params.title || `Request failed with status ${params.status}`;
    super(message);
    this.name = 'ApiError';
    this.status = params.status;
    this.code = params.code || 'unknown_error';
    this.title = params.title || 'Request Failed';
    this.detail = message;
    this.errors = params.errors || {};
  }
}

export function onAuthStateChange(listener: () => void): () => void {
  authStateChangeListeners.push(listener);
  return () => {
    authStateChangeListeners = authStateChangeListeners.filter((l) => l !== listener);
  };
}

function notifyAuthChange(): void {
  for (const listener of authStateChangeListeners) {
    listener();
  }
}

export function getAccessToken(): string | null {
  return memoryAccessToken;
}

export function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function getStoredUser(): UserDto | null {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UserDto) : null;
  } catch {
    return null;
  }
}

export function setAuthSession(auth: AuthResponse): void {
  memoryAccessToken = auth.accessToken;
  try {
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, auth.refreshToken);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(auth.user));
  } catch {
    // ignore storage errors
  }
  notifyAuthChange();
}

export function updateStoredUser(user: UserDto): void {
  try {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } catch {
    // ignore
  }
  notifyAuthChange();
}

export function clearAuthSession(): void {
  memoryAccessToken = null;
  try {
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  } catch {
    // ignore
  }
  notifyAuthChange();
}

export async function refreshAccessTokenSingleFlight(): Promise<AuthResponse | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearAuthSession();
    return null;
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        clearAuthSession();
        return null;
      }

      const data = (await response.json()) as AuthResponse;
      setAuthSession(data);
      return data;
    } catch {
      clearAuthSession();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function parseErrorResponse(response: Response): Promise<ApiError> {
  let problem: ProblemDetails | null = null;
  try {
    const text = await response.text();
    if (text) {
      problem = JSON.parse(text) as ProblemDetails;
    }
  } catch {
    // Not JSON
  }

  const fieldErrors = problem?.errors || {};
  const firstFieldError = Object.values(fieldErrors).flat()[0];

  return new ApiError({
    status: problem?.status ?? response.status,
    code: problem?.code ?? (response.status === 401 ? 'unauthorized' : 'http_error'),
    title: problem?.title ?? (response.statusText || 'Error'),
    detail: problem?.detail || firstFieldError || problem?.title || `HTTP ${response.status}`,
    errors: fieldErrors,
  });
}

export interface RequestOptions {
  headers?: Record<string, string>;
  skipAuthRefresh?: boolean;
  signal?: AbortSignal;
}

export async function apiRequest<T>(
  method: string,
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  const buildHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(options.headers || {}),
    };
    if (!isFormData && body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    if (memoryAccessToken) {
      headers['Authorization'] = `Bearer ${memoryAccessToken}`;
    }
    return headers;
  };

  const executeFetch = () =>
    fetch(url, {
      method,
      headers: buildHeaders(),
      body: isFormData ? (body as FormData) : body !== undefined ? JSON.stringify(body) : undefined,
      signal: options.signal,
    });

  let response = await executeFetch();

  if (
    response.status === 401 &&
    !options.skipAuthRefresh &&
    !path.startsWith('/auth/login') &&
    !path.startsWith('/auth/register') &&
    !path.startsWith('/auth/refresh')
  ) {
    const refreshed = await refreshAccessTokenSingleFlight();
    if (refreshed) {
      response = await executeFetch();
    }
  }

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

export const apiGet = <T>(path: string, options?: RequestOptions) =>
  apiRequest<T>('GET', path, undefined, options);

export const apiPost = <T>(path: string, body?: unknown, options?: RequestOptions) =>
  apiRequest<T>('POST', path, body, options);

export const apiPut = <T>(path: string, body?: unknown, options?: RequestOptions) =>
  apiRequest<T>('PUT', path, body, options);

export const apiDelete = <T>(path: string, options?: RequestOptions) =>
  apiRequest<T>('DELETE', path, undefined, options);
