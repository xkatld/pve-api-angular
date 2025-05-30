import { createRouter, createWebHistory } from 'vue-router'
import DefaultLayout from '../layouts/DefaultLayout.vue'
import ContainerList from '../views/ContainerList.vue'
import CreateContainer from '../views/CreateContainer.vue'
import BackendConfig from '../views/BackendConfig.vue'
import { useAuthStore } from '../stores/auth'

const routes = [
  {
    path: '/config',
    name: 'BackendConfig',
    component: BackendConfig,
  },
  {
    path: '/',
    component: DefaultLayout,
    children: [
      {
        path: '',
        name: 'ContainerList',
        component: ContainerList,
        meta: { requiresAuth: true },
      },
      {
        path: 'create',
        name: 'CreateContainer',
        component: CreateContainer,
        meta: { requiresAuth: true },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  if (to.meta.requiresAuth && !authStore.activeBackendId) {
    if (authStore.backends.length > 0 && !authStore.activeBackendId) {
      authStore.setActiveBackend(authStore.backends[0].id)
      next()
    } else {
      next({ name: 'BackendConfig' })
    }
  } else {
    next()
  }
})

export default router
