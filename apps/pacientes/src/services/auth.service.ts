// apps/pacientes/src/services/auth.service.ts
import { http } from './http'

// Los datos que enviaremos al backend para registrar
export type RegisterPayload = {
  nombre: string
  apellido: string
  email: string
  password: string
}

// Lo que esperas que te devuelva el backend (ajústalo si tu API devuelve otros campos)
export type RegisterResponse = {
  id?: string
  email?: string
  // agrega aquí más campos si tu backend los incluye (token, nombre, etc.)
}

/**
 * Registra un paciente en el backend.
 * IMPORTANTE: Ajusta la ruta '/auth/register' si tu API usa otra, por ejemplo '/pacientes/register'.
 */
export function registerPatient(payload: RegisterPayload) {
  return http('/post', { method: 'POST', body: payload })
}