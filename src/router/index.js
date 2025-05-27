import { createRouter, createWebHistory } from 'vue-router'
import DefaultLayout from '../layouts/DefaultLayout.vue'
import ContainerList from '../views/ContainerList.vue'
import CreateContainer from '../views/CreateContainer.vue'
import Login from '../views/Login.vue'
import { useAuthStore } from '../stores/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: Login,
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
  if (to.meta.requiresAuth && !authStore.apiKey) {
    next({ name: 'Login' })
  } else {
    next()
  }
})

export default router
