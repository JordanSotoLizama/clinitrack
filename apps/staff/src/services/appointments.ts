import { getCurrentUser } from '@/services/auth'
import { db } from '@/services/firebase'
import {
  collection, doc, getDoc, onSnapshot, query, where, type Unsubscribe,
} from 'firebase/firestore'

export async function subscribeMyDoctorAppointments(
  cb: (list: any[]) => void
): Promise<Unsubscribe> {
  const u = await getCurrentUser()
  if (!u) throw new Error('No hay sesión activa')

  const qAppts = query(
    collection(db, 'appointments'),
    where('doctorUid', '==', u.uid)
    // sin orderBy/range -> sin índice compuesto
  )

  return onSnapshot(qAppts, (snap) => {
    const items = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))

    // Filtramos a futuro (±6h de tolerancia por si hay desfases)
    const cutoff = Date.now() - 6 * 60 * 60 * 1000
    const future = items.filter(a => {
      const t = a.dateISO ? Date.parse(a.dateISO) : 0
      return t >= cutoff
    })

    // Orden por fecha asc
    future.sort((a, b) => (a.dateISO ?? '').localeCompare(b.dateISO ?? ''))

    cb(future)
  })
}