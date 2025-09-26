<template>
  <PublicLayout>
    <section class="landing-section">
      <img src="https://img.freepik.com/vector-gratis/ilustracion-concepto-medico_114360-2294.jpg" alt="Clínica" class="landing-hero" />
      <h2>Bienvenido/a a CliniTrack</h2>
      <p class="subtitle">Tu salud, nuestra prioridad.</p>
      <ul class="features">
        <li>
          <span class="icon">🩺</span>
          Agenda tus citas médicas fácilmente
        </li>
        <li>
          <span class="icon">📄</span>
          Consulta tus exámenes y resultados online
        </li>
        <li>
          <span class="icon">🔒</span>
          Seguridad y privacidad de tus datos
        </li>
      </ul>
      <div class="landing-actions">
        <router-link to="/login" class="main-btn">Ingresar</router-link>
        <router-link to="/registro" class="sec-btn">Registrarme</router-link>
      </div>
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
  background: linear-gradient(120deg, #e3f0ff 0%, #f8fbff 100%);
  overflow-x: hidden;
  position: relative;
}

.landing-section {
  max-width: 420px;
  margin: 80px auto;
  padding: 2.5rem 2rem 2rem 2rem;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 24px 0 rgba(0,0,0,0.07);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.landing-hero {
  width: 120px;
  height: 120px;
  object-fit: contain;
  margin-bottom: 1.2rem;
  border-radius: 50%;
  box-shadow: 0 2px 12px 0 rgba(25,118,210,0.08);
  background: #e3f0ff;
}

h2 {
  font-size: 2.2rem;
  font-weight: 600;
  color: #1976d2;
  margin-bottom: 0.5rem;
  letter-spacing: 0.5px;
  text-align: center;
}

.subtitle {
  color: #1976d2;
  font-size: 1.1rem;
  margin-bottom: 1.5rem;
  text-align: center;
}

.features {
  list-style: none;
  padding: 0;
  margin: 0 0 2rem 0;
  width: 100%;
}

.features li {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  font-size: 1.07rem;
  color: #444;
  margin-bottom: 0.7rem;
  background: #f5faff;
  padding: 0.7rem 1rem;
  border-radius: 8px;
}

.icon {
  font-size: 1.4rem;
}

.landing-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1.2rem;
  width: 100%;
  justify-content: center;
}

.main-btn, .sec-btn {
  padding: 0.8rem 1.6rem;
  border-radius: 8px;
  font-size: 1.08rem;
  font-weight: 500;
  text-decoration: none;
  transition: background 0.2s, color 0.2s;
  display: inline-block;
  text-align: center;
}

.main-btn {
  background: #1976d2;
  color: #fff;
  border: none;
}

.main-btn:hover {
  background: #1565c0;
}

.sec-btn {
  background: #e3f0ff;
  color: #1976d2;
  border: 1px solid #90caf9;
}

.sec-btn:hover {
  background: #bbdefb;
  color: #0d47a1;
}
</style>