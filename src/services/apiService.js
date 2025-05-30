import axios from 'axios'
import { useBackendStore } from '@/store/backendStore'
import { ElMessage } from 'element-plus'

const apiService = axios.create()

apiService.interceptors.request.use(
  config => {
    const backendStore = useBackendStore()
    const activeBackend = backendStore.activeBackend
    if (activeBackend) {
      config.baseURL = activeBackend.url.replace(/\/$/, "")
      config.headers['Authorization'] = `Bearer ${activeBackend.apiKey}`
    } else {
      ElMessage.error('没有活动的后端服务器配置。请先配置后端服务器。')
      return Promise.reject(new Error('没有活动的后端服务器配置'))
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

apiService.interceptors.response.use(
  response => response,
  error => {
    let message = '请求失败'
    if (error.response) {
      message = error.response.data?.detail || error.response.data?.message || `错误 ${error.response.status}`
    } else if (error.request) {
      message = '无法连接到服务器，请检查后端服务是否运行或网络连接。'
    } else {
      message = error.message
    }
    ElMessage.error(message)
    return Promise.reject(error)
  }
)

export default {
  getNodes() {
    return apiService.get('/api/v1/nodes')
  },
  getContainers(node) {
    const params = node ? { node } : {}
    return apiService.get('/api/v1/containers', { params })
  },
  getContainerStatus(node, vmid) {
    return apiService.get(`/api/v1/containers/${node}/${vmid}/status`)
  },
  startContainer(node, vmid) {
    return apiService.post(`/api/v1/containers/${node}/${vmid}/start`)
  },
  stopContainer(node, vmid) {
    return apiService.post(`/api/v1/containers/${node}/${vmid}/stop`)
  },
  shutdownContainer(node, vmid) {
    return apiService.post(`/api/v1/containers/${node}/${vmid}/shutdown`)
  },
  rebootContainer(node, vmid) {
    return apiService.post(`/api/v1/containers/${node}/${vmid}/reboot`)
  },
  deleteContainer(node, vmid) {
    return apiService.delete(`/api/v1/containers/${node}/${vmid}`)
  },
  createContainer(containerData) {
    return apiService.post('/api/v1/containers', containerData)
  },
  getTaskStatus(node, taskId) {
    return apiService.get(`/api/v1/tasks/${node}/${taskId}`)
  }
}
