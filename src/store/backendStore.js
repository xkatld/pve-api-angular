import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useBackendStore = defineStore('backend', () => {
  const backendList = ref(JSON.parse(localStorage.getItem('pveLxcWebBackends') || '[]'))
  const activeBackendId = ref(localStorage.getItem('pveLxcWebActiveBackendId') || null)

  const activeBackend = computed(() => {
    return backendList.value.find(b => b.id === activeBackendId.value) || null
  })

  function addBackend(backend) {
    const newBackend = { ...backend, id: Date.now().toString() }
    backendList.value.push(newBackend)
    saveToLocalStorage()
    if (!activeBackendId.value && backendList.value.length > 0) {
      setActiveBackend(newBackend.id)
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
    removeBackend,
    setActiveBackend
  }
})
