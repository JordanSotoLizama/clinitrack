import { createRouter, createWebHistory } from 'vue-router'
import { getCurrentUser, logout } from '@/services/auth'
import LandingView from '../views/public/LandingView.vue'
import LoginView from '../views/public/LoginView.vue'
import RegisterView from '../views/public/RegisterView.vue'
import AppHomeView from '../views/paciente/AppHomeView.vue'
import AppLayout from '@/layouts/AppLayout.vue'
import AppAppointmentsView from '../views/paciente/AppAppointmentsView.vue'
import AppResultsView from '../views/paciente/AppResultsView.vue'
import AppProfileView from '../views/paciente/AppProfileView.vue'
import ResetPasswordView from '@/views/public/ResetPasswordView.vue'

export const routes = [
  // públicas (opcional)
  { path: '/', component: LandingView, meta: { guestOnly: true } },
  { path: '/login', component: LoginView, meta: { guestOnly: true } },
  { path: '/registro', component: RegisterView, meta: { guestOnly: true } },
  { path: '/recuperar', component: ResetPasswordView, meta: { guestOnly: true } },

  // área paciente
  {
    path: '/app',
    component: AppLayout,
    meta: { requiresAuth: true },
    children: [
      { path: '',            name: 'patient-home',        component: AppHomeView },
      { path: 'citas',       name: 'patient-appointments',component: AppAppointmentsView, meta: { requiresVerified: true } },
      { path: 'resultados',  name: 'patient-results',     component: AppResultsView, meta: { requiresVerified: true } },
      { path: 'perfil',      name: 'patient-profile',     component: AppProfileView, meta: { requiresVerified: true } },
    ],
  },

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
   if (to.meta.guestOnly && user) {
    const role = await getRoleClaim?.()
    if (role === 'patient') return '/app'
  }

  // Bloqueo por verificación de email
  if (to.meta.requiresVerified) {
    const u = await getCurrentUser?.()
    try { await u?.reload?.() } catch {}
    if (!u?.emailVerified) return '/app' // vuelve al Home; el banner explica qué hacer
  }

  return true
})

export default router