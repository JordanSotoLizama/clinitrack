import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db, app } from './firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';

export type StaffRole = 'admin'|'medico'|'recepcion'|'laboratorio';

export interface Perfil {
  uid: string;
  email: string | null;
  role: StaffRole;
}

const fns = getFunctions(app, 'southamerica-east1'); // ⚠️ misma región del deploy

export async function listProfiles(): Promise<Perfil[]> {
  const q = query(collection(db, 'users'), orderBy('email'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const x = d.data() as any;
    return {
      uid: x.uid ?? d.id,
      email: x.email ?? null,
      role: (x.role ?? 'recepcion') as StaffRole,
    };
  });
}

export async function createStaff(email: string, password: string, role: StaffRole) {
  const call = httpsCallable(fns, 'createStaffUser');
  const res = await call({ email, password, role });
  return (res.data as any).uid as string;
}

export async function deleteStaff(uid: string) {
  const call = httpsCallable(fns, 'deleteStaffUser');
  await call({ uid });
}