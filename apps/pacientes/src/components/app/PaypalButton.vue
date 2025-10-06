<template>
  <div class="pp-wrap">
    <div v-if="error" class="pp-error">{{ error }}</div>
    <div :id="containerId"></div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { recordPayment } from '@/services/payments'

/**
 * Botón PayPal (Sandbox) para demo de integración externa.
 * - Carga el SDK dinámicamente con client-id de .env (o 'sb' por defecto).
 * - Crea la orden en el cliente y captura al aprobar.
 * - Registra el resultado en Firestore (colección 'payments').
 */

const props = defineProps<{
  appointmentId: string       // id de la cita (p. ej. `${slotId}_${uid}`)
  amountClp: number           // monto CLP entero (ej. 10000)
}>()

const emit = defineEmits<{
  (e: 'paid'): void
  (e: 'failed'): void
}>()

const containerId = `pp-btn-${Math.random().toString(36).slice(2)}`
const error = ref<string | null>(null)
let buttonsInstance: any = null
let scriptEl: HTMLScriptElement | null = null

function loadPayPalSDK(): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any).paypal) return resolve((window as any).paypal)
    const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || 'sb' // 'sb' funciona en sandbox
    scriptEl = document.createElement('script')
    // CLP es moneda sin decimales. Intent 'capture' para cobrar al aprobar.
    scriptEl.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=CLP&intent=capture`
    scriptEl.onload = () => resolve((window as any).paypal)
    scriptEl.onerror = () => reject(new Error('No se pudo cargar el SDK de PayPal'))
    document.head.appendChild(scriptEl)
  })
}

onMounted(async () => {
  try {
    const paypal = await loadPayPalSDK()
    buttonsInstance = paypal.Buttons({
      style: { layout: 'vertical', label: 'paypal' },

      // Orden “client-side” (suficiente para demo).
      createOrder: (_data: any, actions: any) => {
        // CLP: valor como string entero (sin decimales)
        return actions.order.create({
          purchase_units: [
            { amount: { value: String(props.amountClp), currency_code: 'CLP' } }
          ]
        })
      },

      onApprove: async (_data: any, actions: any) => {
        try {
          const order = await actions.order.capture()
          const orderId = order?.id ?? 'unknown'
          await recordPayment({
            appointmentId: props.appointmentId,
            orderId,
            amount: props.amountClp,
            status: 'approved',
          })
          emit('paid')
        } catch (e: any) {
          error.value = e?.message ?? 'Error al capturar o registrar el pago'
          try {
            await recordPayment({
              appointmentId: props.appointmentId,
              orderId: 'capture_error',
              amount: props.amountClp,
              status: 'failed',
            })
          } catch {}
          emit('failed')
        }
      },

      onCancel: async () => {
        try {
          await recordPayment({
            appointmentId: props.appointmentId,
            orderId: 'cancelled',
            amount: props.amountClp,
            status: 'failed',
          })
        } catch {}
        emit('failed')
      },

      onError: async (err: any) => {
        error.value = err?.message ?? 'Error en el flujo de pago'
        try {
          await recordPayment({
            appointmentId: props.appointmentId,
            orderId: 'sdk_error',
            amount: props.amountClp,
            status: 'failed',
          })
        } catch {}
        emit('failed')
      },
    })
    buttonsInstance.render(`#${containerId}`)
  } catch (e: any) {
    error.value = e?.message ?? 'No se pudo inicializar PayPal'
  }
})

onBeforeUnmount(() => {
  try { buttonsInstance?.close?.() } catch {}
  if (scriptEl && scriptEl.parentNode) {
    // Deja el SDK cargado si piensas usar varios botones en la vista
    // scriptEl.parentNode.removeChild(scriptEl)
  }
})
</script>

<style scoped>
.pp-wrap { display: grid; gap: 8px; }
.pp-error { color: #b91c1c; font-size: 14px; }
</style>