import { createRouter, createWebHistory } from 'vue-router'
import { getCurrentUser, logout } from '@/services/auth'
import LandingView from '../views/public/LandingView.vue'
import LoginView from '../views/public/LoginView.vue'
import RegisterView from '../views/public/RegisterView.vue'
import AppHomeView from '../views/paciente/AppHomeView.vue'

const routes = [
  { path: '/', component: LandingView, meta: { guestOnly: true } },
  { path: '/login', component: LoginView, meta: { guestOnly: true } },
  { path: '/registro', component: RegisterView, meta: { guestOnly: true } },
  { path: '/home', component: AppHomeView, meta: { requiresAuth: true } }, // protegida
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

async function getRoleClaim(): Promise<string | null> {
  const u = await getCurrentUser()
  if (!u) return null
  const tok = await u.getIdTokenResult()
  return (tok.claims as any)?.role ?? null
}

router.beforeEach(async (to) => {
  const user = await getCurrentUser()

  // Rutas privadas
  if (to.meta.requiresAuth) {
    if (!user) return '/'                      // tu decisión: landing
    const role = await getRoleClaim()
    if (role !== 'patient') {                  // <-- evita staff en app pacientes
      await logout()
      return '/login?msg=solo-pacientes'
    }
  }

  // Rutas solo invitados
  if (to.meta.guestOnly && user) return '/home'

  return true
})

export default router