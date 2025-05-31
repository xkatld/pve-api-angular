import { createRouter, createWebHistory } from 'vue-router';
import NodeManager from '@/components/NodeManager.vue';
import ContainerManager from '@/components/ContainerManager.vue';
import Settings from '@/components/Settings.vue';

const routes = [
  {
    path: '/',
    redirect: '/nodes',
  },
  {
    path: '/nodes',
    name: 'NodeManager',
    component: NodeManager,
    meta: { title: '节点管理' }
  },
  {
    path: '/containers',
    name: 'ContainerManager',
    component: ContainerManager,
    meta: { title: '容器管理' }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: Settings,
    meta: { title: '设置' }
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

router.afterEach((to) => {
  document.title = `${to.meta.title} - Proxmox LXC 管理面板` || 'Proxmox LXC 管理面板';
});

export default router;