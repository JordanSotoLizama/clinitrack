<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import type { Perfil, StaffRole } from '../../services/adminUsers'
import {
  listProfiles,
  createStaff,
  deleteStaff,
  createDoctor,
  generateSlots,
} from '../../services/adminUsers'

const cargando = ref(false)
const error = ref('')

const perfiles = ref<Perfil[]>([])

/* -------- Modal Crear Usuario -------- */
const showCreate = ref(false)
const email = ref('')
const password = ref('')
const role = ref<StaffRole>('recepcion')

/* Campos extra cuando role === 'medico' */
const isDoctor = computed(() => role.value === 'medico')
const docFirstName = ref('')
const docLastName  = ref('')
const docSpecialty = ref('General')
const docSlotMins  = ref(30)          // 15|20|30|45|60
const docPhone     = ref('')
const docRoom      = ref('')

/* Generación de slots tras crear médico (opcional) */
const genSlotsNow   = ref(true)
const fromDateISO   = ref(getYMD(new Date()))           // hoy
const toDateISO     = ref(getYMD(addDays(new Date(), 7))) // +7 días

function addDays(d: Date, days: number) {
  const x = new Date(d); x.setDate(x.getDate() + days); return x
}
function pad(n: number) { return n < 10 ? `0${n}` : `${n}` }
function getYMD(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function openCreate() {
  showCreate.value = true
  email.value = ''
  password.value = ''
  role.value = 'recepcion'

  // limpia campos de médico
  docFirstName.value = ''
  docLastName.value = ''
  docSpecialty.value = 'General'
  docSlotMins.value = 30
  docPhone.value = ''
  docRoom.value = ''
  genSlotsNow.value = true
  fromDateISO.value = getYMD(new Date())
  toDateISO.value = getYMD(addDays(new Date(), 7))
}
function closeCreate() {
  showCreate.value = false
}

/* -------- Datos -------- */
async function cargar() {
  cargando.value = true; error.value = ''
  try {
    perfiles.value = await listProfiles()
  } catch (e: any) {
    error.value = e?.message || 'No se pudo cargar la lista.'
  } finally {
    cargando.value = false
  }
}

/* -------- Acciones -------- */
async function submitCreate() {
  if (!email.value || !password.value) {
    alert('Correo y contraseña son requeridos')
    return
  }

  cargando.value = true; error.value = ''

  try {
    if (isDoctor.value) {
      // Validación mínima de médico
      if (!docFirstName.value || !docLastName.value) {
        alert('Nombre y apellido del médico son requeridos')
        cargando.value = false
        return
      }
      if (![15, 20, 30, 45, 60].includes(docSlotMins.value)) {
        alert('Duración de slot inválida (usa 15,20,30,45 o 60)')
        cargando.value = false
        return
      }

      // 1) Crear el médico (perfil + Auth + claim)
      const { uid } = await createDoctor({
        email: email.value.trim(),
        password: password.value,
        firstName: docFirstName.value.trim(),
        lastName: docLastName.value.trim(),
        specialty: docSpecialty.value,
        defaultSlotMins: docSlotMins.value,
        phone: docPhone.value || undefined,
        room: docRoom.value || undefined,
      })

      // 2) (opcional) generar slots iniciales
      if (genSlotsNow.value) {
        await generateSlots({
          doctorUid: uid,
          fromDateISO: fromDateISO.value,
          toDateISO: toDateISO.value,
          slotMins: docSlotMins.value,
        })
      }
    } else {
      // Staff tradicional (recepcion, laboratorio, admin)
      await createStaff(email.value.trim(), password.value, role.value)
    }

    closeCreate()
    await cargar()
  } catch (e: any) {
    error.value = e?.message || 'Error al crear usuario'
  } finally {
    cargando.value = false
  }
}

async function eliminarUsuario(uid: string) {
  if (!confirm('¿Eliminar este usuario?')) return
  cargando.value = true; error.value = ''
  try {
    await deleteStaff(uid)
    await cargar()
  } catch (e: any) {
    error.value = e?.message || 'Error al eliminar'
  } finally {
    cargando.value = false
  }
}

onMounted(cargar)
</script>

<template>
  <section class="admin-container">
    <header class="admin-header">
      <h2>Administración de usuarios</h2>
      <button class="btn primary" @click="openCreate">+ Crear usuario</button>
    </header>

    <p v-if="error" class="msg error">{{ error }}</p>
    <p v-if="cargando" class="msg">Cargando usuarios…</p>

    <div class="grid">
      <article v-for="p in perfiles" :key="p.uid" class="card">
        <div class="card-body">
          <div class="row">
            <span class="label">Correo</span>
            <span class="value">{{ p.email }}</span>
          </div>
          <div class="row">
            <span class="label">Rol</span>
            <span class="pill">{{ p.role }}</span>
          </div>
        </div>
        <footer class="card-actions">
          <button class="btn danger" @click="eliminarUsuario(p.uid)">Eliminar</button>
        </footer>
      </article>
    </div>

    <!-- Modal Crear Usuario -->
    <div v-if="showCreate" class="modal-backdrop" @click.self="closeCreate">
      <div class="modal" role="dialog" aria-modal="true" aria-label="Crear usuario">
        <header class="modal-header">
          <h3>Crear usuario</h3>
          <button class="icon-btn" @click="closeCreate" aria-label="Cerrar">✕</button>
        </header>

        <form class="modal-body" @submit.prevent="submitCreate">
          <label class="field">
            <span>Correo</span>
            <input v-model="email" type="email" placeholder="correo@clinetrack.test" required />
          </label>

          <label class="field">
            <span>Contraseña</span>
            <input v-model="password" type="password" placeholder="Contraseña temporal" required />
          </label>

          <label class="field">
            <span>Rol</span>
            <select v-model="role">
              <option value="recepcion">Recepción</option>
              <option value="medico">Médico</option>
              <option value="laboratorio">Laboratorio</option>
              <option value="admin">Admin</option>
            </select>
          </label>

          <!-- Campos adicionales cuando es Médico -->
          <template v-if="isDoctor">
            <hr class="divider" />
            <div class="two">
              <label class="field">
                <span>Nombre</span>
                <input v-model="docFirstName" type="text" placeholder="María" required />
              </label>
              <label class="field">
                <span>Apellido</span>
                <input v-model="docLastName" type="text" placeholder="Rojas" required />
              </label>
            </div>

            <div class="two">
              <label class="field">
                <span>Especialidad</span>
                <input v-model="docSpecialty" type="text" placeholder="General" />
              </label>
              <label class="field">
                <span>Duración de cada hora (min)</span>
                <input v-model.number="docSlotMins" type="number" min="15" step="5" />
              </label>
            </div>

            <div class="two">
              <label class="field">
                <span>Teléfono (opcional)</span>
                <input v-model="docPhone" type="text" placeholder="22223333" />
              </label>
              <label class="field">
                <span>Box / Sala (opcional)</span>
                <input v-model="docRoom" type="text" placeholder="Box 1" />
              </label>
            </div>

            <label class="check">
              <input type="checkbox" v-model="genSlotsNow" />
              <span>Generar horarios automáticamente</span>
            </label>

            <div v-if="genSlotsNow" class="two">
              <label class="field">
                <span>Desde (YYYY-MM-DD)</span>
                <input v-model="fromDateISO" type="date" />
              </label>
              <label class="field">
                <span>Hasta (YYYY-MM-DD)</span>
                <input v-model="toDateISO" type="date" />
              </label>
            </div>
          </template>

          <footer class="modal-actions">
            <button type="button" class="btn" @click="closeCreate">Cancelar</button>
            <button type="submit" class="btn primary">Crear usuario</button>
          </footer>
        </form>
      </div>
    </div>
  </section>
</template>

<style scoped>
.admin-container { max-width: 980px; margin: 1.5rem auto; padding: 0 12px; font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; }
.admin-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.admin-header h2 { flex: 1; margin: 0; font-size: 1.25rem; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
.card { border: 1px solid #e5e7eb; border-radius: 12px; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,.04); display: flex; flex-direction: column; }
.card-body { padding: 12px; display: grid; gap: 8px; }
.row { display: grid; grid-template-columns: 80px 1fr; gap: 8px; align-items: center; }
.label { color: #6b7280; font-size: .85rem; }
.value { color: #111827; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pill { display: inline-block; padding: 2px 8px; border-radius: 999px; background: #f3f4f6; font-size: .8rem; text-transform: capitalize; }
.card-actions { padding: 10px 12px; border-top: 1px solid #f0f0f0; display: flex; justify-content: flex-end; }

.msg { margin: 8px 0; color: #374151; }
.msg.error { color: #b91c1c; }

/* Modal */
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: grid; place-items: center; z-index: 50; }
.modal { width: 100%; max-width: 560px; background: #fff; border-radius: 14px; box-shadow: 0 10px 30px rgba(0,0,0,.15); overflow: hidden; }
.modal-header { display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-bottom:1px solid #eee; }
.modal-body { display:grid; gap:10px; padding:14px 16px; }
.modal-actions { display:flex; justify-content:flex-end; gap:8px; margin-top:6px; }

.field { display:grid; gap:6px; }
.field input, .field select { padding:.6rem .7rem; border:1px solid #e5e7eb; border-radius:10px; }
.two { display:grid; grid-template-columns: 1fr 1fr; gap:10px; }
.check { display:flex; align-items:center; gap:8px; margin-top:6px; }

.icon-btn { background:transparent; border:0; font-size:18px; cursor:pointer; }
.btn { padding:.6rem .9rem; border:0; border-radius:10px; cursor:pointer; background:#f3f4f6; }
.btn.primary { background:#243746; color:#fff; }
.divider { border: 0; border-top: 1px solid #eee; margin: 4px 0 2px; }
</style>