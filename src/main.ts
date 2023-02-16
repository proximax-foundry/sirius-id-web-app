import { createApp } from 'vue'
import App from './App.vue'
import PrimeVue from 'primevue/config';
import router from './router'
import 'primevue/resources/themes/saga-blue/theme.css'
import 'primevue/resources/primevue.min.css'
import 'primeicons/primeicons.css'
import './assets/main.css'
import mitt from 'mitt';

const emitter = mitt();
const app = createApp(App)
app.config.globalProperties.emitter = emitter;
app.use(router)
app.use(PrimeVue)
app.mount('#app')
