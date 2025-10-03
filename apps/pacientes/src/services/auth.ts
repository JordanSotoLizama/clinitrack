import { auth } from './firebase'
import { onAuthStateChanged, type User, signOut } from 'firebase/auth'

export function getCurrentUser(): Promise<User | null> {
  return new Promise(resolve => {
    const off = onAuthStateChanged(auth, u => {
      off()
      resolve(u)
    })
  })
}

export async function logout() {
  await signOut(auth)
}