<template> 
  <header class="header">
    <div class="header-container">
      <div class="logo-container">
        <img src="/clinitrack-logo.png" alt="CliniTrack Logo" class="logo-img" />
        <h1 class="logo-text">CliniTrack</h1>
      </div>
      <nav class="nav">
        <a href="/" class="nav-link">Inicio</a>
        <a href="/login" class="nav-link">Ingresar</a>
        <a href="/registro" class="nav-link">Registrarme</a>
      </nav>
    </div>
  </header>
</template>

<script setup lang="ts"></script>

<style>
/* Header general */
.header {
  background-color: #2c3e50; /* azul grisáceo, profesional */
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  position: sticky;
  top: 0;
  z-index: 50;
  width: 100%;
  height: 60px; /* compacto */
}

/* Contenedor interno */
.header-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
}

/* Contenedor del logo */
.logo-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Imagen del logo */
.logo-img {
  height: 72px;
  width: auto;
  border-radius: 6px; /* opcional, da un toque suave */
}

/* Texto del logo */
.logo-text {
  color: #ecf0f1;
  font-size: 1.25rem;
  font-weight: bold;
  letter-spacing: 0.5px;
}

/* Navegación */
.nav {
  display: flex;
  gap: 1rem;
}

/* Links */
.nav-link {
  color: #ecf0f1;
  font-weight: 500;
  text-decoration: none;
  font-size: 0.95rem;
  transition: color 0.3s ease;
}

.nav-link:hover {
  color: #3498db; /* azul claro al pasar el mouse */
}
</style>
