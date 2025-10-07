<template>
  <div class="app-shell">
    <AppHeader />
    <EmailVerificationBanner />

    <div class="shell-body">
      <AppSidebar />
      <main class="shell-main">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppHeader from '@/components/app/AppHeader.vue'
import AppSidebar from '@/components/app/AppSidebar.vue'
import EmailVerificationBanner from '@/components/app/EmailVerificationBanner.vue'
</script>

<style scoped>
.app-shell{display:flex;flex-direction:column;gap:12px;padding:12px}
.shell-body{display:flex;gap:16px;align-items:flex-start}
.shell-main{flex:1;min-height:60vh}
</style>