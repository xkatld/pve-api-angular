import axios from 'axios'
import { useAuthStore } from '../stores/auth'
import { ElMessage } from 'element-plus'

const apiClient = axios.create({
  baseURL: 'https://<你的Debian服务器IP>:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore()
    if (authStore.apiKey) {
      config.headers.Authorization = `Bearer ${authStore.apiKey}`
    } else {
        router.push('/login');
        return Promise.reject(new Error('未提供 API 密钥'));
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
    const message = error.response?.data?.detail || error.message || '网络请求失败';
    ElMessage.error(message);
    if (error.response?.status === 401) {
        const authStore = useAuthStore()
        authStore.clearApiKey();
        router.push('/login');
    }
    return Promise.reject(error)
  }
)

export default apiClient
