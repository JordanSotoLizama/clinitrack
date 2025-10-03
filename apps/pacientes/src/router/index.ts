import { createRouter, createWebHistory } from 'vue-router'
import { getCurrentUser } from '@/services/auth'
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

router.beforeEach(async (to) => {
  const user = await getCurrentUser()
  if (to.meta.requiresAuth && !user) return '/'
  if (to.meta.guestOnly && user) return '/home'
  return true
})

export default router