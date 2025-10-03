<template>
  <section style="padding:1rem 0">
    <h2>Inicio Paciente</h2>
    <p>Accesos rápidos (pronto).</p>

    <div style="margin-top:1rem; display:flex; align-items:center; gap:.75rem">
      <span>Sesión: <strong>{{ userEmail || '—' }}</strong></span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/services/firebase'

const userEmail = ref<string | null>(null)

onMounted(() => {
  onAuthStateChanged(auth, (u) => {
    userEmail.value = u?.email ?? null
  })
})

</script>

<style scoped>
.btn{
  padding:.55rem .9rem;border:none;border-radius:10px;cursor:pointer;
  background:#0ea5e9;color:white;font-weight:700;
}
.btn:disabled{opacity:.6;cursor:default}
</style>