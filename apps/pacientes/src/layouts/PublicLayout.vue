<template>
  <div>
    <HeaderPublic />
    <main>
      <slot />
    </main>
    <FooterPublic />
  </div>
</template>

<script setup lang="ts">
import HeaderPublic from '../components/public/HeaderPublic.vue'
import FooterPublic from '../components/public/FooterPublic.vue'
</script>