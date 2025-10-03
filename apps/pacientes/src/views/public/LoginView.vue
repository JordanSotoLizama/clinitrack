<template>
  <PublicLayout>
    <!-- wrapper local en vez de body{} -->
    <div class="login-page">
      <div class="login-bg"></div>

      <section>
        <h2>Ingresar</h2>

        <form @submit.prevent="onSubmit" novalidate>
          <label class="sr-only" for="email">Email</label>
          <input
            id="email"
            name="email"
            placeholder="Email"
            type="email"
            autocomplete="email"
            v-model.trim="form.email"
          />

          <label class="sr-only" for="password">Contraseña</label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="Contraseña"
            autocomplete="current-password"
            v-model="form.password"
          />

          <button type="submit" :disabled="loading">
            {{ loading ? 'Ingresando…' : 'Ingresar' }}
          </button>

          <p v-if="errorMsg" class="alert error">{{ errorMsg }}</p>
        </form>

        <p>¿No tienes cuenta? <router-link to="/registro">Regístrate</router-link></p>
      </section>
    </div>
  </PublicLayout>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { loginWithEmail } from '@/services/auth'
import PublicLayout from '../../layouts/PublicLayout.vue'

const router = useRouter()

const form = reactive({
  email: '',
  password: '',
})

const loading = ref(false)
const errorMsg = ref('')

function isValidEmail (v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

function mapAuthError (code: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'Correo inválido.'
    case 'auth/missing-password':
    case 'auth/weak-password':
      return 'Contraseña inválida.'
    case 'auth/user-disabled':
      return 'Tu cuenta está deshabilitada.'
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Correo o contraseña incorrectos.'
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Intenta más tarde.'
    default:
      return 'No se pudo iniciar sesión. Intenta nuevamente.'
  }
}

async function onSubmit () {
  errorMsg.value = ''

  // normaliza email
  const email = form.email.trim().toLowerCase()
  const password = form.password

  // Validaciones rápidas antes de llamar a Firebase
  if (!isValidEmail(email)) {
    errorMsg.value = 'Correo inválido.'
    return
  }
  if (!password || password.length < 6) {
    errorMsg.value = 'La contraseña debe tener al menos 6 caracteres.'
    return
  }

  loading.value = true
  try {
    await loginWithEmail(email, password)
    // Si luego filtras por claims, aquí puedes forzar refresh:
    // await auth.currentUser?.getIdToken(true)
    await router.push('/home')
  } catch (e: any) {
    console.error('login error:', e)
    const code = e?.code || ''
    const msg = String(e?.message || '')

    // Si en el backend detectas staff y devuelves un mensaje, mantenlo:
    if (msg.includes('pertenece al staff')) {
      errorMsg.value = 'Esta cuenta pertenece al staff. Usa el portal de staff.'
    } else {
      errorMsg.value = mapAuthError(code)
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* reemplaza el antiguo body{} por un contenedor local */
.login-page {
  min-height: 100vh;
  margin: 0;
  font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
  background: #e3f0ff;
  overflow-x: hidden;
  position: relative;
}

/* Fondo con logo centrado */
.login-bg {
  position: fixed;
  inset: 0;
  z-index: -1;
  background: url('/clinitrack-logo.png') no-repeat center center;
  background-size: 1200px auto;
  opacity: 0.10;
  pointer-events: none;
}

section {
  max-width: 350px;
  margin: 60px auto;
  padding: 2.5rem 2rem 2rem 2rem;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 24px 0 rgba(0,0,0,0.07);
  display: flex;
  flex-direction: column;
  align-items: center;
}

h2 {
  font-size: 2rem;
  font-weight: 600;
  color: #1976d2;
  margin-bottom: 2rem;
  letter-spacing: 0.5px;
}

form {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

input {
  padding: 0.8rem 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  outline: none;
  transition: border 0.2s, background 0.2s;
  background: #fafbfc;
}
input:focus {
  border-color: #1976d2;
  background: #fff;
}

button {
  padding: 0.9rem 0;
  background: #1976d2;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
  margin-top: 0.5rem;
}
button:hover { background: #1565c0; }

p {
  margin-top: 1.5rem;
  font-size: 0.98rem;
  color: #444;
}

a { color: #1976d2; text-decoration: none; font-weight: 500; }
a:hover { color: #0d47a1; text-decoration: underline; }

/* util para accesibilidad (ocultar label visualmente, pero disponible a screen readers) */
.sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0, 0, 0, 0); border: 0;
}
</style>