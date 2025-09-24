<template>
  <PublicLayout>
    <section>
      <h2>Ingresar</h2>
      <form>
        <input placeholder="Email" />
        <input type="password" placeholder="Contraseña" />
        <button type="button">Entrar</button>
      </form>
      <p>¿No tienes cuenta? <router-link to="/registro">Regístrate</router-link></p>
    </section>
  </PublicLayout>
</template>

<script setup lang="ts">
import PublicLayout from '../../layouts/PublicLayout.vue'
</script>