<template>
  <div class="p-6 bg-white rounded-lg shadow">
    <h2 class="text-2xl font-semibold mb-6">设置</h2>

    <div class="mb-6">
      <label for="apiKey" class="block text-sm font-medium text-gray-700 mb-1">全局 API 密钥</label>
      <input
        type="password"
        id="apiKey"
        v-model="currentApiKey"
        placeholder="输入您的 API 密钥"
        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
      />
      <button
        @click="saveApiKey"
        class="mt-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        保存密钥
      </button>
       <p v-if="apiKeyStore.apiKey" class="mt-2 text-xs text-gray-500">当前已配置 API 密钥。</p>
       <p v-else class="mt-2 text-xs text-red-500">当前未配置 API 密钥。</p>
    </div>

    <div class="mb-6">
        <h3 class="text-lg font-medium text-gray-900 mb-2">后端 API 服务信息</h3>
        <p class="text-sm text-gray-600 mb-1">
            当前配置的后端 API 地址: <code class="bg-gray-200 px-1 rounded">{{ backendUrl }}</code>
        </p>
        <p class="text-xs text-gray-500">
            此地址通常在 <code class="bg-gray-200 px-1 rounded">.env</code> 文件中通过 <code class="bg-gray-200 px-1 rounded">VITE_API_BASE_URL</code> 设置，或默认为 <code class="bg-gray-200 px-1 rounded">http://localhost:8000/api/v1</code>。
        </p>
         <button
            @click="checkApiStatus"
            :disabled="apiStatusLoading"
            class="mt-3 inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg v-if="apiStatusLoading" class="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ apiStatusLoading ? '检查中...' : '检查 API 服务状态' }}
          </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useApiKeyStore } from '@/stores/apiKey';
import { useNotificationStore } from '@/stores/notifications';
import apiClient from '@/services/apiClient';

const apiKeyStore = useApiKeyStore();
const notificationStore = useNotificationStore();

const currentApiKey = ref('');
const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
const apiStatusLoading = ref(false);

function saveApiKey() {
  if (!currentApiKey.value.trim()) {
    notificationStore.addError('API 密钥不能为空。');
    return;
  }
  apiKeyStore.setApiKey(currentApiKey.value);
  notificationStore.addSuccess('API 密钥已更新。');
  currentApiKey.value = ''; // Clear after save
}

async function checkApiStatus() {
  apiStatusLoading.value = true;
  try {
    const status = await apiClient.checkServiceStatus();
    notificationStore.addSuccess(`API 服务状态: ${status?.status || '未知'}. 版本: ${status?.version || '未知'}`);
  } catch (error: any) {
    notificationStore.addError(`API 服务连接失败: ${error.message}`);
  } finally {
    apiStatusLoading.value = false;
  }
}
</script>