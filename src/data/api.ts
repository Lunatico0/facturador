import type { BusinessProfile, Client, Invoice, Quote, Revision } from '../domain/types'

const TOKEN_KEY = 'cotizador-token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

async function http<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getToken()
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })
  if (res.status === 401 && url !== '/api/auth/login') {
    setToken(null)
    window.dispatchEvent(new Event('auth:expired'))
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error((body as { error?: string } | null)?.error ?? `Error HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

function collection<T extends { id: string }>(name: string) {
  return {
    list: () => http<T[]>(`/api/${name}`),
    get: (id: string) => http<T>(`/api/${name}/${id}`),
    save: (item: T) => http<T>(`/api/${name}/${item.id}`, { method: 'PUT', body: JSON.stringify(item) }),
    remove: (id: string) => http<{ ok: boolean }>(`/api/${name}/${id}`, { method: 'DELETE' }),
    revisions: (id: string) => http<Revision<T>[]>(`/api/${name}/${id}/revisions`),
  }
}

export const api = {
  auth: {
    login: (password: string) =>
      http<{ token: string }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ password }) }),
    logout: () => http<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),
    changePassword: (currentPassword: string, newPassword: string) =>
      http<{ token: string }>('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      }),
  },
  profile: {
    get: () => http<BusinessProfile | null>('/api/profile'),
    save: (profile: BusinessProfile) =>
      http<BusinessProfile>('/api/profile', { method: 'PUT', body: JSON.stringify(profile) }),
  },
  clients: collection<Client>('clients'),
  quotes: collection<Quote>('quotes'),
  invoices: collection<Invoice>('invoices'),
  backup: {
    export: () => http<Record<string, unknown>>('/api/backup'),
    import: (data: unknown) => http<{ ok: boolean }>('/api/backup', { method: 'POST', body: JSON.stringify(data) }),
  },
}
