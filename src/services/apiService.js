import axios from 'axios'
import { useBackendStore } from '@/store/backendStore'
import { ElMessage } from 'element-plus'

const apiService = axios.create({
    timeout: 15000 
})

apiService.interceptors.request.use(
  config => {
    const backendStore = useBackendStore()
    const activeBackend = backendStore.activeBackend
    if (activeBackend && activeBackend.url && activeBackend.apiKey) {
      config.baseURL = activeBackend.url.replace(/\/$/, "")
      config.headers['Authorization'] = `Bearer ${activeBackend.apiKey}`
    } else {
      ElMessage.error('没有有效活动的后端服务器配置。请先配置并选择一个后端服务器。')
      return Promise.reject(new Error('没有有效活动的后端服务器配置'))
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
    let message = '请求发生错误'
    if (error.response) {
      message = error.response.data?.detail || error.response.data?.message || `错误 ${error.response.status}`
    } else if (error.request) {
      message = '无法连接到服务器，请检查后端服务是否运行、网络连接或后端URL配置是否正确。'
    } else {
      message = error.message
    }
    ElMessage.error({ message: message, duration: 5000, showClose: true })
    return Promise.reject(error)
  }
)

export default {
  getNodes() {
    return apiService.get('/api/v1/nodes')
  },
  getNodeTemplates(node) {
    return apiService.get(`/api/v1/nodes/${node}/templates`)
  },
  getNodeStorages(node) {
    return apiService.get(`/api/v1/nodes/${node}/storages`)
  },
  getNodeNetworks(node) {
    return apiService.get(`/api/v1/nodes/${node}/networks`)
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
  },
  getContainerConsoleTicket(node, vmid) {
    return apiService.post(`/api/v1/containers/${node}/${vmid}/console`)
  }
}
