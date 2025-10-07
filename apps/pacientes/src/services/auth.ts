import { auth } from './firebase'
import { onAuthStateChanged, signInWithEmailAndPassword, type User, signOut, sendPasswordResetEmail } from 'firebase/auth'

export function getCurrentUser(): Promise<User | null> {
  return new Promise(resolve => {
    const unsub = onAuthStateChanged(auth, u => {
      unsub()
      resolve(u)
    })
  })
}

export async function logout() {
  await signOut(auth)
}

export async function loginWithEmail(email: string, password: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password)

  // refrescamos token para cargar custom claims actualizados
  await cred.user.getIdToken(true)

  const tok = await cred.user.getIdTokenResult()
  const role = (tok.claims as any)?.role

  // Bloquea cuentas staff en la app de pacientes
  if (role !== 'patient') {
    await signOut(auth)
    throw new Error('Esta cuenta pertenece al staff. Inicia sesión en el portal del staff.')
  }

  return cred.user
}

/**
 * Envía un correo de restablecimiento de contraseña.
 * - email: se normaliza a minúsculas y trim.
 * - url de retorno: te lleva al /login una vez completado el flujo.
 */

export async function requestPasswordReset(email: string) {
  const e = email.trim().toLowerCase()
  // idioma del correo (opcional)
  try { auth.languageCode = 'es' } catch {}
  await sendPasswordResetEmail(auth, e, {
    url: `${window.location.origin}/login`,
  })
}