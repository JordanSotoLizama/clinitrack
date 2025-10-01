import {
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import type { User } from 'firebase/auth'
import { auth } from './firebase'; // tu singleton inicializado en firebase.ts
import { ensureUserProfile } from './userProfile';



// Persistir la sesión al recargar pestaña
setPersistence(auth, browserLocalPersistence).catch(console.error);


export async function login(email: string, password: string) {
  try {
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    await ensureUserProfile(user); // crea/actualiza users/{uid}
    return user;
  } catch (e: unknown) {
    const err = e as { code?: string };
    const map: Record<string,string> = {
      'auth/invalid-email': 'Correo inválido.',
      'auth/user-not-found': 'Usuario no encontrado.',
      'auth/wrong-password': 'Contraseña incorrecta.',
      'auth/too-many-requests': 'Demasiados intentos, intenta luego.',
      'auth/network-request-failed': 'Problema de red.'
    };
    throw new Error(map[err.code ?? ''] ?? 'Error de autenticación.');
  }
}

export function logout() {
  return signOut(auth);
}

// Suscriptor global al estado de auth
export function onAuthState(cb: (u: User|null) => void) {
  return onAuthStateChanged(auth, cb);
}

// Helper opcional para obtener el usuario actual como Promesa
export function getCurrentUser(): Promise<User|null> {
  return new Promise(resolve => {
    const unsub = onAuthStateChanged(auth, (u) => {
      unsub();
      resolve(u);
    });
  });
}