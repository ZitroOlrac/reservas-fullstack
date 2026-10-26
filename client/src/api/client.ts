import type { Attendee, AuthResponse, ClassType, GymClass, NewClass, User } from './types';

/** Error de la API con el código estable que devuelve el servidor (CLASS_FULL, OVERLAP…). */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields: Record<string, string>;

  constructor(status: number, code: string, message: string, fields: Record<string, string> = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

const TOKEN_KEY = 'pulso:token';

export const tokenStore = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string | null): void {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      // Sin almacenamiento: la sesión dura lo que la pestaña.
    }
  },
};

/** fetch con el token, JSON y errores normalizados. */
export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = tokenStore.get();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body) headers.set('Content-Type', 'application/json');

  let res: Response;
  try {
    res = await fetch(`/api${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, 'NETWORK', 'No se pudo conectar con el servidor.');
  }

  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const error = body?.error ?? {};
    throw new ApiError(res.status, error.code ?? 'UNKNOWN', error.message ?? 'Algo salió mal.', error.fields);
  }
  return body as T;
}

const json = (method: string, data?: unknown): RequestInit => ({
  method,
  body: data === undefined ? undefined : JSON.stringify(data),
});

export const api = {
  login: (email: string, password: string) =>
    request<AuthResponse>('/auth/login', json('POST', { email, password })),
  register: (name: string, email: string, password: string) =>
    request<AuthResponse>('/auth/register', json('POST', { name, email, password })),
  me: () => request<User>('/me'),
  myBookings: () => request<GymClass[]>('/me/bookings'),

  classes: (params: { from?: string; days?: number; type?: ClassType } = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v !== undefined && query.set(k, String(v)));
    return request<GymClass[]>(`/classes?${query}`);
  },
  createClass: (data: NewClass) => request<GymClass>('/classes', json('POST', data)),
  deleteClass: (id: number) => request<void>(`/classes/${id}`, json('DELETE')),
  attendees: (id: number) => request<Attendee[]>(`/classes/${id}/attendees`),

  book: (id: number) => request<GymClass>(`/classes/${id}/booking`, json('POST')),
  cancel: (id: number) => request<GymClass>(`/classes/${id}/booking`, json('DELETE')),
};
