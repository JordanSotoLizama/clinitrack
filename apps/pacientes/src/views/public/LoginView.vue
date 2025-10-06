<template>
  <PublicLayout>
    <div class="login-bg"></div>
    <section>
      <h2>Ingresar</h2>
      <form>
        <input placeholder="Email" />
        <input type="password" placeholder="Contraseña" />
        <button type="button">Entrar</button>
      </form>
      <p>¿No tienes cuenta? <router-link to="/registro">Regístrate</router-link></p>
    </section>
  </PublicLayout>
</template>

<script setup lang="ts">
import PublicLayout from '../../layouts/PublicLayout.vue'
</script>

<style>
html, body {
  height: 100%;
  margin: 0;
}

#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

main {
  flex: 1;
}

footer {
  margin-top: auto;
  text-align: center;
  padding: 1rem;
  background: #f4f4f4;
  color: #333;
  font-size: 0.9rem;
}

body {
  min-height: 100vh;
  margin: 0;
  font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
  background: #e3f0ff;
  overflow-x: hidden;
  position: relative;
}

.login-bg {
  position: fixed;
  top: 0; left: 0;
  width: 100vw; height: 100vh;
  z-index: -1;
  background: url('/clinitrack-logo.png') no-repeat center center;
  background-size: 2000px auto;
  opacity: 0.10;
  pointer-events: none;
}

section {
  max-width: 350px;
  margin: 60px auto;
  padding: 2.5rem 2rem 2rem 2rem;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 24px 0 rgba(0,0,0,0.07);
  display: flex;
  flex-direction: column;
  align-items: center;
}

h2 {
  font-size: 2rem;
  font-weight: 600;
  color: #1976d2;
  margin-bottom: 2rem;
  letter-spacing: 0.5px;
}

form {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

input {
  padding: 0.8rem 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  outline: none;
  transition: border 0.2s;
  background: #fafbfc;
}

input:focus {
  border-color: #1976d2;
  background: #fff;
}

button {
  padding: 0.9rem 0;
  background: #1976d2;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
  margin-top: 0.5rem;
}

button:hover {
  background: #1565c0;
}

p {
  margin-top: 1.5rem;
  font-size: 0.98rem;
  color: #444;
}

a {
  color: #1976d2;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s;
}

a:hover {
  color: #0d47a1;
  text-decoration: underline;
}
</style>