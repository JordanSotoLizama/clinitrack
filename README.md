# CliniTrack — Monorepo

Plataforma ambulatoria para gestión de horas médicas. Incluye:
- **Portal Pacientes**: agendamiento, pagos (PayPal Sandbox), cancelación y perfil.
- **Portal Staff**: panel admin (usuarios), agenda del médico con zona horaria correcta y estado dinámico de pago/confirmación.
- **Cloud Functions**: creación/borrado de staff y médicos, generación de bloques horarios, reserva de horas, y **confirmación automática de cita al aprobar pago** + marcado de slot como `booked`.

---

## 📂 Estructura

```
clinitrack/
├── apps/
│   ├── pacientes/      # Portal de pacientes (Vite + Vue 3)
│   └── staff/          # Portal de funcionarios (admin + médico)
├── functions/          # Cloud Functions (TypeScript)
├── packages/
│   └── shared/         # Tipos/utilidades compartidas
├── firebase.json       # Config de Firebase
├── firestore.rules     # Reglas de seguridad (cliente)
├── firestore.indexes.json
└── README.md
```

---

## ✅ Requisitos

- Node 18+ y npm  
- Firebase CLI (`npm i -g firebase-tools`)  
- Proyecto de Firebase (plan **Blaze** para Functions)  
- Cuenta de **PayPal Developer** (Sandbox) para pruebas de pago

---

## ⚙️ Configuración

### 1) En Firebase

1. Crear proyecto y habilitar:
   - **Authentication** → Email/Password
   - **Firestore** (modo producción)
   - **Cloud Functions** en región `southamerica-east1`
2. Obtener credenciales web (API key, etc.) para los `.env.local`.

### 2) Variables de entorno

> No subas los `.env.local` al repo. Están ignorados en `.gitignore`.

#### a) `apps/pacientes/.env.local`

Copia desde `apps/pacientes/.env.example` y completa:

```env
# Firebase (pacientes)
VITE_FB_API_KEY=__REPLACE_ME__
VITE_FB_AUTH_DOMAIN=__REPLACE_ME__.firebaseapp.com
VITE_FB_PROJECT_ID=__REPLACE_ME__
VITE_FB_APP_ID=__REPLACE_ME__
VITE_FB_MEASUREMENT_ID=G-________

# Demo flag (0/1)
VITE_DEMO=0

# PayPal Sandbox
VITE_PAYPAL_CLIENT_ID=sb     # o tu Client ID sandbox real
VITE_PAYPAL_CURRENCY=USD     # en sandbox suele ser USD
```

> En https://developer.paypal.com crea una app **Sandbox** y copia el **Client ID**.

#### b) `apps/staff/.env.local`

Copia desde `apps/staff/.env.example` y completa:

```env
VITE_FIREBASE_API_KEY=__REPLACE_ME__
VITE_FIREBASE_AUTH_DOMAIN=__REPLACE_ME__.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=__REPLACE_ME__
VITE_FIREBASE_STORAGE_BUCKET=__REPLACE_ME__.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=__REPLACE_ME__
VITE_FIREBASE_APP_ID=__REPLACE_ME__

# Importante para Functions
VITE_FUNCTIONS_REGION=southamerica-east1
```

### 3) Instalar dependencias

```bash
# desde la raíz del repo
cd apps/pacientes && npm i
cd ../staff && npm i
cd ../../functions && npm i
```

---

## ▶️ Ejecutar en desarrollo

```bash
# Pacientes
cd apps/pacientes
npm run dev   # http://localhost:5173

# Staff
cd ../staff
npm run dev   # http://localhost:5173 (o el siguiente puerto disponible)
```

---

## ☁️ Cloud Functions (backend)

### Qué hay implementado

- **onPatientCreated / onPatientDeleted**: claims básicos.
- **createStaffUser / deleteStaffUser** (HTTPS callable).
- **createDoctor** (callable) y **generateSlots** (callable).
- **bookSlot** (callable): crea cita `requested` y guarda `patientName`.
- **onPaymentCreated** / **onPaymentStatusApproved** (Firestore triggers):
  - Al detectar `payments.status = "approved"` → **appointment.status = "confirmed"**, set de `paidBy/paymentId/paidAt`, y marca el slot como **`booked`** si coincide el paciente.
  - Idempotente y con *fallbacks* si el `appointmentId` no calza exacto.
  - Hidrata `patientName` si faltaba.

### Despliegue

```bash
# compila TS -> JS automáticamente antes del deploy
cd functions
npm run build
firebase deploy --only functions --project <tu-proyecto>
```

### Logs de verificación

- Google Cloud Console → **Logging → Explorador de registros**  
  Filtro rápido: `resource.labels.function_name="onPaymentCreated"`  
  o `resource.labels.function_name="onPaymentStatusApproved"`

---

## 🔐 Reglas e índices de Firestore

Este repo incluye **firestore.rules** y **firestore.indexes.json**.  
Para desplegarlos:

```bash
firebase deploy --only firestore:rules,firestore:indexes --project <tu-proyecto>
```

**Resumen de acceso (alto nivel):**
- `users/{uid}` y `patients/{uid}`: el usuario puede leer y mantener su doc; delete restringido.
- `doctor_slots/{slotId}`: lectura para autenticados; transiciones `open ↔ requested` controladas; creación/eliminación desde backend.
- `appointments/{appointmentId}`: creación `requested`, cancelación (historial); lectura por dueño; listados paginados.
- `payments/{paymentId}`: solo visibilidad del dueño; funciones reaccionan al `approved`.

> Revisa/ajusta en consola según tu necesidad exacta.

---

## 🧪 Flujo de prueba end-to-end

1. **Admin (staff)** crea un **médico** (callable `createDoctor`) — tz por defecto `America/Santiago`.
2. **Admin/médico** genera slots con `generateSlots` para un rango de fechas.
3. **Paciente** inicia sesión, **agenda** un horario (cita `requested`).
4. **Paciente paga** con PayPal *Sandbox* (se crea doc en `payments/` con `status: "approved"`).
5. **Functions** confirman automáticamente la cita (`confirmed`) y marcan el slot `booked`.  
   - La **agenda del médico** muestra día/hora correctos y el **estado** “pendiente de check-in”.

---

## 👩‍⚕️ Portal Staff (admin/médico)

- **Admin**
  - Crear/eliminar usuarios de staff (Cloud Functions).
  - Crear médicos y generar disponibilidad (callables).
- **Médico**
  - Agenda agrupada por día, **hora local correcta** (tz del médico).
  - Ver **nombre del paciente** y estado:
    - `pendiente de pago` → pasa a `pendiente de check-in` cuando el pago fue aprobado/confirmado.

---

## 👤 Portal Pacientes (MVP)

- Registro / login / verificación de email / reset password.
- Agenda por especialidad y médico, 7 días de vista.
- Crear cita (`requested`) y cancelar (historial).
- **Pagos PayPal Sandbox** (UI oculta el botón cuando ya está aprobado).
- Realtime de “mis citas”.

---

## 🛠️ Solución de problemas

- **El día aparece corrido (Domingo en vez de Lunes)**  
  Verifica que:
  - El médico tenga `tz: "America/Santiago"` en `/users/{uid}`.
  - Los **slots** se hayan generado con esa TZ (la función `generateSlots` ya lo maneja).
  - El portal **staff** esté actualizado (la agenda usa el `dateISO` real del slot).

- **No se actualiza la cita tras pagar**  
  Revisa en Logging los triggers `onPaymentCreated` / `onPaymentStatusApproved`.  
  Confirma que el doc `payments/{id}` tenga:
  - `status: "approved"`, `appointmentId`, `uid` (del paciente), `provider: "paypal"`.

---

## 🧾 Convenciones de commit (sugerido)

- `feat:` nueva funcionalidad  
- `fix:` bugfix  
- `chore:` tareas de soporte  
- `docs:` documentación  
- `refactor:` cambios internos sin alterar comportamiento  

Ej: `feat: confirmar cita al aprobar pago y marcar slot booked`

---

## 🧰 Tecnologías

- **Vue 3 + Vite + TypeScript**  
- **Firebase** (Auth, Firestore, Cloud Functions)  
- **PayPal** (Sandbox) para pagos de demo

---

## 🗓️ Bitácora corta

- **2025-09-24**: estructura monorepo, bases de Pacientes/Staff.  
- **2025-09-26**: auth E/P + guards; reglas Firestore iniciales; panel admin (create/delete staff).  
- **2025-10-03**: verificación de email y reset password (pacientes).  
- **2025-10-04**: MVP de agendamiento; integración PayPal (Sandbox).  
- **2025-10-12/13**:  
  - **Functions**: confirmación automática de cita al aprobar pago; marcado de slot `booked`; `patientName` en `appointments`.  
  - **Staff**: agenda de médico con **TZ correcta** y estado dinámico (pago/confirmación).  
  - Reglas/índices y ajustes menores.

---

## 📌 Notas

- Este README asume **2 apps en local**; para Hosting, define tus targets en `firebase.json` y despliega con:
  ```bash
  firebase deploy --only hosting,functions,firestore:rules,firestore:indexes --project <tu-proyecto>
  ```
- Si cambias región de Functions, sincroniza `VITE_FUNCTIONS_REGION` en el **staff**.
