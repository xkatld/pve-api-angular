import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const apiKey = ref(localStorage.getItem('pveApiKey') || '')

  function setApiKey(key) {
    apiKey.value = key
    localStorage.setItem('pveApiKey', key)
  }

  function clearApiKey() {
    apiKey.value = ''
    localStorage.removeItem('pveApiKey')
  }

  return { apiKey, setApiKey, clearApiKey }
})
