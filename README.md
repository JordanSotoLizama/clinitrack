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
1) Variables de entorno (app staff)

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

# app staff
cd apps/staff
npm i
```

3) Ejecutar en desarrollo (staff)

```
cd clinitrack/apps/staff
npm run dev
# http://localhost:5173
```

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

## 🔐 Reglas / Roles (resumen actual)

- Autenticación: Email/Password.

- Firestore (mínimo aplicado):

    - Colección users/{uid}: cada usuario puede leer/escribir solo su propio perfil.

    - El borrado desde cliente está bloqueado; lo hace admin vía Functions.

- Roles (campo role en /users/{uid}): admin, medico, recepcion, laboratorio.

- Solo admin puede invocar createStaffUser y deleteStaffUser.

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

