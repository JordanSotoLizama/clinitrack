<script setup lang="ts">
import { ref } from 'vue';
import type { User } from 'firebase/auth';
import { onAuthState, logout } from './services/auth';
import { useRouter, useRoute } from 'vue-router';

const currentUser = ref<User | null>(null);
const router = useRouter();
const route  = useRoute();

onAuthState((u) => {
  currentUser.value = u;

  // Si NO hay sesión y estás en una ruta protegida, vuelve a /login
  if (!u && route.meta.requiresAuth) {
    router.replace('/login');
  }
});

async function handleLogout() {
  try {
    await logout();
    console.log('👋 Sesión cerrada');
    await router.replace('/login');
  } catch (e) {
    console.error('Error al cerrar sesión', e);
  }
}
</script>

<template>
  <div>
    <header style="display:flex;gap:12px;align-items:center;padding:8px 12px;">
      <span v-if="currentUser">Bienvenido: {{ currentUser.email }}</span>
      <span v-else>No hay sesión</span>

      <button v-if="currentUser" @click="handleLogout" style="margin-left:auto;">
        Cerrar sesión
      </button>
    </header>

    <router-view />
  </div>
</template>

<style scoped></style>
