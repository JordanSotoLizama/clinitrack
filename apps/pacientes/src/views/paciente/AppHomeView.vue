<template>
  <AppLayout>
    <section style="padding:1rem 0">
      <h2>Inicio Paciente</h2>
      <p>Accesos rápidos (pronto).</p>

      <!-- Bloque pequeño para probar sesión -->
      <div style="margin-top:1rem; display:flex; align-items:center; gap:.75rem">
        <span>Sesión: <strong>{{ userEmail || '—' }}</strong></span>
        <button class="btn" @click="onLogout" :disabled="leaving">
          {{ leaving ? 'Saliendo…' : 'Cerrar sesión' }}
        </button>
      </div>
    </section>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AppLayout from '../../layouts/AppLayout.vue'
import { auth } from '@/services/firebase'
import { logout } from '@/services/auth'
import { useRouter } from 'vue-router'

const router = useRouter()
const userEmail = computed(() => auth.currentUser?.email || '')
const leaving = ref(false)

async function onLogout() {
  leaving.value = true
  try {
    await logout()
    router.push('/login')
  } finally {
    leaving.value = false
  }
}
</script>

<style scoped>
.btn{
  padding:.55rem .9rem;border:none;border-radius:10px;cursor:pointer;
  background:#0ea5e9;color:white;font-weight:700;
}
.btn:disabled{opacity:.6;cursor:default}
</style>