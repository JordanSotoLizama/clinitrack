<template>
  <PublicLayout>
    <!-- wrapper local para evitar estilos globales en <body> -->
    <div class="landing-page">
      <div class="landing-bg"></div>

      <section class="landing-section">
        <img
          src="https://img.freepik.com/vector-gratis/ilustracion-concepto-medico_114360-2294.jpg"
          alt="Clínica"
          class="landing-hero"
        />
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
    </div>
  </PublicLayout>
</template>

<script setup lang="ts">
import PublicLayout from '../../layouts/PublicLayout.vue'
</script>

<style scoped>
/* Antes estaba en body{} (global). Lo movemos a un contenedor local. */
.landing-page {
  min-height: 100vh;
  margin: 0;
  font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
  background: linear-gradient(120deg, #e3f0ff 0%, #f8fbff 100%);
  overflow-x: hidden;
  position: relative;
}

/* Fondo con logo gigante y tenue */
.landing-bg {
  position: fixed;
  inset: 0;
  z-index: -1;
  background: url('/clinitrack-logo.png') no-repeat center center;
  /* Antes: background-size: 2000 (inválido) o auto. 
     Dejamos un tamaño fijo grande; ajusta si lo quieres más/menos grande. */
  background-size: 1200px auto;
  opacity: 0.10;
  pointer-events: none;
}

.landing-section {
  max-width: 540px;
  margin: 100px auto;
  padding: 3.5rem 2.5rem 2.5rem 2.5rem;
  background: rgba(255, 255, 255, 0.233);
  border-radius: 24px;
  box-shadow: 0 6px 32px 0 rgba(25, 118, 210, 0.048);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.landing-hero {
  width: 180px;
  height: 180px;
  object-fit: contain;
  margin-bottom: 2rem;
  border-radius: 50%;
  box-shadow: 0 4px 24px 0 rgba(25,118,210,0.10);
  background: #e3f0ff;
}

h2 {
  font-size: 2.8rem;
  font-weight: 700;
  color: #1976d2;
  margin-bottom: 1rem;
  letter-spacing: 0.5px;
  text-align: center;
}

.subtitle {
  color: #1976d2;
  font-size: 1.35rem;
  margin-bottom: 2.2rem;
  text-align: center;
  font-weight: 500;
}

.features {
  list-style: none;
  padding: 0;
  margin: 0 0 2.5rem 0;
  width: 100%;
}

.features li {
  display: flex;
  align-items: center;
  gap: 1.2rem;
  font-size: 1.35rem;
  color: #444;
  margin-bottom: 1.1rem;
  background: #f5faff;
  padding: 1.1rem 1.5rem;
  border-radius: 12px;
  font-weight: 500;
}

.icon {
  font-size: 2.1rem;
}

.landing-actions {
  display: flex;
  gap: 2rem;
  margin-top: 2rem;
  width: 100%;
  justify-content: center;
}

.main-btn, .sec-btn {
  padding: 1.1rem 2.5rem;
  border-radius: 12px;
  font-size: 1.25rem;
  font-weight: 600;
  text-decoration: none;
  transition: background 0.2s, color 0.2s, box-shadow 0.2s;
  display: inline-block;
  text-align: center;
  box-shadow: 0 2px 8px 0 rgba(25,118,210,0.08);
}

.main-btn {
  background: #1976d2;
  color: #fff;
  border: none;
}

.main-btn:hover {
  background: #1565c0;
  box-shadow: 0 4px 16px 0 rgba(25,118,210,0.13);
}

.sec-btn {
  background: #e3f0ff;
  color: #1976d2;
  border: 2px solid #90caf9;
}

.sec-btn:hover {
  background: #bbdefb;
  color: #0d47a1;
  box-shadow: 0 4px 16px 0 rgba(25,118,210,0.09);
}

@media (max-width: 600px) {
  .landing-section {
    max-width: 98vw;
    padding: 1.2rem 0.5rem;
    border-radius: 12px;
  }
  .landing-hero {
    width: 110px;
    height: 110px;
    margin-bottom: 1rem;
  }
  h2 {
    font-size: 2rem;
  }
  .features li {
    font-size: 1rem;
    padding: 0.7rem 0.7rem;
    gap: 0.7rem;
  }
  .icon {
    font-size: 1.3rem;
  }
  .main-btn, .sec-btn {
    font-size: 1rem;
    padding: 0.7rem 1.2rem;
    border-radius: 8px;
  }
  .landing-actions {
    gap: 0.7rem;
  }
}
</style>