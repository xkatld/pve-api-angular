import { createRouter, createWebHistory } from 'vue-router'
import ManageBackendsView from '@/views/ManageBackendsView.vue'
import ContainerListView from '@/views/ContainerListView.vue'
import CreateContainerView from '@/views/CreateContainerView.vue'
import ConsoleView from '@/views/ConsoleView.vue'

const routes = [
  {
    path: '/',
    redirect: '/manage-backends',
    meta: { keepAlive: false }
  },
  {
    path: '/manage-backends',
    name: 'ManageBackends',
    component: ManageBackendsView,
    meta: { keepAlive: true }
  },
  {
    path: '/containers',
    name: 'ContainerList',
    component: ContainerListView,
    meta: { keepAlive: true }
  },
  {
    path: '/create-container',
    name: 'CreateContainer',
    component: CreateContainerView,
    meta: { keepAlive: false }
  },
  {
    path: '/console/:node/:vmid',
    name: 'ConsoleView',
    component: ConsoleView,
    props: true,
    meta: { keepAlive: false }
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
