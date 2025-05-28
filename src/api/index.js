import axios from 'axios'
import { useAuthStore } from '../stores/auth'
import { ElMessage } from 'element-plus'
import router from '../router'

const apiClient = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore()
    if (authStore.currentBaseURL) {
      config.baseURL = authStore.currentBaseURL
    } else {
      router.push('/login')
      return Promise.reject(new Error('未选择后端或未配置后端地址'))
    }

    if (authStore.apiKey) {
      config.headers.Authorization = `Bearer ${authStore.apiKey}`
    } else {
      router.push('/login')
      return Promise.reject(new Error('未提供 API 密钥'))
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

apiClient.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    const message = error.response?.data?.detail || error.message || '网络请求失败'
    ElMessage.error(message)
    if (error.response?.status === 401) {
      const authStore = useAuthStore()
      authStore.clearAuth()
      router.push('/login')
    }
    return Promise.reject(error)
  }
)

export default apiClient
