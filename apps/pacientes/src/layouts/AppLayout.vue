<template>
  <div>
    <AppHeader />
    <div style="display:flex; gap:16px; align-items:flex-start;">
      <AppSidebar />
      <main style="flex:1;">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppHeader from '../components/app/AppHeader.vue'
import AppSidebar from '../components/app/AppSidebar.vue'
</script>