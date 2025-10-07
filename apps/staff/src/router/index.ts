import { createRouter, createWebHistory } from 'vue-router';

// Usa tu alias @ si no marca en rojo; si marca, cambia a rutas relativas
import LoginView     from '@/views/LoginView.vue';
import HomeAdmin     from '@/views/admin/HomeAdmin.vue';
import HomeMedico    from '@/views/medico/HomeMedico.vue';
import HomeRecepcion from '@/views/recepcionista/HomeRecepcion.vue';
import HomeLab       from '@/views/lab/HomeLab.vue';

import { getCurrentUser } from '@/services/auth'; 
import { getUserRole, routeForRole } from '@/services/userProfile';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/login' },
    { path: '/login', component: LoginView, meta: { guestOnly: true } },

    { path: '/admin',     component: HomeAdmin,     meta: { requiresAuth: true, roles: ['admin'] } },
    { path: '/medico',    component: HomeMedico,    meta: { requiresAuth: true, roles: ['medico'] } },
    { path: '/recepcion', component: HomeRecepcion, meta: { requiresAuth: true, roles: ['recepcion'] } },
    { path: '/lab',       component: HomeLab,       meta: { requiresAuth: true, roles: ['laboratorio'] } },

    { path: '/:pathMatch(.*)*', redirect: '/login' },
  ],
});

// Evita pedir el user en paralelo mil veces en la 1ª navegación


router.beforeEach(async (to) => {
  const user = await getCurrentUser();

  // Bloquea vistas protegidas si no hay sesión
  if (to.meta.requiresAuth && !user) {
    return { path: '/login', query: { redirect: to.fullPath } };
  }

  // Si hay sesión, obten rol 1 sola vez por navegación
  let role: any = null;
  if (user) role = await getUserRole((user as any).uid);

  // Evita que un usuario logeado visite /login
  if (to.meta.guestOnly && user && role) {
    return { path: (to.query.redirect as string) || routeForRole(role) };
  }

  // Si la ruta tiene restricción de roles, valida
  if (to.meta.roles && role && !(to.meta.roles as string[]).includes(role)) {
    return { path: routeForRole(role) }; // lo mandamos a su home
  }

  return true;
});



export default router;
