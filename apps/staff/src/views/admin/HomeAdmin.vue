<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { Perfil, StaffRole } from '../../services/adminUsers';
import { listProfiles, createStaff, deleteStaff } from '../../services/adminUsers';

const cargando = ref(false);
const error = ref('');
const perfiles = ref<Perfil[]>([]);

// --- Modal Crear Usuario ---
const showCreate = ref(false);
const email = ref('');
const password = ref('');
const role = ref<StaffRole>('recepcion');

function openCreate() {
  showCreate.value = true;
  email.value = '';
  password.value = '';
  role.value = 'recepcion';
}
function closeCreate() {
  showCreate.value = false;
}

// Cargar lista real desde Firestore
async function cargar() {
  cargando.value = true; error.value = '';
  try {
    perfiles.value = await listProfiles();
  } catch (e: any) {
    error.value = e?.message || 'No se pudo cargar la lista.';
  } finally {
    cargando.value = false;
  }
}

// Crear usuario (Cloud Function)
async function submitCreate() {
  if (!email.value || !password.value) {
    alert('Correo y contraseña son requeridos');
    return;
  }
  cargando.value = true; error.value = '';
  try {
    await createStaff(email.value.trim(), password.value, role.value);
    closeCreate();
    await cargar(); // refresca listado
  } catch (e: any) {
    error.value = e?.message || 'Error al crear usuario';
  } finally {
    cargando.value = false;
  }
}

// Eliminar usuario
async function eliminarUsuario(uid: string) {
  if (!confirm('¿Eliminar este usuario?')) return;
  cargando.value = true; error.value = '';
  try {
    await deleteStaff(uid);
    await cargar();
  } catch (e: any) {
    error.value = e?.message || 'Error al eliminar';
  } finally {
    cargando.value = false;
  }
}

onMounted(cargar);
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
          <button class="btn danger" @click="eliminarUsuario(p.uid)">
            Eliminar
          </button>
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
.btn { padding: 8px 12px; border: 0; border-radius: 10px; cursor: pointer; }
.btn.primary { background: #243746; color: #fff; }
.btn.danger { background: #e11d48; color: #fff; }
.msg { margin: 8px 0; color: #374151; }
.msg.error { color: #b91c1c; }

/* Modal */
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.35); display: grid; place-items: center; z-index: 50; }
.modal { width: 100%; max-width: 480px; background: #fff; border-radius: 14px; box-shadow: 0 10px 30px rgba(0,0,0,.15); overflow: hidden; }
.modal-header { display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-bottom:1px solid #eee; }
.modal-body { display:grid; gap:10px; padding:14px 16px; }
.modal-actions { display:flex; justify-content:flex-end; gap:8px; margin-top:6px; }
.field { display:grid; gap:6px; }
.field input, .field select { padding:.6rem .7rem; border:1px solid #e5e7eb; border-radius:10px; }
.icon-btn { background:transparent; border:0; font-size:18px; cursor:pointer; }
.btn { padding:.6rem .9rem; border:0; border-radius:10px; cursor:pointer; background:#f3f4f6; }
.btn.primary { background:#243746; color:#fff; }
</style>