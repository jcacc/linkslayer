import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import GameView from './views/GameView.vue';

const routes = [
  { path: '/', component: GameView },
];

const app = createApp(App);

app.use(createPinia());
app.mount('#app');
