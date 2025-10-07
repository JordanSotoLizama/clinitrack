import { initializeApp, getApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { firebaseConfig } from '@/config/firebaseConfig'

// Inicialización
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Instancias 
export const auth = getAuth(app)
export const db = getFirestore(app)


if (!firebaseConfig.apiKey) {
  console.warn('[Firebase] ⚠️ Variables de entorno no detectadas.')
} else {
  console.log('[Firebase] ✅ Inicializado OK (staff).')
}