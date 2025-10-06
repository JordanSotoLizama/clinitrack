<template>
  <div class="citas-wrap">
    <header class="citas-header">
      <div class="header-line">
        <h1 class="title">Reserva tu hora</h1>

        <!-- Filtro de especialidad -->
        <label class="spec-wrap">
          <span>Especialidad</span>
          <select v-model="selectedSpecialty" class="spec-select">
            <option v-for="sp in specialties" :key="sp" :value="sp">{{ sp }}</option>
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
          <span class="pill" v-if="!loadingSlots">{{ totalSlotsOfDay }} horarios</span>
        </div>

        <div v-if="loadingSlots" class="hint">Cargando horarios…</div>
        <div v-else-if="doctorsOfDay.length === 0" class="hint">
          No hay horarios disponibles para este día en {{ selectedSpecialty }}.
        </div>

        <article
          v-for="doc in doctorsOfDay"
          :key="doc.doctorId"
          class="doctor-card"
        >
          <div class="doctor-head">
            <div class="doctor-info">
              <div class="doctor-name">{{ doc.doctorName || 'Profesional' }}</div>
              <div class="doctor-sub">{{ doc.specialty }}</div>
            </div>
            <div class="center-type">Presencial</div>
          </div>

          <div class="times">
            <button
              v-for="s in doc.slots"
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

              <!-- Botón de pago SOLO para citas 'requested' -->
              <button
                v-if="a.status === 'requested'"
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

          <!-- Contenedor del botón PayPal (debajo de la cita abierta) -->
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
import { onMounted, onBeforeUnmount, ref, computed } from 'vue'
import {
  subscribeAvailableSlots,
  subscribeMyAppointments,
  requestAppointmentBySlotId,
  cancelAppointmentById,
  type DoctorSlot,
  type Appointment,
  type Specialty,
} from '@/services/appointments'
import { db } from '@/services/firebase'
import { doc, getDoc } from 'firebase/firestore'
import PayPalButton from '@/components/app/PayPalButton.vue'

/* ----------------- Estado base ----------------- */
const loadingSlots = ref(true)
const loadingAppts = ref(true)
const lastError = ref<string | null>(null)
const busySlotId = ref<string | null>(null)
const busyApptId = ref<string | null>(null)

const payOpenedId = ref<string | null>(null)
const payMessage = ref<string | null>(null)
const DEMO_AMOUNT_CLP = 10000

const allSlots = ref<DoctorSlot[]>([])
const myAppts = ref<Appointment[]>([])

/* Filtro de especialidad (simple, cliente) */
const specialties = ref<Specialty[]>(['General', 'Traumatología', 'Laboratorio'])
const selectedSpecialty = ref<Specialty>('General')

/* Para mostrar detalles en "Mis citas" sin cambiar el servicio, traemos el slot */
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

/* ----------------- Suscripciones ----------------- */
let unsubSlots: (() => void) | null = null
let unsubAppts: (() => void) | null = null

onMounted(async () => {
  unsubSlots = await subscribeAvailableSlots((slots) => {
    allSlots.value = slots
    loadingSlots.value = false
  }, { max: 200 })

  unsubAppts = await subscribeMyAppointments(async (appts) => {
    myAppts.value = appts
    loadingAppts.value = false
    // Traer metadatos del slot (hora y médico) para cada cita
    const ids = Array.from(new Set(appts.map(a => a.slotId)))
    for (const id of ids) {
      if (slotMeta.value[id]) continue
      const snap = await getDoc(doc(db, 'doctor_slots', id))
      if (snap.exists()) {
        const s = snap.data() as DoctorSlot
        slotMeta.value[id] = { startIso: s.startIso, doctorName: s.doctorName }
      } else {
        slotMeta.value[id] = { startIso: '', doctorName: undefined }
      }
    }
  })
})

onBeforeUnmount(() => {
  unsubSlots?.(); unsubSlots = null
  unsubAppts?.(); unsubAppts = null
})

/* ----------------- Derivados para UI ----------------- */
const selectedDayKey = computed(() => {
  const d = new Date(selectedDayIso.value)
  return `${d.getUTCFullYear()}-${dd(d.getUTCMonth()+1)}-${dd(d.getUTCDate())}`
})

const slotsOfSelectedDay = computed(() => {
  return allSlots.value.filter(s => {
    const d = new Date(s.startIso)
    const key = `${d.getUTCFullYear()}-${dd(d.getUTCMonth()+1)}-${dd(d.getUTCDate())}`
    return key === selectedDayKey.value && s.specialty === selectedSpecialty.value
  })
})

const totalSlotsOfDay = computed(() => slotsOfSelectedDay.value.length)

const doctorsOfDay = computed(() => {
  const byDoctor: Record<string, { doctorId: string; doctorName?: string; specialty: string; slots: DoctorSlot[] }> = {}
  for (const s of slotsOfSelectedDay.value) {
    if (!byDoctor[s.doctorId]) {
      byDoctor[s.doctorId] = {
        doctorId: s.doctorId,
        doctorName: s.doctorName,
        specialty: s.specialty,
        slots: []
      }
    }
    byDoctor[s.doctorId].slots.push(s)
  }
  Object.values(byDoctor).forEach(d => d.slots.sort((a, b) => a.startIso.localeCompare(b.startIso)))
  return Object.values(byDoctor).sort((a, b) => a.slots[0].startIso.localeCompare(b.slots[0].startIso))
})

const myApptsSorted = computed(() => {
  return [...myAppts.value].sort((a, b) => a.id.localeCompare(b.id))
})

/* ----------------- Acciones ----------------- */
function findSlotById(id: string) {
  return allSlots.value.find(s => s.id === id)
}

async function onRequest(slotId: string) {
  lastError.value = null
  payMessage.value = null
  const s = findSlotById(slotId)
  const when = s ? `${formatDateShort(s.startIso)} ${formatHourLocal(s.startIso)}` : 'este horario'
  const who = s?.doctorName || 'el profesional'
  const ok = window.confirm(`¿Confirmas reservar ${when} con ${who}?`)
  if (!ok) return

  busySlotId.value = slotId
  try {
    await requestAppointmentBySlotId(slotId)
  } catch (e: any) {
    lastError.value = e?.message ?? 'No se pudo agendar'
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
  payOpenedId.value = null
}
function onPayFailed() {
  payMessage.value = 'No se pudo completar el pago (demo).'
}
</script>

<style scoped>
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

.pill { font-size: 12px; border-radius: 999px; padding: 2px 10px; background: #eff6ff; border: 1px solid #bfdbfe; color: #1d4ed8; }

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
</style>