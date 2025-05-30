import { createRouter, createWebHistory } from 'vue-router'
import ManageBackendsView from '@/views/ManageBackendsView.vue'
import ContainerListView from '@/views/ContainerListView.vue'

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
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
