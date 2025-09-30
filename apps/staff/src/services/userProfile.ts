import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { User } from 'firebase/auth';

export type StaffRole = 'admin' | 'medico' | 'recepcion' | 'laboratorio';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: StaffRole;
  status: 'active' | 'disabled';
  createdAt: any;   // Firestore Timestamp
  lastLoginAt: any; // Firestore Timestamp
}

export async function ensureUserProfile(user: User, defaultRole: StaffRole = 'recepcion') {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    const profile: UserProfile = {
      uid: user.uid,
      email: user.email ?? null,
      displayName: user.displayName ?? null,
      role: defaultRole,     // luego lo ajustas a mano en la consola
      status: 'active',
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    };
    await setDoc(ref, profile);
  } else {
    await setDoc(ref, { lastLoginAt: serverTimestamp() }, { merge: true });
  }
}

export async function getUserRole(uid: string): Promise<StaffRole | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data().role as StaffRole) : null;
}

export function routeForRole(role: StaffRole): string {
  switch (role) {
    case 'admin':       return '/admin';
    case 'medico':      return '/medico';
    case 'recepcion':   return '/recepcion';
    case 'laboratorio': return '/lab';
    default:            return '/login';
  }
}