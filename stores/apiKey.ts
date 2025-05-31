import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

export const useApiKeyStore = defineStore('apiKey', () => {
  const apiKey = ref<string>(localStorage.getItem('globalApiKey') || '');

  function setApiKey(newKey: string) {
    apiKey.value = newKey;
  }

  watch(apiKey, (newApiKey) => {
    if (newApiKey) {
      localStorage.setItem('globalApiKey', newApiKey);
    } else {
      localStorage.removeItem('globalApiKey');
    }
  });

  return { apiKey, setApiKey };
});