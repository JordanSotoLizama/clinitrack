# CliniTrack Monorepo

Este repositorio contiene las aplicaciones del sistema CliniTrack, orientado a la gestión clínica con distintos perfiles de usuario.

## 📂 Estructura actual
```
clinitrack/
├── apps/
│ ├── pacientes/ → portal público para pacientes
│ └── staff/ → portal privado para funcionarios
├── packages/
│ └── shared/ → código compartido (dominio, repositorios, adaptadores)
├── README.md
└── .gitignore
```

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
- Vue 3
- Firebase
- Vite

## 📖 Bitácora de avances

- **24-09-2025**: Creación de la estructura base del proyecto (apps/pacientes, apps/staff y packages/shared).
- **24-09-2025**: Se crea el esqueleto navegable de la aplicación *Pacientes* (layouts públicos y privados, vistas base y router).