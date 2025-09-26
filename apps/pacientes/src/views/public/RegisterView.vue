<!-- apps/pacientes/src/views/paciente/RegisterView.vue -->
<template>
  <PublicLayout>
    <section class="page">
      <div class="card">
        <h1 class="title">Registro</h1>
        <p v-if="DEMO" class="demo">Modo demo: se simula la creación de la cuenta.</p>

        <form @submit.prevent="onSubmit" novalidate class="form">
          <!-- Nombre -->
          <div class="field">
            <label>Nombre</label>
            <input
              v-model.trim="form.nombre"
              @blur="touched.nombre = true"
              type="text"
              class="input"
              :class="{ 'is-error': touched.nombre && errors.nombre }"
              placeholder="Ej: Camilo"
              autocomplete="given-name"
            />
            <small v-if="touched.nombre && errors.nombre" class="msg error">{{ errors.nombre }}</small>
          </div>

          <!-- Apellido -->
          <div class="field">
            <label>Apellido</label>
            <input
              v-model.trim="form.apellido"
              @blur="touched.apellido = true"
              type="text"
              class="input"
              :class="{ 'is-error': touched.apellido && errors.apellido }"
              placeholder="Ej: Bravo"
              autocomplete="family-name"
            />
            <small v-if="touched.apellido && errors.apellido" class="msg error">{{ errors.apellido }}</small>
          </div>

          <!-- Email -->
          <div class="field">
            <label>Email</label>
            <input
              v-model.trim="form.email"
              @blur="touched.email = true"
              type="email"
              class="input"
              :class="{ 'is-error': touched.email && errors.email }"
              placeholder="tu@correo.com"
              autocomplete="email"
            />
            <small v-if="touched.email && errors.email" class="msg error">{{ errors.email }}</small>
          </div>

          <!-- Contraseña -->
          <div class="field">
            <label>Contraseña</label>
            <input
              v-model="form.password"
              @blur="touched.password = true"
              type="password"
              class="input"
              :class="{ 'is-error': touched.password && errors.password }"
              placeholder="Mínimo 6 caracteres"
              autocomplete="new-password"
            />
            <small v-if="touched.password && errors.password" class="msg error">{{ errors.password }}</small>
          </div>

          <!-- Confirmar -->
          <div class="field">
            <label>Confirmar contraseña</label>
            <input
              v-model="form.confirm"
              @blur="touched.confirm = true"
              type="password"
              class="input"
              :class="{ 'is-error': touched.confirm && errors.confirm }"
              placeholder="Repite tu contraseña"
              autocomplete="new-password"
            />
            <small v-if="touched.confirm && errors.confirm" class="msg error">{{ errors.confirm }}</small>
          </div>

          <button type="submit" class="btn" :disabled="submitting">
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
import { reactive, ref, watch } from 'vue'
import PublicLayout from '../../layouts/PublicLayout.vue'
import { registerPatient } from '../../services/auth.service'

const DEMO = import.meta.env.VITE_DEMO === '1'

type Form = { nombre: string; apellido: string; email: string; password: string; confirm: string }

const form = reactive<Form>({ nombre: '', apellido: '', email: '', password: '', confirm: '' })

const touched = reactive<Record<keyof Form, boolean>>({
  nombre: false, apellido: false, email: false, password: false, confirm: false
})

const errors = reactive<Record<keyof Form, string>>({
  nombre: '', apellido: '', email: '', password: '', confirm: ''
})

const submitting = ref(false)
const serverError = ref('')
const okMsg = ref('')

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
function validate () {
  errors.nombre = form.nombre.length < 2 ? 'Ingresa tu nombre (mín. 2).' : ''
  errors.apellido = form.apellido.length < 2 ? 'Ingresa tu apellido (mín. 2).' : ''
  errors.email = emailRe.test(form.email) ? '' : 'Correo electrónico inválido.'
  errors.password = form.password.length < 6 ? 'La contraseña debe tener al menos 6 caracteres.' : ''
  errors.confirm = form.confirm !== form.password ? 'Las contraseñas no coinciden.' : ''
}
watch(form, validate, { deep: true, immediate: true })

async function onSubmit () {
  Object.keys(touched).forEach(k => (touched[k as keyof Form] = true))
  validate()
  if (Object.values(errors).some(e => e)) return

  serverError.value = ''
  okMsg.value = ''
  submitting.value = true

  try {
    await registerPatient({
      nombre: form.nombre,
      apellido: form.apellido,
      email: form.email,
      password: form.password
    })
    okMsg.value = 'Cuenta creada con éxito.'
  } catch (e: any) {
    serverError.value = e?.message || 'No se pudo crear la cuenta.'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
/* Paleta CliniTrack: azul/verde suave */
.page {
  --primary: #0ea5e9;   /* azul cielo */
  --secondary: #10b981; /* verde esmeralda */
  --text: #0f172a;
  --muted: #64748b;
  background: linear-gradient(180deg, #f0f9ff 0%, #ecfeff 100%);
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 2rem 1rem;
}

.card {
  width: 100%;
  max-width: 420px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 1.25rem;
  box-shadow: 0 12px 30px rgba(2, 6, 23, 0.06);
}

.title {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 .75rem 0;
}

.demo {
  font-size: .9rem;
  color: var(--muted);
  margin: -0.25rem 0 .75rem 0;
}

.form { margin-top: .25rem; }

.field { margin-bottom: .9rem; }

label {
  display: block;
  font-size: .9rem;
  color: var(--text);
  margin-bottom: .35rem;
}

.input {
  width: 100%;
  padding: .65rem .8rem;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  outline: none;
  transition: border-color .15s, box-shadow .15s, background .15s;
  background: #fff;
}
.input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(14,165,233,.18);
}
.input.is-error {
  border-color: #ef4444;
  box-shadow: 0 0 0 3px rgba(239,68,68,.12);
}

.msg {
  display: block;
  margin-top: .35rem;
  font-size: .85rem;
}
.msg.error { color: #b91c1c; }

.btn {
  width: 100%;
  padding: .7rem .9rem;
  border: none;
  border-radius: 12px;
  font-weight: 700;
  color: #fff;
  cursor: pointer;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  box-shadow: 0 8px 20px rgba(16,185,129,.25);
  transition: transform .05s ease, box-shadow .2s ease, opacity .2s ease;
}
.btn:hover { transform: translateY(-1px); }
.btn:active { transform: translateY(0); }
.btn:disabled { opacity: .6; cursor: default; }

.alert {
  text-align: center;
  padding: .6rem .8rem;
  border-radius: 10px;
  margin-top: .8rem;
  font-weight: 600;
}
.alert.error {
  color: #7f1d1d;
  background: #fee2e2;
  border: 1px solid #fecaca;
}
.alert.success {
  color: #064e3b;
  background: #d1fae5;
  border: 1px solid #a7f3d0;
}

.foot {
  margin-top: .9rem;
  font-size: .95rem;
  color: var(--muted);
  text-align: center;
}
.foot a { color: var(--primary); font-weight: 700; }
</style>
