<template>
  <div class="min-h-screen bg-gray-100 text-gray-800">
    <header class="bg-blue-600 text-white shadow-md">
      <nav class="container mx-auto px-4 py-3 flex justify-between items-center">
        <div class="text-xl font-bold">Proxmox LXC 管理面板</div>
        <div>
          <router-link to="/nodes" class="px-3 py-2 hover:bg-blue-700 rounded">节点管理</router-link>
          <router-link to="/containers" class="px-3 py-2 hover:bg-blue-700 rounded">容器管理</router-link>
          <router-link to="/settings" class="px-3 py-2 hover:bg-blue-700 rounded">设置</router-link>
        </div>
      </nav>
    </header>

    <main class="container mx-auto p-4">
      <router-view />
    </main>

    <Notifications />

    <footer class="text-center py-4 mt-8 text-sm text-gray-600 border-t border-gray-300">
      <p>Proxmox LXC Web 界面</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import Notifications from '@/components/Notifications.vue';
import { useApiKeyStore } from '@/stores/apiKey';
import { onMounted } from 'vue';
import apiClient from './services/apiClient';
import { useNotificationStore } from './stores/notifications';

const apiKeyStore = useApiKeyStore();
const notificationStore = useNotificationStore();

onMounted(async () => {
  if (!apiKeyStore.apiKey) {
    notificationStore.addError('API密钥未设置。请前往设置页面进行配置。', undefined, undefined);
  } else {
    try {
      await apiClient.checkServiceStatus();
      // notificationStore.addSuccess('API服务连接正常。'); // Optional: too noisy
    } catch (error: any) {
      notificationStore.addError(`无法连接到后端API服务: ${error.message}`);
    }
  }
});
</script>

<style>
/* Global styles if needed, Tailwind handles most */
body {
  font-family: 'Inter', sans-serif;
}
.router-link-exact-active {
  @apply bg-blue-700;
}
</style>