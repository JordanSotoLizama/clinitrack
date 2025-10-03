<template>
  <PublicLayout title="Recuperar contraseña">
    <form class="form" @submit.prevent="onSubmit">
      <p class="help">
        Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
      </p>

      <label class="field">
        <span>Correo</span>
        <input
          v-model="email"
          type="email"
          required
          autocomplete="email"
          placeholder="tu@correo.com"
        />
      </label>

      <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
      <p v-if="okMsg" class="ok">{{ okMsg }}</p>

      <div class="actions">
        <button type="submit" :disabled="loading">
          {{ loading ? 'Enviando…' : 'Enviar enlace' }}
        </button>
        <RouterLink class="link" to="/login">Volver al inicio de sesión</RouterLink>
      </div>
    </form>
  </PublicLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import PublicLayout from '../../layouts/PublicLayout.vue'
import { requestPasswordReset } from '@/services/auth'

const email = ref('')
const loading = ref(false)
const okMsg = ref('')
const errorMsg = ref('')

async function onSubmit() {
  okMsg.value = ''
  errorMsg.value = ''
  loading.value = true
  try {
    await requestPasswordReset(email.value)
    okMsg.value = 'Listo. Si el correo existe, te enviamos el enlace para restablecer.'
  } catch (e: any) {
    const code = e?.code || ''
    if (code === 'auth/invalid-email') errorMsg.value = 'Correo inválido.'
    else errorMsg.value = e?.message ?? 'No se pudo enviar el enlace.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.form { max-width: 420px; display: grid; gap: 12px; }
.field { display: grid; gap: 6px; }
input { padding: 10px; border: 1px solid #ddd; border-radius: 6px; }
.actions { display: flex; gap: 12px; align-items: center; }
button { padding: 10px 14px; border: 0; border-radius: 6px; background: #0ea5e9; color: #fff; }
button[disabled] { opacity: .6; }
.error { color: #b00020; }
.ok { color: #0a7a27; }
.link { text-decoration: underline; }
.help { color: #555; }
</style>