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
  cb: (slots: DoctorSlot[]) => void,
  opts?: { specialty?: Specialty; max?: number }
): Promise<Unsubscribe> {
  const qSlots = query(
    collection(db, SLOTS_COL),
    where('status', '==', 'available'),
    limit(opts?.max ?? 100)
  )
  return onSnapshot(qSlots, (snap) => {
    let items: DoctorSlot[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
    if (opts?.specialty) items = items.filter(s => s.specialty === opts.specialty)
    items.sort((a, b) => a.startIso.localeCompare(b.startIso))
    cb(items)
  })
}

/** ---- Slots disponibles por rango (opcional) ---- */
export async function subscribeAvailableSlotsInRange(
  fromIso: string,
  toIso: string,
  cb: (slots: DoctorSlot[]) => void,
  opts?: { specialty?: Specialty; max?: number }
): Promise<Unsubscribe> {
  let qSlots = query(
    collection(db, SLOTS_COL),
    where('status', '==', 'available'),
    orderBy('startIso', 'asc'),
    startAt(fromIso),
    endAt(toIso),
    limit(opts?.max ?? 200)
  )
  return onSnapshot(qSlots, (snap) => {
    let items: DoctorSlot[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
    if (opts?.specialty) items = items.filter(s => s.specialty === opts.specialty)
    cb(items)
  })
}

/** ---- Mis citas (realtime) ---- */
export async function subscribeMyAppointments(
  cb: (list: Appointment[]) => void
): Promise<Unsubscribe> {
  const u = await getCurrentUser()
  if (!u) throw new Error('No hay sesión activa')
  const qAppts = query(collection(db, APPTS_COL), where('uid', '==', u.uid))
  return onSnapshot(qAppts, (snap) => {
    const items: Appointment[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
    items.sort((a, b) => a.id.localeCompare(b.id))
    cb(items)
  })
}

/** ---- Agendar (transacción) ----
 * 1) Verifica slot.status === 'available'
 * 2) Bloquea re-agendar: si ya existe una cita propia para ese slot con status 'cancelled' → error
 * 3) slot → 'requested', patientUid = uid
 * 4) appointment (merge) → 'requested'
 */
export async function requestAppointmentBySlotId(slotId: string): Promise<Appointment> {
  const u = await getCurrentUser()
  if (!u) throw new Error('No hay sesión activa')

  const appt = await runTransaction(db, async (tx) => {
    const slotRef = doc(db, SLOTS_COL, slotId)
    const slotSnap = await tx.get(slotRef)
    if (!slotSnap.exists()) throw new Error('El horario ya no existe')
    const slot = slotSnap.data() as DoctorSlot
    if (slot.status !== 'available') throw new Error('Este horario ya fue tomado')

    const id = apptId(slotId, u.uid)
    const apptRef = doc(db, APPTS_COL, id)

    // 🚫 Bloqueo de re-agendar mismo slot si ya lo cancelaste antes
    const prevApptSnap = await tx.get(apptRef)
    if (prevApptSnap.exists()) {
      const prev = prevApptSnap.data() as Appointment
      if (prev.status === 'cancelled') {
        throw new Error('Ya cancelaste este horario antes. Elige otro horario.')
      }
      // Si existe con otro estado, también bloqueamos por consistencia
      throw new Error('Ya existe una cita registrada para este horario.')
    }

    const apptData: Omit<Appointment, 'id'> = {
      uid: u.uid,
      slotId,
      specialty: slot.specialty,
      status: 'requested',
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
    }

    tx.set(apptRef, apptData, { merge: false }) // create explícito
    tx.update(slotRef, {
      status: 'requested',
      patientUid: u.uid,
      updatedAt: serverTimestamp(),
    })

    return { id, ...(apptData as any) } as Appointment
  })

  // await queueAppointmentEmail('requested', appt).catch(() => {})
  return appt
}

/** ---- Cancelar (transacción) ----
 * Cita → 'cancelled' y, si el slot sigue ligado al paciente y no se "bookeó" por staff,
 * vuelve a 'available'.
 */
export async function cancelAppointmentById(appointmentId: string): Promise<void> {
  const u = await getCurrentUser()
  if (!u) throw new Error('No hay sesión activa')
  if (!appointmentId.endsWith(`_${u.uid}`)) {
    throw new Error('Cita no pertenece al usuario actual')
  }

  await runTransaction(db, async (tx) => {
    const apptRef = doc(db, APPTS_COL, appointmentId)
    const apptSnap = await tx.get(apptRef)
    if (!apptSnap.exists()) return

    const appt = apptSnap.data() as Appointment
    const slotRef = doc(db, SLOTS_COL, appt.slotId)
    const slotSnap = await tx.get(slotRef)

    if (slotSnap.exists()) {
      const slot = slotSnap.data() as DoctorSlot
      if (slot.patientUid === u.uid && slot.status !== 'booked') {
        tx.update(slotRef, {
          status: 'available',
          patientUid: null,
          updatedAt: serverTimestamp(),
        })
      }
    }

    tx.update(apptRef, {
      status: 'cancelled',
      updatedAt: serverTimestamp(),
    })
  })

  // await queueAppointmentEmail('cancelled', { id: appointmentId } as any).catch(() => {})
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