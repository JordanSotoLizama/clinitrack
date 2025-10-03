<template>
  <div v-if="visible" class="banner" role="alert" aria-live="polite">
    <div class="banner__text">
      <strong>Verifica tu correo</strong>
      <span>
        Te enviamos un enlace de verificación. Debes confirmar tu email para usar todas las funciones.
      </span>
      <small v-if="msg" class="hint">{{ msg }}</small>
    </div>

    <div class="banner__actions">
      <button class="banner__btn" @click="resend" :disabled="sending || cooldown>0">
        {{ sending ? 'Enviando…' : (cooldown>0 ? `Reenviar (${cooldown})` : 'Reenviar verificación') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { onAuthStateChanged, sendEmailVerification } from 'firebase/auth'
import { auth } from '@/services/firebase'

const visible = ref(false)
const sending = ref(false)
const cooldown = ref(0)
const msg = ref('')
let timer: number | undefined

function startCooldown(seconds = 60){
  cooldown.value = seconds
  timer = window.setInterval(() => {
    cooldown.value--
    if (cooldown.value <= 0 && timer) { clearInterval(timer); timer = undefined }
  }, 1000) as unknown as number
}

async function resend(){
  const u = auth.currentUser
  if (!u) { 
    msg.value = 'Inicia sesión para reenviar.'
    return
  }
  try{
    sending.value = true
    msg.value = ''
    await sendEmailVerification(u, { url: `${window.location.origin}/login` })
    startCooldown(60)
    msg.value = 'Te enviamos un nuevo correo de verificación.'
  } catch (e:any){
    msg.value = e?.message ?? 'No pudimos enviar el correo. Intenta más tarde.'
  } finally {
    sending.value = false
  }
}

onMounted(() => {
  onAuthStateChanged(auth, (u) => {
    // SIEMPRE visible cuando hay usuario y NO está verificado
    visible.value = !!u && !u.emailVerified
  })
})

onBeforeUnmount(() => { if (timer) clearInterval(timer) })
</script>

<style scoped>
.banner{
  display:flex;justify-content:space-between;align-items:center;gap:12px;
  padding:.75rem 1rem;border-radius:12px;border:1px dashed #f59e0b;background:#fffbeb;color:#92400e
}
.banner__text{display:flex;flex-direction:column;gap:4px}
.banner__actions{display:flex;gap:.5rem}
.banner__btn{
  border:none;border-radius:10px;padding:.45rem .8rem;cursor:pointer;
  background:#f59e0b;color:#111827;font-weight:700
}
.banner__btn:disabled{opacity:.6;cursor:default}
.hint{opacity:.9;font-size:.9rem}
</style>