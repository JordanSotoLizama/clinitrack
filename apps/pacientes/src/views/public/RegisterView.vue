<!-- apps/pacientes/src/views/paciente/RegisterView.vue -->
<template>
  <PublicLayout>
    <section class="page">
      <div class="card">
        <h1 class="title">Registro</h1>
        <p v-if="DEMO" class="demo">Modo demo: se simula la creación de la cuenta.</p>

        <form @submit.prevent="onSubmit" novalidate class="form">
          <div class="row">
            <div class="field half">
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
            <div class="field half">
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
          </div>

          <div class="row">
            <div class="field half">
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
            <div class="field half">
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
          </div>

          <div class="row">
            <div class="field half">
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
            <div class="field half"></div>
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
  max-width: 700px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 20px;
  padding: 2rem 2.5rem;
  box-shadow: 0 12px 30px rgba(2, 6, 23, 0.06);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.title {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 1.2rem 0;
}

.demo {
  font-size: 1rem;
  color: var(--muted);
  margin: -0.25rem 0 1rem 0;
}

.form {
  margin-top: .25rem;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.row {
  display: flex;
  gap: 1.2rem;
  width: 100%;
}

.half {
  flex: 1 1 0;
  min-width: 0;
}

.field {
  margin-bottom: 0;
  display: flex;
  flex-direction: column;
}

label {
  display: block;
  font-size: 1rem;
  color: var(--text);
  margin-bottom: .35rem;
  font-weight: 500;
}

.input {
  width: 100%;
  padding: .85rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  outline: none;
  transition: border-color .15s, box-shadow .15s, background .15s;
  background: #fff;
  font-size: 1.08rem;
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
  font-size: .95rem;
}
.msg.error { color: #b91c1c; }

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

.alert {
  text-align: center;
  padding: .7rem 1rem;
  border-radius: 10px;
  margin-top: 1rem;
  font-weight: 600;
  font-size: 1rem;
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
  margin-top: 1.2rem;
  font-size: 1.05rem;
  color: var(--muted);
  text-align: center;
}
.foot a { color: var(--primary); font-weight: 700; }
</style>
