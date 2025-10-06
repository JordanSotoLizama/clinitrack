import { db } from '@/services/firebase'
import { getCurrentUser } from '@/services/auth'
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore'

export interface PaymentRecord {
  uid: string
  appointmentId: string
  provider: 'paypal'
  orderId: string
  amount: number
  status: 'approved' | 'failed'
  createdAt: any
}

/**
 * Guarda un registro de pago (demo PayPal sandbox).
 * - appointmentId: id de la cita (p. ej. `${slotId}_${uid}`)
 * - orderId: id de la orden devuelto por PayPal
 * - amount: monto en CLP (entero usado internamente para el historial)
 * - status: 'approved' | 'failed'
 */
export async function recordPayment(opts: {
  appointmentId: string
  orderId: string
  amount: number
  status: 'approved' | 'failed'
}) {
  const u = await getCurrentUser()
  if (!u) throw new Error('No hay sesión activa')

  const payload: PaymentRecord = {
    uid: u.uid,
    appointmentId: opts.appointmentId,
    provider: 'paypal',
    orderId: opts.orderId,
    amount: opts.amount,
    status: opts.status,
    createdAt: serverTimestamp(),
  }

  await addDoc(collection(db, 'payments'), payload)
}

/**
 * Suscribe los pagos APROBADOS del usuario actual y entrega
 * un mapa appointmentId -> true (para ocultar el botón Pagar).
 */
export async function subscribeMyApprovedPayments(
  cb: (paidMap: Record<string, true>) => void
): Promise<Unsubscribe> {
  const u = await getCurrentUser()
  if (!u) throw new Error('No hay sesión activa')

  const q = query(
    collection(db, 'payments'),
    where('uid', '==', u.uid),
    where('status', '==', 'approved')
  )

  return onSnapshot(q, (snap) => {
    const map: Record<string, true> = {}
    snap.forEach((d) => {
      const r = d.data() as PaymentRecord
      map[r.appointmentId] = true
    })
    cb(map)
  })
}