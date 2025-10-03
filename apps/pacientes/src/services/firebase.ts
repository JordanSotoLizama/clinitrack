import { initializeApp, getApp, getApps } from 'firebase/app'
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { firebaseConfig } from '@/config/firebaseConfig'

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

setPersistence(auth, browserLocalPersistence).catch(console.warn)

if (firebaseConfig.measurementId) {
  import('firebase/analytics').then(({ getAnalytics, isSupported }) => {
    isSupported().then(ok => { if (ok) getAnalytics(app) })
  })
}

console.log('[Firebase Patients] OK', { appId: firebaseConfig.appId })