console.log('[patient] module loaded')

import { auth, db } from './firebase'
import { createUserWithEmailAndPassword, deleteUser, sendEmailVerification } from 'firebase/auth'
import { doc, setDoc, serverTimestamp, deleteDoc } from 'firebase/firestore'
import { isValidRut, normalizeRut } from './rut'

export type Prevision = 'Fonasa' | 'Isapre' | 'Particular'
export interface PatientProfile {
  uid: string
  email: string
  nombres: string
  apellidoPaterno: string
  apellidoMaterno: string
  rut: string                 // 12345678-9 (normalizado)
  fechaNacimiento: string     // YYYY-MM-DD
  prevision: Prevision
  isapre?: string
  status: 'active' | 'disabled'
  createdAt: any
  lastLoginAt: any
}

async function waitForPatientClaim(msTimeout = 8000): Promise<boolean> {
  const start = Date.now()
  while (Date.now() - start < msTimeout) {
    const u = auth.currentUser
    if (!u) break
    const t = await u.getIdTokenResult(true)
    if ((t.claims as any)?.role === 'patient') return true
    await new Promise(r => setTimeout(r, 500))
  }
  return false
}

export async function registerPatientWithEmail(input: {
  email: string
  password: string
  nombres: string
  apellidoPaterno: string
  apellidoMaterno: string
  rut: string
  fechaNacimiento: string
  prevision: Prevision
  isapre?: string
}) {

  const email = input.email.trim().toLowerCase()

  console.log('[register] start with', email)

  if (input.password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.')
  if (!isValidRut(input.rut)) throw new Error('RUT inválido.')
  if (input.prevision === 'Isapre' && !input.isapre) throw new Error('Selecciona tu Isapre.')

  // 1) Auth
  const cred = await createUserWithEmailAndPassword(auth, email, input.password)
  const uid = cred.user.uid

   console.log('[register] user created uid=', uid)  // ⬅️ LOG #2


  const now = serverTimestamp()
  const rutKey = normalizeRut(input.rut)

  // 2) Índice de RUT (reglas impiden duplicados)
  try {
    await setDoc(doc(db, 'rutIndex', rutKey), { uid })
  } catch (e: any) {
    // Si no pudimos reclamar el RUT, deshacemos la cuenta de Auth creada recién
    try { await deleteUser(cred.user) } catch { /* ignora si falla */ }

    if (e?.code === 'permission-denied') {
      throw new Error('RUT ya registrado en el sistema.')
    }
    throw e
  }

  const patient = {
    uid,
    email,
    nombres: input.nombres.trim(),
    apellidoPaterno: input.apellidoPaterno.trim(),
    apellidoMaterno: input.apellidoMaterno.trim(),
    rut: rutKey,
    fechaNacimiento: input.fechaNacimiento,
    prevision: input.prevision,
    status: 'active',
    createdAt: now,
    lastLoginAt: now,
    ...(input.prevision === 'Isapre' ? { isapre: input.isapre } : {}), // <--- clave
  } as const

  try {
    await setDoc(doc(db, 'patients', uid), patient, { merge: true })

    console.log('[register] patients doc written')

    try {
      await auth.currentUser?.getIdToken(true)
      await waitForPatientClaim()
    } catch (e) {
      console.warn('No se pudo refrescar el ID token:', e)
    }
  } catch (e) {
    // rollback: liberar el índice y, opcional, borrar el usuario
    try { await deleteDoc(doc(db, 'rutIndex', rutKey)) } catch {}
    try { await deleteUser(cred.user) } catch {}
    throw e
  }

  /** ——— Envío de verificación (registro) ——— */
  try {
    await sendEmailVerification(cred.user, {
      url: `${window.location.origin}/login`, // o /app si prefieres
    })
    console.log('[register] sendEmailVerification ok → enviado a', email)
  } catch (err: any) {
    console.error('[register] ERROR sendEmailVerification:', err?.code, err?.message || err)
  }

  return cred.user
}