<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { db } from '@/services/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { subscribeMyDoctorAppointments } from '../../services/appointments'

type Appt = {
  id: string
  patientUid: string
  doctorUid: string
  slotId: string
  specialty: string
  dateISO: string
  status: 'requested'|'confirmed'|'cancelled'|'paid'|'completed'
  refundStatus?: 'pending'|'approved'|'rejected'
  paidBy?: string
  paymentId?: string
  paidAt?: any
  patientName?: string
}

const loading = ref(true)
const error = ref<string | null>(null)
const appts = ref<Appt[]>([])

// cache de metadatos de slot y paciente
const slotMeta = ref<Record<string, { startIso: string; status?: string }>>({})
const patientMeta = ref<Record<string, { fullName?: string }>>({})

// TZ del médico (por defecto America/Santiago)
const doctorTz = ref('America/Santiago')

const displayName = (a: Appt) =>
  a.patientName ||
  patientMeta.value[a.patientUid]?.fullName ||
  'Paciente'

const getStartIso = (a: Appt) =>
  slotMeta.value[a.slotId]?.startIso || a.dateISO || ''

// ---- Helpers de fecha/hora con TZ explícita ----
const fmtHour = (iso?: string) => {
  if (!iso) return ''
  const d = new Date(iso)
  return new Intl.DateTimeFormat('es-CL', {
    timeZone: doctorTz.value, hour: '2-digit', minute: '2-digit'
  }).format(d)
}
const fmtDate = (iso?: string) => {
  if (!iso) return ''
  const d = new Date(iso)
  return new Intl.DateTimeFormat('es-CL', {
    timeZone: doctorTz.value, weekday: 'long', day: '2-digit', month: 'short'
  }).format(d)
}
const fmtDayTitle = (iso?: string) => {
  if (!iso) return ''
  const d = new Date(iso)
  return new Intl.DateTimeFormat('es-CL', {
    timeZone: doctorTz.value, weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  }).format(d)
}
// "YYYY-MM-DD" en la TZ del médico
const ymdInTz = (iso: string) => {
  const d = new Date(iso)
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: doctorTz.value, year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(d) // p.ej. "2025-10-13"
}

async function warmUpMeta(list: Appt[]) {
  // Slots
  const slotIds = Array.from(new Set(list.map(a => a.slotId).filter(Boolean)))
  for (const id of slotIds) {
    if (slotMeta.value[id]) continue
    const snap = await getDoc(doc(db, 'doctor_slots', id))
    if (snap.exists()) {
      const s = snap.data() as any
      slotMeta.value[id] = {
        startIso: s.dateISO ?? s.startIso ?? '',
        status: s.status,
      }
    } else {
      slotMeta.value[id] = { startIso: '', status: undefined }
    }
  }
  // Pacientes
  const pids = Array.from(new Set(list.map(a => a.patientUid).filter(Boolean)))
  for (const pid of pids) {
    if (patientMeta.value[pid]) continue
    const ps = await getDoc(doc(db, 'patients', pid))
    if (ps.exists()) {
      const p = ps.data() as any
      const fullName =
        p.fullName ||
        [p.firstName, p.lastName].filter(Boolean).join(' ').trim() ||
        [p.nombres, p.apellidoPaterno, p.apellidoMaterno].filter(Boolean).join(' ').trim() ||
        'Paciente'
      patientMeta.value[pid] = { fullName }
    } else {
      patientMeta.value[pid] = { fullName: undefined }
    }
  }
}

let unsub: (() => void) | null = null
onMounted(async () => {
  try {
    // Cargar TZ del médico a partir del usuario autenticado (si existe)
    const auth = getAuth()
    const uid = auth.currentUser?.uid
    if (uid) {
      const uSnap = await getDoc(doc(db, 'users', uid))
      doctorTz.value = uSnap.data()?.tz || 'America/Santiago'
    }

    // Suscripción a citas del médico
    unsub = await subscribeMyDoctorAppointments(async (list) => {
      appts.value = list
      loading.value = false
      await warmUpMeta(list)
    })
  } catch (e: any) {
    error.value = e?.message ?? 'No se pudo cargar la agenda.'
    loading.value = false
  }
})
onBeforeUnmount(() => { unsub?.(); unsub = null })

// Agrupar por día usando la TZ del médico
const days = computed(() => {
  const map: Record<string, Appt[]> = {}
  for (const a of appts.value) {
    const iso = getStartIso(a)
    const key = iso ? ymdInTz(iso) : 'sin-fecha'
    ;(map[key] ||= []).push(a)
  }
  for (const k of Object.keys(map)) {
    map[k].sort((a,b) => getStartIso(a).localeCompare(getStartIso(b)))
  }
  return Object.entries(map)
    .sort((a,b) => a[0].localeCompare(b[0]))
    .map(([ymd, list]) => ({ ymd, list }))
})

// Texto de estado para el médico
function statusBadge(a: Appt): { text: string; kind: 'neutral'|'ok'|'warn'|'danger' } {
  const slotStatus = slotMeta.value[a.slotId]?.status

  // 1) Canceladas → solo "cancelada"
  if (a.status === 'cancelled') {
    return { text: 'cancelada', kind: 'danger' }
  }

  // 2) Pagada/confirmada o slot "booked" → esperando check-in
  const isPaidOrConfirmed =
    a.status === 'confirmed' ||
    a.status === 'paid' ||
    slotStatus === 'booked' ||
    !!a.paidBy || !!a.paymentId || !!a.paidAt

  if (isPaidOrConfirmed) {
    return { text: 'pendiente de check-in', kind: 'ok' }
  }

  // 3) Aún sin pago
  if (a.status === 'requested') {
    return { text: 'pendiente de pago', kind: 'neutral' }
  }

  // 4) Atendida
  if (a.status === 'completed') {
    return { text: 'completada', kind: 'ok' }
  }

  return { text: a.status || '—', kind: 'neutral' }
}
</script>

<template>
  <section class="agenda-wrap">
    <header class="top">
      <h2>Agenda de hoy y próximas</h2>
    </header>

    <p v-if="loading" class="hint">Cargando agenda…</p>
    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="!loading && days.length === 0" class="hint">
      No hay citas próximas.
    </div>

    <div v-for="grp in days" :key="grp.ymd" class="day">
      <h3 class="day-title">
        {{ fmtDayTitle(getStartIso(grp.list[0])) }}
      </h3>

      <ul class="list">
        <li v-for="a in grp.list" :key="a.id" class="row">
          <div class="who">
            <div class="name">{{ displayName(a) }}</div>
            <div class="sub">{{ a.specialty || 'General' }}</div>
          </div>

          <div class="when">
            <div class="time">{{ fmtHour(getStartIso(a)) }}</div>
            <div class="date">{{ fmtDate(getStartIso(a)) }}</div>
          </div>

          <div class="state">
            <span class="badge" :data-kind="statusBadge(a).kind">
              {{ statusBadge(a).text }}
            </span>
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.agenda-wrap { max-width: 980px; margin: 1.5rem auto; padding: 0 12px; font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; }
.top { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
.hint { color:#6b7280; }
.error { color:#b91c1c; }
.day { margin: 14px 0; }
.day-title { margin: 0 0 6px; font-size: 1rem; text-transform: capitalize; }
.list { list-style:none; padding:0; margin:0; display:grid; gap:8px; }
.row { display:grid; grid-template-columns: 1fr auto auto; gap:12px; align-items:center;
       border:1px solid #e5e7eb; border-radius:12px; padding:10px; background:#fff; }
.who .name { font-weight:600; }
.who .sub { font-size:.85rem; color:#6b7280; }
.when { text-align:right; }
.when .time { font-weight:700; }
.when .date { font-size:.85rem; color:#6b7280; text-transform: capitalize; }
.state { display:flex; gap:6px; justify-content:flex-end; }
.badge { font-size:.75rem; padding:2px 8px; border-radius:999px; border:1px solid #d1d5db; text-transform: lowercase; }
.badge[data-kind="neutral"] { background:#f3f4f6; }
.badge[data-kind="ok"] { background:#ecfdf5; border-color:#a7f3d0; }
.badge[data-kind="warn"] { background:#fff7ed; border-color:#fed7aa; }
.badge[data-kind="danger"] { background:#fef2f2; border-color:#fecaca; }
@media (max-width: 800px) {
  .row { grid-template-columns: 1fr 1fr; }
  .state { grid-column: 1 / -1; justify-content:flex-start; }
  .when { text-align:left; }
}
</style>