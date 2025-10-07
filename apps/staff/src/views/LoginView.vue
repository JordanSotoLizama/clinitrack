<script setup lang="ts">
import { ref } from 'vue';
import { login } from '../services/auth';
import { useRouter } from 'vue-router';
import { getUserRole, routeForRole } from '@/services/userProfile';
import { getCurrentUser } from '@/services/auth';

const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');
const router = useRouter();

async function handleLogin() {
  try {
    error.value = '';
    await login(email.value.trim(), password.value);

    const u = await getCurrentUser();
    const role = u ? await getUserRole(u.uid) : null;
    router.push(role ? routeForRole(role) : '/login');
  } catch (e: any) {
    error.value = e.message ?? 'Error de autenticación.';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div style="max-width:360px;margin:2rem auto;font-family:system-ui;">
    <h1 style="margin-bottom:1rem;">Login</h1>

    <form @submit.prevent="handleLogin">
      <label style="display:block;margin-bottom:.5rem;">
        Email
        <input
          type="email"
          v-model="email"
          placeholder="tú@correo.com"
          autocomplete="username"
          required
          style="width:100%;padding:.6rem;margin-top:.25rem;"
        />
      </label>

      <label style="display:block;margin-bottom:1rem;">
        Contraseña
        <input
          type="password"
          v-model="password"
          placeholder="********"
          autocomplete="current-password"
          required
          style="width:100%;padding:.6rem;margin-top:.25rem;"
        />
      </label>

      <button
        type="submit"
        :disabled="loading"
        style="width:100%;padding:.7rem;cursor:pointer;"
      >
        {{ loading ? 'Ingresando…' : 'Ingresar' }}
      </button>

      <p v-if="error" style="color:#d33;margin-top:1rem;">{{ error }}</p>
    </form>
  </div>
</template>

