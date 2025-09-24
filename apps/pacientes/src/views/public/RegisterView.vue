<template>
  <PublicLayout>
    <section>
      <h2>Registro</h2>
      <form>
        <input placeholder="Nombre" />
        <input placeholder="Apellido" />
        <input placeholder="Email" />
        <input type="password" placeholder="Contraseña" />
        <input type="password" placeholder="Confirmar" />
        <button type="button">Crear cuenta</button>
      </form>
      <p>¿Ya tienes cuenta? <router-link to="/login">Ingresar</router-link></p>
    </section>
  </PublicLayout>
</template>

<script setup lang="ts">
import PublicLayout from '../../layouts/PublicLayout.vue'
</script>