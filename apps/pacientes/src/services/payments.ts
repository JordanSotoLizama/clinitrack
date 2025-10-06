import { db } from '@/services/firebase'
import { getCurrentUser } from '@/services/auth'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'

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
 * - amount: monto en CLP (entero)
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