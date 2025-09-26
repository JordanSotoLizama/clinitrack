<template>
  <PublicLayout>
    <div class="animated-bg">
      <!-- Burbujas grandes y pequeñas -->
      <div class="bubble"></div>
      <div class="bubble"></div>
      <div class="bubble"></div>
      <div class="bubble"></div>
      <div class="bubble"></div>
      <div class="bubble small"></div>
      <div class="bubble small"></div>
      <div class="bubble small"></div>
      <div class="bubble tiny"></div>
      <div class="bubble tiny"></div>
      <!-- Fondo animado con gradiente en movimiento -->
      <div class="moving-gradient"></div>
    </div>
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
body {
  min-height: 100vh;
  margin: 0;
  font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
  background: #e3f0ff;
  overflow-x: hidden;
  position: relative;
}

/* Fondo animado con gradiente en movimiento */
.moving-gradient {
  position: fixed;
  top: 0; left: 0;
  width: 100vw; height: 100vh;
  z-index: -2;
  pointer-events: none;
  background: linear-gradient(120deg, #e3f0ff 0%, #90caf9 50%, #f8fbff 100%);
  background-size: 200% 200%;
  animation: gradientMove 12s ease-in-out infinite;
  opacity: 0.7;
}

@keyframes gradientMove {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

/* Fondo animado con burbujas */
.animated-bg {
  position: fixed;
  top: 0; left: 0;
  width: 100vw; height: 100vh;
  z-index: -1;
  overflow: hidden;
}

.bubble {
  position: absolute;
  border-radius: 50%;
  opacity: 0.28;
  background: linear-gradient(135deg, #1976d2 60%, #90caf9 100%);
  animation: float 12s infinite ease-in-out;
}
.bubble.small {
  width: 50px; height: 50px;
  left: 15vw; bottom: -30px;
  animation-delay: 3s;
  opacity: 0.18;
  background: linear-gradient(135deg, #42a5f5 60%, #bbdefb 100%);
}
.bubble.small:nth-child(7) {
  left: 60vw; bottom: -20px;
  animation-delay: 5s;
}
.bubble.small:nth-child(8) {
  left: 85vw; bottom: -10px;
  animation-delay: 7s;
}
.bubble.tiny {
  width: 25px; height: 25px;
  left: 35vw; bottom: -10px;
  animation-delay: 2s;
  opacity: 0.12;
  background: linear-gradient(135deg, #1976d2 60%, #e3f0ff 100%);
}
.bubble.tiny:nth-child(10) {
  left: 75vw; bottom: -5px;
  animation-delay: 6s;
}

/* Burbujas grandes originales */
.bubble:nth-child(1) {
  width: 180px; height: 180px;
  left: 10vw; bottom: -100px;
  animation-delay: 0s;
}
.bubble:nth-child(2) {
  width: 120px; height: 120px;
  left: 70vw; bottom: -80px;
  animation-delay: 2s;
}
.bubble:nth-child(3) {
  width: 90px; height: 90px;
  left: 40vw; bottom: -60px;
  animation-delay: 4s;
}
.bubble:nth-child(4) {
  width: 60px; height: 60px;
  left: 80vw; bottom: -40px;
  animation-delay: 6s;
}
.bubble:nth-child(5) {
  width: 140px; height: 140px;
  left: 25vw; bottom: -90px;
  animation-delay: 8s;
}

@keyframes float {
  0% {
    transform: translateY(0) scale(1);
    opacity: 0.35;
  }
  60% {
    opacity: 0.5;
  }
  100% {
    transform: translateY(-90vh) scale(1.15);
    opacity: 0;
  }
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