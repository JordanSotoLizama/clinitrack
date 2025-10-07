<template>
  <aside class="sidebar">
    <div class="sidebar__title">Área Paciente</div>

    <nav class="sidebar__nav">
      <router-link to="/app">Inicio</router-link>
      <router-link to="/app/citas">Citas</router-link>
      <router-link to="/app/resultados">Resultados</router-link>
      <router-link to="/app/perfil">Perfil</router-link>
    </nav>

    <div class="sidebar__footer">
      <button class="logout" @click="onLogout" :disabled="leaving">
        {{ leaving ? 'Saliendo…' : 'Cerrar sesión' }}
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { logout } from '@/services/auth'

const router = useRouter()
const leaving = ref(false)

async function onLogout(){
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
.sidebar{min-width:220px; display:flex; flex-direction:column; gap:.75rem}
.sidebar__title{font-weight:700}
.sidebar__nav{display:flex; flex-direction:column; gap:.4rem}
.sidebar__nav a{display:block; padding:.5rem .7rem; border-radius:10px; text-decoration:none; border:1px solid #e5e7eb}

/* solo exacta para que “Inicio” no quede activo en /app/citas */
.sidebar__nav a.router-link-exact-active{
  background:#0ea5e9; color:white; border-color:#0ea5e9;
}

.sidebar__footer{margin-top:auto}
.logout{
  width:100%; padding:.55rem .9rem; border:none; border-radius:10px; cursor:pointer;
  background:#ef4444; color:white; font-weight:700;
}
.logout:disabled{opacity:.6; cursor:default}
</style>