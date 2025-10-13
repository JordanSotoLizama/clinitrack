<template>
  <div class="citas-wrap">
    <header class="citas-header">
      <div class="header-line">
        <h1 class="title">Reserva tu hora</h1>

        <!-- Filtro de especialidad (dinámico) -->
        <label class="spec-wrap">
          <span>Especialidad</span>
          <select v-model="selectedSpecialty" class="spec-select">
            <option v-for="sp in specialties" :key="sp" :value="sp">{{ sp }}</option>
          </select>
        </label>

        <!-- NUEVO: Filtro de médico según especialidad -->
        <label v-if="doctors.length" class="spec-wrap">
          <span>Médico</span>
          <select v-model="selectedDoctorUid" class="spec-select">
            <option v-for="d in doctors" :key="d.uid" :value="d.uid">{{ d.fullName || d.uid }}</option>
          </select>
        </label>
      </div>

      <!-- Mini calendario 7 días -->
      <nav class="week">
        <button
          v-for="d in weekDays"
          :key="d.iso"
          class="day"
          :class="{ active: d.iso === selectedDayIso }"
          @click="selectDay(d.iso)"
          :title="d.long"
        >
          <div class="dow">{{ d.dow }}</div>
          <div class="dom">{{ d.dom }}</div>
        </button>
      </nav>
    </header>

    <main class="grid">
      <!-- Columna izquierda: Disponibles del día -->
      <section class="panel">
        <div class="panel-row">
          <h2 class="panel-title">
            Disponibles para {{ formatDateLong(selectedDayIso) }}
          </h2>
        </div>

        <div v-if="loadingSlots" class="hint">Cargando horarios…</div>

        <div v-else-if="!selectedDoctorUid">
          <div class="hint">No hay médicos en {{ selectedSpecialty }}.</div>
        </div>

        <!-- Mostramos la tarjeta del médico seleccionado con sus horarios del día -->
        <article v-else class="doctor-card">
          <div class="doctor-head">
            <div class="doctor-info">
              <div class="doctor-name">{{ selectedDoctorName || 'Profesional' }}</div>
              <div class="doctor-sub">{{ selectedSpecialty }}</div>
            </div>
            <div class="center-type">Presencial</div>
          </div>

          <div v-if="daySlots.length === 0" class="hint">
            No hay horarios disponibles para este día en {{ selectedSpecialty }}.
          </div>

          <div v-else class="times">
            <button
              v-for="s in daySlots"
              :key="s.id"
              class="time-chip"
              :disabled="busySlotId === s.id"
              @click="onRequest(s.id)"
            >
              <span>{{ formatHourLocal(s.startIso) }}</span>
              <span v-if="busySlotId === s.id" class="loading">…</span>
            </button>
          </div>
        </article>
      </section>

      <!-- Columna derecha: Mis citas -->
      <aside class="panel">
        <h2 class="panel-title">Mis citas</h2>
        <div v-if="loadingAppts" class="hint">Cargando mis citas…</div>
        <ul v-else class="appts">
          <li v-for="a in myApptsSorted" :key="a.id" class="appt-row">
            <div class="appt-main">
              <div class="appt-title">
                {{ slotMeta[a.slotId]?.doctorName || 'Profesional' }}
              </div>
              <div class="appt-sub">
                {{ a.specialty }} •
                {{ formatDateShort(slotMeta[a.slotId]?.startIso) }}
                {{ formatHourLocal(slotMeta[a.slotId]?.startIso) }}
              </div>
            </div>

            <div class="appt-actions">
              <span class="badge" :data-status="a.status">{{ a.status }}</span>

               <!-- Si hay reembolso pendiente, mostramos ese badge -->
              <span v-if="isRefundPending(a)" class="badge refund">reembolso pendiente</span>
              <!-- Si no hay reembolso pendiente pero está pagada, mostramos 'paid' -->
              <span v-else-if="isPaid(a)" class="badge paid">paid</span>

              <button
                v-if="a.status === 'requested' && !isPaid(a)"
                class="btn-pay"
                :disabled="payOpenedId === a.id"
                @click="openPay(a.id)"
                title="Pagar (demo con PayPal Sandbox)"
              >
                Pagar
              </button>

              <button
                class="btn-cancel"
                :disabled="busyApptId === a.id || a.status === 'cancelled'"
                @click="onCancel(a.id)"
              >
                Cancelar
              </button>
            </div>
          </li>

          <li v-if="payOpenedId" class="paybox">
            <PayPalButton
              :appointment-id="payOpenedId"
              :amount-clp="DEMO_AMOUNT_CLP"
              @paid="onPaid"
              @failed="onPayFailed"
            />
            <div class="pay-hint">Demo • Se registrará el pago en tu historial interno</div>
            <button class="btn-link" @click="closePay">Cerrar</button>
          </li>

          <li v-if="myApptsSorted.length === 0" class="hint">Aún no tienes citas.</li>
        </ul>
      </aside>
    </main>

    <p v-if="lastError" class="error">{{ lastError }}</p>
    <p v-if="payMessage" class="ok">{{ payMessage }}</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed, watch } from 'vue'
import {
  subscribeOpenSlotsForDay,     // NUEVO: slots por médico/día
  subscribeMyAppointments,
  requestAppointmentBySlotId,
  cancelAppointmentById,
  type Appointment,
} from '@/services/appointments'
import { listSpecialties, listDoctorsBySpecialty, type DoctorLite } from '@/services/catalog'
import { db } from '@/services/firebase'
import { doc, getDoc } from 'firebase/firestore'
import PayPalButton from '@/components/app/PayPalButton.vue'
import { subscribeMyApprovedPayments } from '@/services/payments'

/* ----------------- Estado base ----------------- */
const loadingSlots = ref(true)
const loadingAppts = ref(true)
const lastError = ref<string | null>(null)
const busySlotId = ref<string | null>(null)
const busyApptId = ref<string | null>(null)

const payOpenedId = ref<string | null>(null)
const payMessage = ref<string | null>(null)
const DEMO_AMOUNT_CLP = 10000

// NUEVO: slots del día (solo del médico seleccionado)
const daySlots = ref<any[]>([])

// Mis citas
const myAppts = ref<Appointment[]>([])

// Pagos aprobados por cita (para ocultar CTA)
const paidByApptId = ref<Record<string, boolean>>({})

// Filtro de especialidad (dinámico)
const specialties = ref<string[]>([])
const selectedSpecialty = ref<string>('General')

// Lista de médicos de la especialidad y selección actual
const doctors = ref<DoctorLite[]>([])
const selectedDoctorUid = ref<string | null>(null)
const selectedDoctorName = computed(() => {
  const d = doctors.value.find(x => x.uid === selectedDoctorUid.value)
  return d?.fullName
})

// Metadatos slot para Mis citas
const slotMeta = ref<Record<string, { startIso: string; doctorName?: string }>>({})

/* ----------------- Semana (7 días) ----------------- */
function startOfTodayIso(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}
function dd(n: number) { return n < 10 ? `0${n}` : String(n) }

function buildWeek(fromIso: string) {
  const start = new Date(fromIso)
  const days: { iso: string; dow: string; dom: string; long: string }[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setUTCDate(d.getUTCDate() + i)
    days.push({
      iso: d.toISOString(),
      dow: ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][d.getUTCDay()],
      dom: dd(d.getUTCDate() as number),
      long: d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }),
    })
  }
  return days
}
const weekDays = ref(buildWeek(startOfTodayIso()))
const selectedDayIso = ref(weekDays.value[0].iso)
function selectDay(iso: string) { selectedDayIso.value = iso }

// util para YYYY-MM-DD
function toYMD(iso: string) {
  const d = new Date(iso)
  return `${d.getUTCFullYear()}-${dd(d.getUTCMonth()+1)}-${dd(d.getUTCDate())}`
}

/* ----------------- Suscripciones ----------------- */
let unsubSlots: (() => void) | null = null
let unsubAppts: (() => void) | null = null
let unsubPaid: (() => void) | null = null

async function resubscribeSlots() {
  loadingSlots.value = true
  daySlots.value = []
  if (unsubSlots) { unsubSlots(); unsubSlots = null }
  if (!selectedDoctorUid.value) { loadingSlots.value = false; return }

  const ymd = toYMD(selectedDayIso.value)
  unsubSlots = await subscribeOpenSlotsForDay(
    selectedDoctorUid.value,
    ymd,
    (list) => {
      daySlots.value = list
      loadingSlots.value = false
    }
  )
}

onMounted(async () => {
  // 1) Especialidades dinámicas
  specialties.value = await listSpecialties()
  if (!specialties.value.includes(selectedSpecialty.value) && specialties.value.length) {
    selectedSpecialty.value = specialties.value[0]
  }

  // 2) Médicos de la especialidad seleccionada
  doctors.value = await listDoctorsBySpecialty(selectedSpecialty.value)
  selectedDoctorUid.value = doctors.value[0]?.uid ?? null

  // 3) Slots del día/médico
  await resubscribeSlots()

  // 4) Mis citas (y mapear metadatos de slot)
  unsubAppts = await subscribeMyAppointments(async (appts) => {
    myAppts.value = appts
    loadingAppts.value = false
    const ids = Array.from(new Set(appts.map(a => a.slotId)))
    for (const id of ids) {
      if (slotMeta.value[id]) continue
      const snap = await getDoc(doc(db, 'doctor_slots', id))
      if (snap.exists()) {
        const s = snap.data() as any
        const startIso = s.startIso ?? s.dateISO ?? ''
        slotMeta.value[id] = { startIso, doctorName: s.doctorName }
      } else {
        slotMeta.value[id] = { startIso: '', doctorName: undefined }
      }
    }
  })

  // 5) Suscripción a pagos del usuario
  unsubPaid = await subscribeMyApprovedPayments((map) => {
    paidByApptId.value = map
  })
})

onBeforeUnmount(() => {
  unsubSlots?.(); unsubSlots = null
  unsubAppts?.(); unsubAppts = null
  unsubPaid?.(); unsubPaid = null
})

// Re-suscribimos cuando cambie especialidad, médico o día
watch(selectedSpecialty, async () => {
  doctors.value = await listDoctorsBySpecialty(selectedSpecialty.value)
  selectedDoctorUid.value = doctors.value[0]?.uid ?? null
  await resubscribeSlots()
})
watch([selectedDoctorUid, selectedDayIso], () => { resubscribeSlots() })

/* ----------------- Derivados para UI ----------------- */
const myApptsSorted = computed(() => {
  return [...myAppts.value].sort((a, b) => a.id.localeCompare(b.id))
})

/* ----------------- Acciones ----------------- */
async function onRequest(slotId: string) {
  lastError.value = null
  payMessage.value = null
  const s = daySlots.value.find(x => x.id === slotId)
  const when = s ? `${formatDateShort(s.startIso)} ${formatHourLocal(s.startIso)}` : 'este horario'
  const who = selectedDoctorName.value || 'el profesional'
  const ok = window.confirm(`¿Confirmas reservar ${when} con ${who}?`)
  if (!ok) return

  busySlotId.value = slotId
  try {
    await requestAppointmentBySlotId(slotId)
  } catch (e: any) {
    lastError.value = e?.message ?? 'rebook-not-allowed'
    ? 'No puedes volver a reservar este mismo horario. Por favor elige otro.'
      : (e?.message ?? 'No se pudo agendar');
  } finally {
    busySlotId.value = null
  }
}

async function onCancel(appointmentId: string) {
  lastError.value = null
  payMessage.value = null
  const slotId = appointmentId.split('_')[0]
  const s = slotMeta.value[slotId]
  const when = s ? `${formatDateShort(s.startIso)} ${formatHourLocal(s.startIso)}` : 'esta cita'
  const ok = window.confirm(`¿Seguro que deseas cancelar ${when}?`)
  if (!ok) return

  busyApptId.value = appointmentId
  try {
    await cancelAppointmentById(appointmentId)
    if (payOpenedId.value === appointmentId) payOpenedId.value = null
  } catch (e: any) {
    lastError.value = e?.message ?? 'No se pudo cancelar'
  } finally {
    busyApptId.value = null
  }
}

/* ---- Pago (PayPal) ---- */
function openPay(appointmentId: string) {
  payMessage.value = null
  payOpenedId.value = appointmentId
}
function closePay() {
  payOpenedId.value = null
}
function onPaid() {
  payMessage.value = 'Pago registrado correctamente (demo).'
  if (payOpenedId.value) {
    paidByApptId.value[payOpenedId.value] = true
  }
  payOpenedId.value = null
}
function onPayFailed() {
  payMessage.value = 'No se pudo completar el pago (demo).'
}

/* ----------------- Formatos ----------------- */
function formatHourLocal(iso?: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
function formatDateShort(iso?: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString([], { weekday: 'short', day: '2-digit', month: 'short' })
}
function formatDateLong(iso?: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString([], { weekday: 'long', day: '2-digit', month: 'long' })
}
function isRefundPending(a: any) {
  // Muestra "reembolso pendiente" si la cita está cancelada y:
  // - el backend lo marcó, o
  // - sabemos que hubo pago (paidBy/paidByApptId) pero aún no llegó la marca
  const backendFlag = a.refundStatus === 'pending' || a.refundRequested === true;
  const hadPayment = !!a.paidBy || !!paidByApptId.value[a.id];
  return a.status === 'cancelled' && (backendFlag || hadPayment);
}
function isPaid(a: any) {
  // Considera 'paid' si:
  //  - la cita está en requested/confirmed
  //  - y existe paidBy en la cita (lo escribe onPaymentApproved) o
  //    tenemos un registro de pago aprobado en paidByApptId
  //  - y NO hay un refund pendiente
  const hasPaymentFlag = !!(a as any).paidBy || !!paidByApptId.value[a.id]
  const inActiveState = a.status === 'requested' || a.status === 'confirmed'
  const noRefundInProgress = (a as any).refundStatus !== 'pending' && !(a as any).refundRequested
  return inActiveState && hasPaymentFlag && noRefundInProgress
}
</script>

<style scoped>
/* (tus estilos intactos) */
.citas-wrap { display: grid; gap: 16px; padding: 16px; }
.citas-header { display: grid; gap: 12px; }
.header-line { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.title { font-size: 20px; font-weight: 700; margin: 0; }
.spec-wrap { display: flex; align-items: center; gap: 8px; font-size: 14px; }
.spec-select { border: 1px solid #d1d5db; border-radius: 8px; padding: 6px 10px; background: #fff; }
.week { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; }
.day { border: 1px solid #d1d5db; border-radius: 10px; padding: 6px 0; background: #fff; cursor: pointer; }
.day.active { border-color: #1d4ed8; box-shadow: 0 0 0 2px rgba(29,78,216,.15) inset; }
.day .dow { font-size: 12px; color: #374151; }
.day .dom { font-size: 16px; font-weight: 700; color: #111827; }
.grid { display: grid; gap: 16px; grid-template-columns: 2fr 1fr; }
.panel { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; }
.panel-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.panel-title { margin: 0 0 8px; font-size: 16px; font-weight: 700; }
.doctor-card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px; margin-bottom: 10px; }
.doctor-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.doctor-name { font-weight: 700; }
.doctor-sub { color: #6b7280; font-size: 13px; }
.center-type { background: #1d4ed8; color: white; padding: 6px 10px; border-radius: 6px; font-size: 12px; }
.times { display: flex; flex-wrap: wrap; gap: 8px; }
.time-chip { border: 1px solid #1d4ed8; background: white; color: #1d4ed8; border-radius: 8px; padding: 6px 10px; cursor: pointer; }
.time-chip:disabled { opacity: .6; cursor: default; }
.time-chip .loading { margin-left: 6px; }
.appts { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
.appt-row { border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px; display: flex; justify-content: space-between; align-items: center; }
.appt-title { font-weight: 700; }
.appt-sub { color: #6b7280; font-size: 13px; }
.appt-actions { display: flex; gap: 8px; align-items: center; }
.badge { font-size: 12px; border-radius: 999px; padding: 2px 8px; border: 1px solid #d1d5db; text-transform: lowercase; }
.badge[data-status="requested"] { background: #eff6ff; border-color: #bfdbfe; color: #1d4ed8; }
.badge[data-status="cancelled"] { background: #fef2f2; border-color: #fecaca; color: #b91c1c; }
.badge.paid { background: #ecfdf5; border-color: #a7f3d0; color: #065f46; }
.btn-pay { background: #10b981; color: white; border: none; border-radius: 8px; padding: 6px 10px; cursor: pointer; }
.btn-pay:disabled { opacity: .6; cursor: default; }
.btn-cancel { background: #ef4444; color: white; border: none; border-radius: 8px; padding: 6px 10px; cursor: pointer; }
.btn-cancel:disabled { opacity: .6; cursor: default; }
.hint { color: #6b7280; font-size: 14px; }
.error { color: #b91c1c; }
.ok { color: #065f46; }
.paybox { border: 1px dashed #d1d5db; border-radius: 10px; padding: 10px; background: #f9fafb; }
.pay-hint { font-size: 12px; color: #6b7280; margin-top: 6px; }
.btn-link { background: transparent; border: none; color: #2563eb; cursor: pointer; padding: 0; }
@media (max-width: 900px) {
  .grid { grid-template-columns: 1fr; }
}
.badge.refund {
  background: #fff7ed;   /* naranja muy claro */
  border-color: #fdba74; /* naranja suave */
  color: #9a3412;        /* texto naranja oscuro */
}
</style>
