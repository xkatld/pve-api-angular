import apiClient from './index'

export const getContainersApi = (node = null) => {
  return apiClient.get('/containers', { params: { node } })
}

export const createContainerApi = (data) => {
  return apiClient.post('/containers', data)
}

export const getContainerStatusApi = (node, vmid) => {
  return apiClient.get(`/containers/${node}/${vmid}/status`)
}

export const startContainerApi = (node, vmid) => {
  return apiClient.post(`/containers/${node}/${vmid}/start`)
}

export const stopContainerApi = (node, vmid) => {
  return apiClient.post(`/containers/${node}/${vmid}/stop`)
}

export const shutdownContainerApi = (node, vmid) => {
  return apiClient.post(`/containers/${node}/${vmid}/shutdown`)
}

export const rebootContainerApi = (node, vmid) => {
  return apiClient.post(`/containers/${node}/${vmid}/reboot`)
}

export const deleteContainerApi = (node, vmid) => {
  return apiClient.delete(`/containers/${node}/${vmid}`)
}

export const rebuildContainerApi = (node, vmid, data) => {
  return apiClient.post(`/containers/${node}/${vmid}/rebuild`, data)
}

export const getTaskStatusApi = (node, taskId) => {
  return apiClient.get(`/tasks/${node}/${taskId}`)
}

export const getConsoleApi = (node, vmid) => {
    return apiClient.post(`/containers/${node}/${vmid}/console`);
}
