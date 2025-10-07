# CliniTrack Monorepo

Este repositorio contiene las aplicaciones del sistema CliniTrack, orientado a la gestión clínica con distintos perfiles de usuario.

## 📂 Estructura actual
```
clinitrack/
├── apps/
│   ├── pacientes/      # portal público para pacientes
│   └── staff/          # portal privado para funcionarios
├── functions/          # Cloud Functions (backend compartido)
├── packages/
│   └── shared/         # código compartido (dominio, adapters, tipos)
├── firebase.json       # config Firebase (functions)
├── .firebaserc         # proyecto Firebase por defecto
├── README.md
└── .gitignore
```

## ⚙️ Configuración rápida

### 1. Variables de entorno

#### a. **Pacientes** (`apps/pacientes/.env.local`)

Crea el archivo a partir de `apps/pacientes/.env.example`:

```env
# Firebase
VITE_FB_API_KEY=__REPLACE_ME__
VITE_FB_AUTH_DOMAIN=__REPLACE_ME__.firebaseapp.com
VITE_FB_PROJECT_ID=__REPLACE_ME__
VITE_FB_APP_ID=__REPLACE_ME__
VITE_FB_MEASUREMENT_ID=G-________

# Flag interno de demo (0/1)
VITE_DEMO=0

# Pagos (PayPal)
# Para desarrollo puedes dejar "sb" (Sandbox) o usar tu Client ID Sandbox real.
VITE_PAYPAL_CLIENT_ID=sb

# Moneda para el SDK de PayPal (USD por defecto en sandbox).
# Si tu merchant sandbox soporta CLP, puedes cambiar a CLP.
VITE_PAYPAL_CURRENCY=USD
```
Nota: No commitear .env.local (está ignorado).

PayPal Sandbox (opcional pero recomendado para demo):

- Ir a https://developer.paypal.com
 → My Apps & Credentials (Sandbox) → Create App → copiar Client ID y ponerlo en VITE_PAYPAL_CLIENT_ID.

- En Sandbox → Accounts crear una cuenta Personal/Buyer, asignar contraseña.
Ese email @personal.example.com y su clave se usan para Log in en el popup de PayPal.


### b. **Staff** (`apps/staff/.env.local`)

Crear apps/staff/.env.local a partir de apps/staff/.env.example:
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=clinitrack-cad80.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=clinitrack-cad80
VITE_FIREBASE_STORAGE_BUCKET=clinitrack-cad80.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

VITE_FUNCTIONS_REGION=southamerica-east1
```

No subir .env.local al repo (está ignorado en .gitignore).

2) Instalar dependencias

```
# raíz
cd clinitrack

# app pacientes
cd apps/pacientes
npm i

# app staff
cd ../staff
npm i
```

3) Ejecutar en desarrollo (staff)

```
# Pacientes
cd clinitrack/apps/pacientes
npm run dev
# http://localhost:5173

# Staff
cd clinitrack/apps/staff
npm run dev
# http://localhost:5173
```

## Reglas de Firestore (resumen)

- users/{uid} y patients/{uid}: cada usuario puede leer/crear/actualizar su doc. Borrado deshabilitado desde cliente.

- rutIndex/{rut}: unicidad de RUT; sólo el dueño crea/elimina su entrada.

- doctor_slots/{slotId}:

  - get/list para autenticados.

  - available → requested (lo realiza el paciente) y requested → available (cancelación del propio paciente).

  - No crean ni borran desde cliente.

- appointments/{appointmentId}:

  - crear requested, cancelar (historial).

  - get propio o get por ID propio (útil para transacciones).

  - list por uid.

- payments/{paymentId}: registros de demo PayPal (approved/failed) visibles sólo por el dueño.

- mail/: outbox para futuras notificaciones (sólo create).

Las reglas completas están en la consola del proyecto; este README resume lo aplicado.

## 🧪 Datos de prueba (pacientes)

En Firestore → doctor_slots crear documentos con ID ${doctorId}_${startIso} y los campos:

- doctorId: string (ej. el UID de “Dra. Ríos”)

- doctorName: "Dra. Ríos"

- specialty: "General"

- startIso: "2025-10-07T16:00:00.000Z" (UTC)

- endIso: "2025-10-07T16:15:00.000Z" (UTC)

- status: "available"

- patientUid: null

La vista de pacientes muestra 7 días; asegúrate de que startIso caiga dentro de esa semana (UTC).

## 👤 Área Paciente — MVP actual

- Auth E/P + verificación de correo (banner con reenviar y cooldown).

- Rutas protegidas: /app/citas, /app/resultados, /app/perfil requieren email verificado.

- Recuperar contraseña: flujo de reset por correo.

- Citas:

  - Calendario de 7 días, filtro por especialidad, lista de horarios por médico.

  - Crear cita (status = requested) y cancelar (queda cancelled para historial).

  - Anti re-agendamiento del mismo slot cancelado (ingenuo).

  - Realtime tanto de disponibilidad como de “mis citas”.

- Pagos demo (PayPal Sandbox):

  - Botón Pagar en citas requested → popup de PayPal (Sandbox).

  - Al aprobar/cancelar se registra en payments (approved/failed) con orderId, amount, uid, appointmentId.

  - La UI oculta el botón Pagar si existe un payment.approved para esa cita y muestra badge “paid”.

El estado de la cita no cambia automáticamente a confirmed para mantener el MVP simple; la evolución natural es un Cloud Function que marque la cita como confirmada al detectar payments.approved.

## ☁️ Cloud Functions (Admin)
Qué hay implementado

- createStaffUser (https callable): crea usuario en Auth y su perfil en Firestore /users/{uid} (con role y status).

- deleteStaffUser (https callable): elimina usuario de Auth y borra su perfil de /users/{uid}.

Región: southamerica-east1
Runtime: Node 18 (Gen1)

Despliegue (requiere plan Blaze)

```
cd clinitrack
firebase deploy --only functions
```

El firebase.json ya compila con tsc antes del deploy.
Si cambiaste región, sincroniza también en el cliente (getFunctions(app, '...')).


## 👩‍💻 Panel Admin (app staff)

- Ruta: Admin → “+ Crear usuario” (modal).

- Campos: correo, contraseña, rol.

- Acciones:

    - Crear: invoca createStaffUser, cierra modal y refresca la lista.

    - Eliminar: invoca deleteStaffUser y refresca la lista.

Para usar el panel, inicia sesión con una cuenta cuyo documento en /users/{uid} tenga role: "admin".

## 📝 Convenciones de commits

Para mantener claridad y consistencia, se usarán prefijos en los mensajes de commit:

- `chore:` tareas generales (estructura, configuración, limpieza)
- `feat:` nuevas funcionalidades
- `fix:` correcciones de errores
- `docs:` cambios en documentación
- `style:` cambios de formato/estilo (no funcionales)
- `refactor:` reestructuración de código sin cambiar funcionalidad
- `test:` adición o corrección de pruebas

> Ejemplo: `feat: agregar login de pacientes con Firebase`


## Tecnologías
- Vue 3 + Vite
- Firebase (Auth, Firestore, Functions)
- TypeScript

## 📖 Bitácora de avances

- **24-09-2025**: Creación de la estructura base del proyecto (apps/pacientes, apps/staff y packages/shared).
- **24-09-2025**: Se crea el esqueleto navegable de la aplicación *Pacientes* (layouts públicos y privados, vistas base y router).
- **26-09-2025**: Autenticación E/P, listener global de sesión y redirecciones básicas en staff.
- **26-09-2025**: Firestore inicial + reglas mínimas de seguridad.
- **27-09-2025**: Panel Admin en staff:
    - UI + listado desde Firestore.
    - Cloud Functions (Blaze): createStaffUser y deleteStaffUser.
    -Modal de creación funcional y refresco de lista.
- **03-10-2025**: Pacientes: verificación de email (banner + guards) y recuperar contraseña.
- **04-10-2025**: Pacientes: MVP agendamiento (listar/crear/cancelar, filtro por especialidad, anti re-agendar, realtime).
- **06-10-2025**: Pacientes: integración PayPal Sandbox (USD), registro en payments, ocultar CTA al tener approved.
 