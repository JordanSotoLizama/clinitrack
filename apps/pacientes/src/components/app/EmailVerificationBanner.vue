<template>
  <div
    v-if="visible"
    class="banner"
    role="alert"
    aria-live="polite"
  >
    <div class="banner__text">
      <strong>Verifica tu correo</strong>
      <span>Hemos enviado un correo de verificación. Para acceder a todas las funciones, debes confirmar tu email.</span>
    </div>

    <div class="banner__actions">
      <!-- Próximo PR: botón para reenviar verificación -->
      <button class="banner__close" @click="dismiss">Cerrar</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/services/firebase'

const DISMISS_KEY = 'ct_patient_email_banner_dismissed'
const visible = ref(false)

function isDismissedToday(): boolean {
  try{
    const v = localStorage.getItem(DISMISS_KEY)
    if (!v) return false
    const ts = Number(v)
    const ONE_DAY = 24 * 60 * 60 * 1000
    return Date.now() - ts < ONE_DAY
  }catch{ return false }
}

function dismiss(){
  try{ localStorage.setItem(DISMISS_KEY, String(Date.now())) }catch{}
  visible.value = false
}

onMounted(() => {
  onAuthStateChanged(auth, (u) => {
    if (!u) { visible.value = false; return }
    const shouldShow = !u.emailVerified && !isDismissedToday()
    visible.value = shouldShow
  })
})
</script>

<style scoped>
.banner{
  display:flex;justify-content:space-between;align-items:center;gap:12px;
  padding:.75rem 1rem;border-radius:12px;border:1px dashed #f59e0b;background:#fffbeb;color:#92400e
}
.banner__text{display:flex;flex-direction:column;gap:2px}
.banner__actions{display:flex;gap:.5rem}
.banner__close{border:none;border-radius:10px;padding:.45rem .8rem;cursor:pointer;background:#f59e0b;color:#111827;font-weight:700}
.banner__close:hover{filter:brightness(.95)}
</style>