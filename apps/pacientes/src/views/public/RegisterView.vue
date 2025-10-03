<template>
  <PublicLayout>
    <section class="page">
      <div class="card">
        <h1 class="title">Registro</h1>
        <p v-if="DEMO" class="demo">Modo demo: se simula la creación de la cuenta.</p>

        <!-- UI-only: sin validaciones reales ni servicios -->
        <form @submit.prevent="onSubmit" novalidate class="form">
          <!-- Grupo B: Identificación legal -->
          <div class="row">
            <div class="field half">
              <label>Nombres</label>
              <input
                v-model.trim="form.nombres"
                type="text"
                class="input"
                placeholder="Ej: Camilo Andrés"
                autocomplete="given-name"
              />
            </div>

            <div class="field half">
              <label>RUT</label>
              <input
                :value="form.rut"
                @input="onRutInput"
                @blur="formatRutFinal"
                inputmode="numeric"
                class="input"
                placeholder="12.345.678-9"
              />
              <span class="msg">Se formatea automáticamente: 12.345.678-9</span>
            </div>
          </div>

          <div class="row">

            <div class="field half">
              <label>Apellido paterno</label>
              <input
                v-model.trim="form.apellidoPaterno"
                type="text"
                class="input"
                placeholder="Ej: Bravo"
                autocomplete="family-name"
              />
            </div>

            <div class="field half">
              <label>Apellido materno</label>
              <input
                v-model.trim="form.apellidoMaterno"
                type="text"
                class="input"
                placeholder="Ej: Soto"
                autocomplete="additional-name"
              />
            </div>
          </div>

          <div class="row">

            <div class="field half">
              <label>Email</label>
              <input
                v-model.trim="form.email"
                @blur="emailToLower"
                type="email"
                class="input"
                placeholder="tu@correo.com"
                autocomplete="email"
              />
            </div>

            <div class="field half">
              <label>Fecha de nacimiento</label>
              <input
                v-model="form.fechaNacimiento"
                type="date"
                class="input"
                :max="maxBirthDate"
              />
              <span class="msg">Debes ser mayor de 18 años.</span>
            </div>
          </div>

          <div class="row">
            <div class="field half">
              <label>Contraseña</label>
              <input
                v-model="form.password"
                type="password"
                class="input"
                placeholder="Mínimo 6 caracteres"
                autocomplete="new-password"
              />
            </div>

            <div class="field half">
              <label>Confirmar contraseña</label>
              <input
                v-model="form.confirm"
                type="password"
                class="input"
                placeholder="Repite tu contraseña"
                autocomplete="new-password"
              />
            </div>
          </div>

          <!-- Grupo C: Cobertura de salud -->
          <div class="row">
            <div class="field half">
              <label>Previsión</label>
              <select v-model="form.prevision" class="input">
                <option value="" disabled>Selecciona una opción</option>
                <option value="Fonasa">Fonasa</option>
                <option value="Isapre">Isapre</option>
                <option value="Particular">Particular</option>
              </select>
            </div>

            <div class="field half" v-if="form.prevision === 'Isapre'">
              <label>Isapre</label>
              <select v-model="form.isapre" class="input">
                <option value="" disabled>Selecciona tu Isapre</option>
                <option v-for="op in isapres" :key="op" :value="op">{{ op }}</option>
              </select>
            </div>
          </div>

          <!-- Grupo D: Consentimientos -->
          <div class="row">
            <div class="field half">
              <label class="flex items-start" style="gap:.6rem;">
                <input type="checkbox" v-model="form.aceptaTerminos" />
                <span>Acepto los <a href="#" class="underline">Términos</a> y la <a href="#" class="underline">Política de Privacidad</a>.</span>
              </label>
            </div>
            <div class="field half">
              <label class="flex items-start" style="gap:.6rem;">
                <input type="checkbox" v-model="form.autorizaDatos" />
                <span>Autorizo el tratamiento de mis datos de salud.</span>
              </label>
            </div>
          </div>

          <button type="submit" class="btn" :disabled="submitting || !puedeContinuar">
            {{ submitting ? 'Creando…' : 'Crear cuenta' }}
          </button>

          <p v-if="serverError" class="alert error">{{ serverError }}</p>
          <p v-if="okMsg" class="alert success">{{ okMsg }}</p>

          <p class="foot">
            ¿Ya tienes cuenta?
            <router-link to="/login">Ingresar</router-link>
          </p>
        </form>
      </div>
    </section>
  </PublicLayout>
</template>

<script setup lang="ts">
import { reactive, ref, computed } from 'vue'
import PublicLayout from '../../layouts/PublicLayout.vue'

const DEMO = import.meta.env.VITE_DEMO === '1'

const isapres = [
  'Banmédica','Isalud','Colmena','Consalud','CruzBlanca','Cruz del norte','Nueva MasVida','Fundación','Vida Tres','Esencial'
]

// Modelo UI-only
type Form = {
  nombres: string
  apellidoPaterno: string
  apellidoMaterno: string
  rut: string
  fechaNacimiento: string
  email: string
  password: string
  confirm: string
  prevision: '' | 'Fonasa' | 'Isapre' | 'Particular'
  isapre: string
  aceptaTerminos: boolean
  autorizaDatos: boolean
}
const form = reactive<Form>({
  nombres: '', apellidoPaterno: '', apellidoMaterno: '', rut: '',
  fechaNacimiento: '', email: '', password: '', confirm: '',
  prevision: '', isapre: '', aceptaTerminos: false, autorizaDatos: false
})

// Estados de UI (sin lógica de validación ni servicios)
const submitting = ref(false)
const serverError = ref('')
const okMsg = ref('')

// Email a minúsculas al salir
function emailToLower() { form.email = form.email.trim().toLowerCase() }

// ---------- RUT auto-formateado en vivo ----------
function cleanRut(raw: string) {
  const s = raw.replace(/[^0-9kK]/g, '').toUpperCase()
  return { cuerpo: s.slice(0, -1), dv: s.slice(-1) }
}
function withThousands(n: string) {
  return n.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}
function formatRut(raw: string) {
  const { cuerpo, dv } = cleanRut(raw)
  if (!cuerpo) return dv ? dv : ''
  return dv ? `${withThousands(cuerpo)}-${dv}` : withThousands(cuerpo)
}
function onRutInput(e: Event) {
  const el = e.target as HTMLInputElement
  const start = el.selectionStart ?? el.value.length
  const beforeLen = el.value.length

  form.rut = formatRut(el.value)

  const afterLen = form.rut.length
  const newPos = Math.max(0, start + (afterLen - beforeLen))
  requestAnimationFrame(() => el.setSelectionRange(newPos, newPos))
}
function formatRutFinal() { form.rut = formatRut(form.rut) }
// ---------- FIN RUT ----------

// Fecha máxima (≥ 18 años)
const maxBirthDate = computed(() => {
  const d = new Date()
  d.setFullYear(d.getFullYear() - 18)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
})

// Habilitar botón (chequeos mínimos visuales)
const puedeContinuar = computed(() => {
  const okCred = form.email && form.password.length >= 6 && form.password === form.confirm
  const okIdent = form.nombres && form.apellidoPaterno && form.apellidoMaterno && form.rut && form.fechaNacimiento
  const okPrev = form.prevision && (form.prevision !== 'Isapre' || !!form.isapre)
  const okConsent = form.aceptaTerminos && form.autorizaDatos
  return okCred && okIdent && okPrev && okConsent
})

/** TODO (Tarea 3–4): conectar con Firebase (createUser + perfil Paciente) */
async function onSubmit () {
  submitting.value = true
  serverError.value = ''
  okMsg.value = ''
  try {
    okMsg.value = 'Vista OK. En el siguiente paso conectaremos validaciones y guardado real.'
  } catch (e: any) {
    serverError.value = e?.message || 'No se pudo crear la cuenta (simulado).'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
/* Mantengo tu base */
.page {
  --primary: #0ea5e9;
  --secondary: #10b981;
  --text: #0f172a;
  --muted: #64748b;
  background: linear-gradient(180deg, #f0f9ff 0%, #ecfeff 100%);
  min-height: 100dvh;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem 0;
  width: 100vw;    
  max-width: 100vw;
  box-sizing: border-box;
}
.card {
  width: 100%;
  max-width: 700px; /* Si quieres aún más aire, puedes subirla a 760–820px */
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 20px;
  padding: 2rem 2.5rem;
  box-shadow: 0 12px 30px rgba(2, 6, 23, 0.06);
  display: flex;
  flex-direction: column;
  align-items: center;
}
.title { font-size: 2rem; font-weight: 700; color: var(--text); margin: 0 0 1.2rem 0; }
.demo { font-size: 1rem; color: var(--muted); margin: -0.25rem 0 1rem 0; }

/* Contenedor del formulario */
.form {
  margin-top: .25rem;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 2rem; /* más respiración vertical */
}

/* FILAS EN GRID: 1 columna por defecto; 2 columnas en >=600px */
.form .row {
  display: grid !important;
  grid-template-columns: 1fr;
  gap: 1rem 1.2rem; /* fila / columna */
  align-items: start;
}
@media (min-width: 600px) { /* antes: 768px (no se activaba dentro de 700px) */
  .form .row { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

/* Campos */
.form .field { width: 100%; min-width: 0; display: flex; flex-direction: column; }

label { display: block; font-size: 1rem; color: var(--text); margin-bottom: .45rem; font-weight: 500; }

.input {
  width: 80%;
  padding: .85rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  outline: none;
  transition: border-color .15s, box-shadow .15s, background .15s;
  background: #fff;
  font-size: 1.08rem;
}
.input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(14,165,233,.18); }

/* Mensajitos bajo el input */
.msg { display: block; margin-top: .35rem; font-size: .95rem; color: #64748b; }
.msg.error { color: #b91c1c; }

/* Botón y alerts (igual que tenías) */
.btn {
  width: 100%;
  padding: 1rem 0;
  border: none;
  border-radius: 12px;
  font-weight: 700;
  color: #fff;
  cursor: pointer;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  box-shadow: 0 8px 20px rgba(16,185,129,.25);
  transition: transform .05s ease, box-shadow .2s ease, opacity .2s ease;
  font-size: 1.15rem;
}
.btn:hover { transform: translateY(-1px); }
.btn:active { transform: translateY(0); }
.btn:disabled { opacity: .6; cursor: default; }

.alert { text-align: center; padding: .7rem 1rem; border-radius: 10px; margin-top: 1rem; font-weight: 600; font-size: 1rem; }
.alert.error { color: #7f1d1d; background: #fee2e2; border: 1px solid #fecaca; }
.alert.success { color: #064e3b; background: #d1fae5; border: 1px solid #a7f3d0; }

.foot { margin-top: 1.2rem; font-size: 1.05rem; color: var(--muted); text-align: center; }
.foot a { color: var(--primary); font-weight: 700; }

/* Opcional: altura de select parecida al input */
select.input { height: 2.9rem; }

/* Opcional: un poquito más de aire entre filas contiguas */
.form .row + .row { margin-top: .25rem; }
</style>
