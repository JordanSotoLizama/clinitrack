import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { db, app } from './firebase'
import { getFunctions, httpsCallable } from 'firebase/functions'

export type StaffRole = 'admin' | 'medico' | 'recepcion' | 'laboratorio'

export interface Perfil {
  uid: string
  email: string | null
  role: StaffRole
}

/** Payload para crear médico vía Cloud Function createDoctor */
export interface CreateDoctorPayload {
  email: string
  password: string
  firstName: string
  lastName: string
  specialty: string
  defaultSlotMins?: 15 | 20 | 30 | 45 | 60
  phone?: string
  room?: string
}

const fns = getFunctions(app, 'southamerica-east1') // ⚠️ misma región del deploy

export async function listProfiles(): Promise<Perfil[]> {
  const q = query(collection(db, 'users'), orderBy('email'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => {
    const x = d.data() as any
    return {
      uid: x.uid ?? d.id,
      email: x.email ?? null,
      role: (x.role ?? 'recepcion') as StaffRole,
    }
  })
}

export async function createStaff(email: string, password: string, role: StaffRole) {
  const call = httpsCallable(fns, 'createStaffUser')
  const res = await call({ email, password, role })
  return (res.data as any).uid as string
}

export async function deleteStaff(uid: string) {
  const call = httpsCallable(fns, 'deleteStaffUser')
  await call({ uid })
}

/* ========= NUEVOS WRAPPERS ========= */

/** Crea un médico (Cloud Function createDoctor). Devuelve { uid }. */
export async function createDoctor(payload: CreateDoctorPayload): Promise<{ uid: string }> {
  const call = httpsCallable(fns, 'createDoctor')
  const { data }: any = await call(payload)
  return data as { uid: string }
}

/** Genera horarios para un médico en un rango de fechas (Cloud Function generateSlots). */
export async function generateSlots(args: {
  doctorUid?: string
  fromDateISO: string // "YYYY-MM-DD"
  toDateISO: string   // "YYYY-MM-DD"
  slotMins?: number
}): Promise<{ ok: true; created: number }> {
  const call = httpsCallable(fns, 'generateSlots')
  const { data }: any = await call(args)
  return data as { ok: true; created: number }
}