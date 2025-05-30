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
      router.push('/config')
      return Promise.reject(new Error('未选择后端或未配置后端地址'))
    }

    if (authStore.apiKey) {
      config.headers.Authorization = `Bearer ${authStore.apiKey}`
    } else {
      router.push('/config')
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
    const responseData = response.data

    if (responseData && typeof responseData.success === 'boolean' && responseData.hasOwnProperty('message')) {
      if (responseData.success === true) {
        if (responseData.message) {
          ElMessage.success(responseData.message)
        }
        return responseData.data
      } else {
        const errorMessage = responseData.message || '操作失败'
        ElMessage.error(errorMessage)
        return Promise.reject(new Error(errorMessage))
      }
    } else if (response.config && (response.config.method === 'get' || response.config.method === 'GET')) {
      return responseData
    } else {
      ElMessage.warning('收到服务器的非GET请求响应格式不符合预期标准结构')
      return responseData.data !== undefined ? responseData.data : responseData
    }
  },
  (error) => {
    let message = '网络请求失败或发生未知错误'
    if (error.response && error.response.data) {
      message = error.response.data.message || error.response.data.detail || error.message || '服务器错误'
    } else if (error.message) {
      message = error.message
    }

    ElMessage.error(message)

    if (error.response && error.response.status === 401) {
      const authStore = useAuthStore()
      authStore.clearAuth()
      router.push('/config')
    }
    return Promise.reject(error)
  }
)

export default apiClient
