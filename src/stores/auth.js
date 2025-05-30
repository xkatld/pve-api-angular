import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const backends = ref(JSON.parse(localStorage.getItem('pveBackends') || '[]'))
  const activeBackendId = ref(localStorage.getItem('pveActiveBackendId') || null)

  const activeBackend = computed(() => {
    return backends.value.find(b => b.id === activeBackendId.value) || null
  })

  const apiKey = computed(() => activeBackend.value ? activeBackend.value.apiKey : '')
  const currentBaseURL = computed(() => activeBackend.value ? activeBackend.value.baseURL : '')
  const proxmoxVncBaseURL = computed(() => activeBackend.value ? activeBackend.value.proxmoxVncBaseURL : '')

  function addBackend(backend) {
    backend.id = Date.now().toString()
    backends.value.push(backend)
    localStorage.setItem('pveBackends', JSON.stringify(backends.value))
    if (!activeBackendId.value || backends.value.length === 1) {
      setActiveBackend(backend.id)
    }
  }

  function updateBackend(id, updatedBackend) {
    const index = backends.value.findIndex(b => b.id === id)
    if (index !== -1) {
      backends.value[index] = { ...backends.value[index], ...updatedBackend }
      localStorage.setItem('pveBackends', JSON.stringify(backends.value))
    }
  }

  function deleteBackend(id) {
    backends.value = backends.value.filter(b => b.id !== id)
    localStorage.setItem('pveBackends', JSON.stringify(backends.value))
    if (activeBackendId.value === id) {
      activeBackendId.value = backends.value.length > 0 ? backends.value[0].id : null
      localStorage.setItem('pveActiveBackendId', activeBackendId.value)
    }
  }

  function setActiveBackend(id) {
    activeBackendId.value = id
    localStorage.setItem('pveActiveBackendId', id)
  }

  function clearAuth() {
    localStorage.removeItem('pveActiveBackendId');
    activeBackendId.value = null;

    if (backends.value.length > 0) {
        setActiveBackend(backends.value[0].id);
    } else {
         router.push('/config');
    }
  }

  return {
    backends,
    activeBackendId,
    activeBackend,
    apiKey,
    currentBaseURL,
    proxmoxVncBaseURL,
    addBackend,
    updateBackend,
    deleteBackend,
    setActiveBackend,
    clearAuth
  }
})
