<template>
  <footer class="footer">
    © {{ new Date().getFullYear() }} CliniTrack
  </footer>
</template>

<script setup lang="ts"></script>

<style scoped>
.footer {
  position: fixed;
  bottom: 0; /* lo fija al fondo de la ventana */
  left: 0;
  width: 100%; /* ocupa todo el ancho */
  background-color: #2c3e50;
  color: #ecf0f1;
  text-align: center;
  padding: 12px 0;
  font-size: 0.95rem;
  box-shadow: 0 -1px 3px rgba(0, 0, 0, 0.1);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 10; /* se asegura de que quede sobre el contenido */
}

</style>

