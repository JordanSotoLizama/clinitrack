/**
 * Servicio de Citas y Slots (MVP future-proof)
 *
 * Colecciones:
 *  - doctor_slots/{slotId}:
 *      { doctorId, doctorName?, specialty, startIso, endIso, status, patientUid?, updatedAt }
 *      status ∈ 'available' | 'requested' | 'booked' | 'cancelled' | 'blocked'
 *
 *  - appointments/{appointmentId}:
 *      id = `${slotId}_${uid}`  // único por (slot, paciente)
 *      { uid, slotId, specialty, status, createdAt, updatedAt }
 *      status ∈ 'requested' | 'confirmed' | 'cancelled'
 *
 * Email (opcional, listo para extensión "Trigger Email"):
 *  - mail/{autoId}: { to, message: { subject, text, html }, ... }
 */
import { getApp } from 'firebase/app'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { db } from '@/services/firebase'
import { getCurrentUser } from '@/services/auth'
import {
  collection, doc, getDoc, setDoc, updateDoc, onSnapshot,
  query, where, runTransaction, serverTimestamp, type Unsubscribe, limit,
  orderBy, startAt, endAt, Timestamp
} from 'firebase/firestore'

export type AppointmentStatus = 'requested' | 'confirmed' | 'cancelled'
export type SlotStatus = 'available' | 'requested' | 'booked' | 'cancelled' | 'blocked'
export type Specialty = 'General' | 'Traumatología' | 'Laboratorio'

const SLOTS_COL = 'doctor_slots'
const APPTS_COL = 'appointments'

export interface DoctorSlot {
  id: string
  doctorId: string
  doctorName?: string
  specialty: Specialty
  startIso: string // ISO-8601 (UTC)
  endIso: string   // ISO-8601 (UTC)
  status: SlotStatus
  patientUid?: string | null
  updatedAt?: Timestamp
}

export interface Appointment {
  id: string
  uid: string
  slotId: string
  specialty: Specialty
  status: AppointmentStatus
  createdAt?: Timestamp
  updatedAt?: Timestamp
}

/** Id canónico de appointment → evita duplicados paciente/slot. */
function apptId(slotId: string, uid: string) {
  return `${slotId}_${uid}`
}

/** ---- Slots disponibles (realtime, simple) ---- */
export async function subscribeAvailableSlots(
  cb: (slots: any[]) => void,
  opts?: { max?: number }
): Promise<Unsubscribe> {
  const qSlots = query(
    collection(db, 'doctor_slots'),
    where('status', '==', 'open'),
    // sin orderBy => no pide índice
    limit(opts?.max ?? 100)
  )
  return onSnapshot(qSlots, (snap) => {
    const items = snap.docs.map(d => {
      const x = d.data() as any
      return { id: d.id, ...x, startIso: x.dateISO }
    })
    // ordenamos en cliente por fecha
    items.sort((a, b) => (a.dateISO ?? '').localeCompare(b.dateISO ?? ''))
    cb(items)
  })
}

/** ---- Slots disponibles por rango (recomendado: por médico) ---- */
export async function subscribeAvailableSlotsInRange(
  doctorUid: string,        // <-- NUEVO
  fromIso: string,
  toIso: string,
  cb: (slots: any[]) => void,
  opts?: { max?: number }
): Promise<Unsubscribe> {
  const qSlots = query(
    collection(db, 'doctor_slots'),
    where('doctorUid', '==', doctorUid),   // <-- NUEVO
    where('status', '==', 'open'),
    where('dateISO', '>=', fromIso),
    where('dateISO', '<=', toIso),
    orderBy('dateISO', 'asc'),
    limit(opts?.max ?? 200)
  )
  return onSnapshot(qSlots, (snap) => {
    const items = snap.docs.map(d => {
      const x = d.data() as any
      return { id: d.id, ...x, startIso: x.dateISO }
    })
    cb(items)
  })
}

/** ---- Mis citas (realtime) ---- */
export async function subscribeMyAppointments(
  cb: (list: any[]) => void
): Promise<Unsubscribe> {
  const u = await getCurrentUser()
  if (!u) throw new Error('No hay sesión activa')

  // SIN orderBy => no requiere índice compuesto
  const qAppts = query(
    collection(db, APPTS_COL),
    where('patientUid', '==', u.uid)
  )

  return onSnapshot(qAppts, (snap) => {
    const items = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
    // ordena en cliente (más nuevo primero)
    items.sort((a, b) => (b.dateISO ?? '').localeCompare(a.dateISO ?? ''))
    cb(items)
  })
}

/** ---- Agendar (transacción) ----
 * 1) Verifica slot.status === 'available'
 * 2) Bloquea re-agendar: si ya existe una cita propia para ese slot con status 'cancelled' → error
 * 3) slot → 'requested', patientUid = uid
 * 4) appointment (merge) → 'requested'
 */

/** ---- Reservar (vía Cloud Function) ---- */
export async function requestAppointmentBySlotId(slotId: string): Promise<any> {
  const u = await getCurrentUser()
  if (!u) throw new Error('No hay sesión activa')

  const fn = httpsCallable(getFunctions(undefined, 'southamerica-east1'), 'bookSlot')
  const { data }: any = await fn({ slotId })
  // data: { ok: true, appointmentId: string }
  return { id: data.appointmentId, slotId, status: 'reserved', patientUid: u.uid }
}
/** ---- Cancelar (transacción) ----
 * Cita → 'cancelled' y, si el slot sigue ligado al paciente y no se "bookeó" por staff,
 * el slot vuelve a 'open'.
 */

export async function cancelAppointmentById(appointmentId: string): Promise<void> {
  if (!appointmentId) throw new Error('appointmentId requerido')

  const functions = getFunctions(getApp(), 'southamerica-east1') // <-- usa la app inicializada
  const cancelFn = httpsCallable<{ appointmentId: string }, { ok: true }>(
    functions,
    'cancelMyAppointment' // <-- que coincida EXACTO con el export
  )

  await cancelFn({ appointmentId })
}

// Trae slots 'open' para un día (YYYY-MM-DD) y un médico concreto
export async function subscribeOpenSlotsForDay(
  doctorUid: string,
  ymd: string, // '2025-10-14'
  cb: (slots: any[]) => void,
  opts?: { max?: number }
): Promise<Unsubscribe> {
  const fromIso = `${ymd}T00:00:00.000Z`
  const toIso   = `${ymd}T23:59:59.999Z`

  const qSlots = query(
    collection(db, SLOTS_COL),
    where('doctorUid', '==', doctorUid),
    where('status', '==', 'open'),
    where('dateISO', '>=', fromIso),
    where('dateISO', '<=', toIso),
    orderBy('dateISO', 'asc'),
    limit(opts?.max ?? 100)
  )

  return onSnapshot(qSlots, (snap) => {
    const items = snap.docs.map(d => {
      const x = d.data() as any
      return { id: d.id, ...x, startIso: x.dateISO } // si tu UI usa startIso
    })
    cb(items)
  })
}

/* ---------- (Opcional) Outbox Email preparado ----------
import { addDoc } from 'firebase/firestore'

async function queueAppointmentEmail(
  kind: 'requested' | 'cancelled',
  appt: Appointment
) {
  const u = await getCurrentUser()
  if (!u?.email) return

  const subject =
    kind === 'requested'
      ? 'Solicitud de cita recibida'
      : 'Cita cancelada'
  const text =
    kind === 'requested'
      ? `Hola, hemos recibido tu solicitud de cita.\nID: ${appt.id}`
      : `Hola, tu cita ha sido cancelada.\nID: ${appt.id}`
  const html = `<p>${text.replace(/\n/g, '<br/>')}</p>`

  await addDoc(collection(db, 'mail'), {
    to: u.email,
    message: { subject, text, html },
  })
}
--------------------------------------------------------- */