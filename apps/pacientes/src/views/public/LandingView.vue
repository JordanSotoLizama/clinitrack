<template>
  <PublicLayout>
    <section>
      <h2>Bienvenido/a</h2>
      <p>Gestiona tus citas y exámenes.</p>
      <p>
        <router-link to="/login">Ingresar</router-link> |
        <router-link to="/registro">Registrarme</router-link>
      </p>
    </section>
  </PublicLayout>
</template>

<script setup lang="ts">
import PublicLayout from '../../layouts/PublicLayout.vue'
</script>