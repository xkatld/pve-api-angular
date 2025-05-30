import { createRouter, createWebHistory } from 'vue-router'
import ManageBackendsView from '@/views/ManageBackendsView.vue'
import ContainerListView from '@/views/ContainerListView.vue'
import CreateContainerView from '@/views/CreateContainerView.vue'
import ConsoleView from '@/views/ConsoleView.vue'

const routes = [
  {
    path: '/',
    redirect: '/manage-backends'
  },
  {
    path: '/manage-backends',
    name: 'ManageBackends',
    component: ManageBackendsView
  },
  {
    path: '/containers',
    name: 'ContainerList',
    component: ContainerListView
  },
  {
    path: '/create-container',
    name: 'CreateContainer',
    component: CreateContainerView
  },
  {
    path: '/console/:node/:vmid',
    name: 'ConsoleView',
    component: ConsoleView,
    props: true
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
