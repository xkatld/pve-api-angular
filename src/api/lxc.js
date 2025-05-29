import apiClient from './index'

export const getNodesApi = () => {
  return apiClient.get('/nodes')
}

export const getNodeTemplatesApi = (node) => {
  return apiClient.get(`/nodes/${node}/templates`)
}

export const getNodeStoragesApi = (node) => {
  return apiClient.get(`/nodes/${node}/storages`)
}

export const getNodeNetworksApi = (node) => {
  return apiClient.get(`/nodes/${node}/networks`)
}

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
