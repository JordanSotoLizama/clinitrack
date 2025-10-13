import { createApp } from 'vue'
import { createPinia } from 'pinia'
import '@/services/firebase'

import App from './App.vue'
import router from './router'

import './services/devCreateDoctor';
import './services/devGenerateSlots';

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
