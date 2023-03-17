import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
const routes: Array<RouteRecordRaw> = [
      {
        path: '/demo1',
        name: 'demo1',
        meta: {
            title: 'demo1',
            keepAlive: true,
            requireAuth: false
        },
        component: () => import('@/pages/demo1/index.vue')
      },
      {
        path: '/demo2',
        name: 'demo2',
        meta: {
            title: 'demo2',
            keepAlive: true,
            requireAuth: false
        },
        component: () => import('@/pages/demo2/index.vue')
      },
      {
        path: '/one2one',
        name: 'one2one',
        meta: {
            title: 'one2one',
            keepAlive: true,
            requireAuth: false
        },
        component: () => import('@/pages/one2one/index.vue')
      },
      {
        path: '/one2many',
        name: 'one2many',
        meta: {
            title: 'one2many',
            keepAlive: true,
            requireAuth: false
        },
        component: () => import('@/pages/one2many/index.vue')
      },
    ]
    const router = createRouter({
        history: createWebHistory(),
        routes
    });
export default router;