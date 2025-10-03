import { auth, db } from './firebase'
import { createUserWithEmailAndPassword, deleteUser } from 'firebase/auth'
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
  if (input.password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.')
  if (!isValidRut(input.rut)) throw new Error('RUT inválido.')
  if (input.prevision === 'Isapre' && !input.isapre) throw new Error('Selecciona tu Isapre.')

  // 1) Auth
  const cred = await createUserWithEmailAndPassword(auth, email, input.password)
  const uid = cred.user.uid
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
  } catch (e) {
    // rollback: liberar el índice y, opcional, borrar el usuario
    try { await deleteDoc(doc(db, 'rutIndex', rutKey)) } catch {}
    try { await deleteUser(cred.user) } catch {}
    throw e
  }

  return cred.user
}