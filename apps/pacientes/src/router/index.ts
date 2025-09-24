import { createRouter, createWebHistory } from 'vue-router'
import LandingView from '../views/public/LandingView.vue'
import LoginView from '../views/public/LoginView.vue'
import RegisterView from '../views/public/RegisterView.vue'
import AppHomeView from '../views/paciente/AppHomeView.vue'

const routes = [
  { path: '/', component: LandingView },
  { path: '/login', component: LoginView },
  { path: '/registro', component: RegisterView },
  { path: '/app', component: AppHomeView }, // luego irá con guard de auth
]

export default createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})