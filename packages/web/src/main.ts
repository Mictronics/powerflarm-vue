import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import PrimeVue from 'primevue/config';
import Lara from '@primeuix/themes/lara';

import Button from 'primevue/button';
import Card from 'primevue/card';

const app = createApp(App)

app.use(createPinia())
app.use(PrimeVue, {
    theme: {
        preset: Lara,
        options: {
            darkModeSelector: '.dark',
            cssLayer: {
                name: 'primevue',
                order: 'theme, base, primevue, utilities'
            }
        }
    }
});

[
    Button,
    Card,
].forEach(component => {
    app.component(component.name, component);
});

app.mount('#app')
