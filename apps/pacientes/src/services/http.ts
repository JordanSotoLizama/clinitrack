// apps/pacientes/src/services/http.ts

// URL base de la API. Si no configuras nada en .env, usará http://localhost:3000/api
const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

type HttpOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  headers?: Record<string, string>
}

// Helper genérico para peticiones HTTP
export async function http<T>(path: string, opts: HttpOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = opts

  // Arma la URL final
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`

  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
    //credentials: 'include', // si usas cookies/sesión; si usas JWT puro puedes quitarlo
  })

  let data: any = null
  try { data = await res.json() } catch { /* puede no venir cuerpo */ }

  if (!res.ok) {
    throw new Error(data?.message || `HTTP ${res.status}`)
  }

  return data as T
}
