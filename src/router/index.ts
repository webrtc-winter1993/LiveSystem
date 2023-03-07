import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
const routes: Array<RouteRecordRaw> = [
      {
        path: '/',
        name: 'index',
        meta: {
            title: 'one2one',
            keepAlive: true,
            requireAuth: false
        },
        component: () => import('@/pages/one2one/index.vue')
      },
    ]
    const router = createRouter({
        history: createWebHistory(),
        routes
    });
export default router;