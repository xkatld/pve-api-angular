// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import ManageBackendsView from '@/views/ManageBackendsView.vue'
import ContainerListView from '@/views/ContainerListView.vue'
import CreateContainerView from '@/views/CreateContainerView.vue' // 新增导入

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
  { // 新增路由
    path: '/create-container',
    name: 'CreateContainer',
    component: CreateContainerView
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
