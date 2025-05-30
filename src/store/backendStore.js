import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useBackendStore = defineStore('backend', () => {
  const backendList = ref(JSON.parse(localStorage.getItem('pveLxcWebBackends') || '[]'))
  const activeBackendId = ref(localStorage.getItem('pveLxcWebActiveBackendId') || null)

  const activeBackend = computed(() => {
    return backendList.value.find(b => b.id === activeBackendId.value) || null
  })

  function addBackend(backendData) {
    const newBackend = {
      id: Date.now().toString(),
      name: backendData.name || `后端配置 #${backendList.value.length + 1}`,
      apiUrl: backendData.apiUrl,
      apiKey: backendData.apiKey,
      pveManagerUrl: backendData.pveManagerUrl
    }
    backendList.value.push(newBackend)
    saveToLocalStorage()
    if (!activeBackendId.value && backendList.value.length > 0) {
      setActiveBackend(newBackend.id)
    }
  }

  function updateBackend(backendId, updatedData) {
    const backendIndex = backendList.value.findIndex(b => b.id === backendId)
    if (backendIndex !== -1) {
      // 保留 id 不变，更新其他字段
      backendList.value[backendIndex] = {
        ...backendList.value[backendIndex],
        name: updatedData.name !== undefined ? updatedData.name : backendList.value[backendIndex].name,
        apiUrl: updatedData.apiUrl !== undefined ? updatedData.apiUrl : backendList.value[backendIndex].apiUrl,
        apiKey: updatedData.apiKey !== undefined ? updatedData.apiKey : backendList.value[backendIndex].apiKey,
        pveManagerUrl: updatedData.pveManagerUrl !== undefined ? updatedData.pveManagerUrl : backendList.value[backendIndex].pveManagerUrl,
      }
      saveToLocalStorage()
    }
  }

  function removeBackend(backendId) {
    backendList.value = backendList.value.filter(b => b.id !== backendId)
    if (activeBackendId.value === backendId) {
      activeBackendId.value = backendList.value.length > 0 ? backendList.value[0].id : null
      localStorage.setItem('pveLxcWebActiveBackendId', activeBackendId.value || '')
    }
    saveToLocalStorage()
  }

  function setActiveBackend(backendId) {
    activeBackendId.value = backendId
    localStorage.setItem('pveLxcWebActiveBackendId', backendId || '')
  }

  function saveToLocalStorage() {
    localStorage.setItem('pveLxcWebBackends', JSON.stringify(backendList.value))
  }

  return {
    backendList,
    activeBackendId,
    activeBackend,
    addBackend,
    updateBackend,
    removeBackend,
    setActiveBackend
  }
})
