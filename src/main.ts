import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import store from './store'
import router from '@/router';
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import VConsole from 'vconsole';

const vConsole = new VConsole();
// or init with options
createApp(App).use(store).use(router).use(ElementPlus).mount('#app')
