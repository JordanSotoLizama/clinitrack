import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/services/firebase'

export type DoctorLite = {
  uid: string
  firstName?: string
  lastName?: string
  fullName?: string
  specialty?: string
}

export async function listSpecialties(): Promise<string[]> {
  const q = query(collection(db, 'users'), where('role', '==', 'medico'))
  const snap = await getDocs(q)
  const set = new Set<string>()
  snap.forEach(d => {
    const s = (d.data() as any).specialty
    if (s) set.add(s)
  })
  return Array.from(set).sort()
}

export async function listDoctorsBySpecialty(specialty: string): Promise<DoctorLite[]> {
  const q = query(
    collection(db, 'users'),
    where('role', '==', 'medico'),
    where('specialty', '==', specialty)
  )
  const snap = await getDocs(q)
  return snap.docs
    .map(d => {
      const x = d.data() as any
      const fullName = x.fullName || `${x.firstName ?? ''} ${x.lastName ?? ''}`.trim()
      return { uid: d.id, firstName: x.firstName, lastName: x.lastName, fullName, specialty: x.specialty }
    })
    .sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''))
}