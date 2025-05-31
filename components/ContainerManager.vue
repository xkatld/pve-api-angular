<template>
  <div class="space-y-6">
    <h1 class="text-3xl font-semibold">容器管理</h1>

    <div class="bg-white p-6 rounded-lg shadow">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-semibold">容器列表</h2>
        <div class="flex items-center space-x-2">
           <select v-model="selectedNodeFilter" @change="fetchContainers" class="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
            <option :value="null">所有节点</option>
            <option v-for="node in availableNodes" :key="node.node" :value="node.node">{{ node.node }}</option>
          </select>
          <button
            @click="showCreateModal = true"
            class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            创建容器
          </button>
          <button
            @click="fetchContainers"
            :disabled="loadingContainers"
            class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 flex items-center"
          >
            <svg v-if="loadingContainers" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ loadingContainers ? '加载中...' : '刷新列表' }}
          </button>
        </div>
      </div>

      <div v-if="loadingContainers && containers.length === 0" class="text-center py-4">正在加载容器信息...</div>
      <div v-else-if="containers.length === 0" class="text-center py-4 text-gray-500">未找到任何容器。</div>
      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">VMID</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">名称</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">节点</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CPU</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">内存</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="ct in containers" :key="ct.vmid + ct.node">
              <td class="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ ct.vmid }}</td>
              <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{{ ct.name }}</td>
              <td class="px-4 py-4 whitespace-nowrap text-sm">
                <span :class="ct.status === 'running' ? 'text-green-600' : (ct.status === 'stopped' ? 'text-red-600' : 'text-yellow-600')">
                  {{ ct.status }}
                </span>
              </td>
              <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{{ ct.node }}</td>
              <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{{ (ct.cpu || 0 * 100).toFixed(1) }}%</td>
              <td class="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatBytes(ct.mem || 0) }} / {{ formatBytes(ct.maxmem || 0) }}</td>
              <td class="px-4 py-4 whitespace-nowrap text-sm font-medium space-x-1">
                <button @click="containerAction(ct, 'start')" :disabled="ct.status === 'running'" class="text-green-600 hover:text-green-800 disabled:opacity-50">启动</button>
                <button @click="containerAction(ct, 'shutdown')" :disabled="ct.status !== 'running'" class="text-yellow-600 hover:text-yellow-800 disabled:opacity-50">关闭</button>
                <button @click="containerAction(ct, 'stop')" :disabled="ct.status !== 'running'" class="text-orange-600 hover:text-orange-800 disabled:opacity-50">停止</button>
                <button @click="containerAction(ct, 'reboot')" :disabled="ct.status !== 'running'" class="text-blue-600 hover:text-blue-800 disabled:opacity-50">重启</button>
                <button @click="openRebuildModal(ct)" class="text-purple-600 hover:text-purple-800">重建</button>
                <button @click="containerAction(ct, 'delete')" class="text-red-600 hover:text-red-800">删除</button>
                <button @click="containerAction(ct, 'console')" class="text-indigo-600 hover:text-indigo-800">控制台</button>
                <button @click="refreshContainerStatus(ct)" title="刷新状态" class="text-gray-500 hover:text-gray-700">🔄</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <CreateContainerModal v-if="showCreateModal" @close="showCreateModal = false" @created="handleContainerModified" />
    <RebuildContainerModal v-if="showRebuildModal && currentContainerForRebuild" :container="currentContainerForRebuild" @close="showRebuildModal = false" @rebuilt="handleContainerModified" />

    <div v-if="consoleInfo" class="mt-6 bg-gray-800 text-white p-4 rounded-lg shadow">
        <h3 class="text-lg font-semibold mb-2">控制台连接信息 (VMID: {{ consoleInfoVmid }})</h3>
        <pre class="text-sm whitespace-pre-wrap">{{ JSON.stringify(consoleInfo, null, 2) }}</pre>
        <p class="mt-2 text-xs">您需要使用支持 Proxmox VNC/SPICE 票据的客户端 (如 noVNC) 来连接。</p>
        <button @click="consoleInfo = null" class="mt-2 px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs">关闭信息</button>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import apiClient from '@/services/apiClient';
import { useNotificationStore } from '@/stores/notifications';
import type { ContainerStatus, NodeInfo, ConsoleTicket } from '@/types/proxmox';
import CreateContainerModal from './CreateContainerModal.vue';
import RebuildContainerModal from './RebuildContainerModal.vue';

const notificationStore = useNotificationStore();
const containers = ref<ContainerStatus[]>([]);
const loadingContainers = ref(false);
const selectedNodeFilter = ref<string | null>(null);
const availableNodes = ref<NodeInfo[]>([]);

const showCreateModal = ref(false);
const showRebuildModal = ref(false);
const currentContainerForRebuild = ref<ContainerStatus | null>(null);

const consoleInfo = ref<ConsoleTicket | null>(null);
const consoleInfoVmid = ref<string | null>(null);

async function fetchAvailableNodes() {
  try {
    const response = await apiClient.getNodes();
    if (response.success && response.data) {
      availableNodes.value = response.data;
    }
  } catch (error: any) {
    // Silent fail is okay here, or light notification
  }
}

async function fetchContainers() {
  loadingContainers.value = true;
  consoleInfo.value = null;
  try {
    const response = await apiClient.getContainers(selectedNodeFilter.value || undefined);
    if (response.containers) { // Assuming API directly returns ContainerList structure
      containers.value = response.containers;
    } else {
      notificationStore.addError('获取容器列表响应格式不正确');
      containers.value = [];
    }
  } catch (error: any) {
    notificationStore.addError(error.message);
    containers.value = [];
  } finally {
    loadingContainers.value = false;
  }
}

type ContainerAction = 'start' | 'stop' | 'shutdown' | 'reboot' | 'delete' | 'console';

async function containerAction(ct: ContainerStatus, action: ContainerAction) {
  const actionTextMap = {
    start: '启动', stop: '停止', shutdown: '关闭', reboot: '重启', delete: '删除', console: '获取控制台'
  };
  const confirmText: { [key in ContainerAction]?: string } = {
    stop: `确定要强制停止容器 ${ct.name} (VMID: ${ct.vmid}) 吗？`,
    delete: `确定要删除容器 ${ct.name} (VMID: ${ct.vmid}) 吗？此操作不可恢复！`,
  };

  if (confirmText[action] && !confirm(confirmText[action]!)) {
    return;
  }

  try {
    let response;
    switch (action) {
      case 'start': response = await apiClient.startContainer(ct.node, ct.vmid); break;
      case 'stop': response = await apiClient.stopContainer(ct.node, ct.vmid); break;
      case 'shutdown': response = await apiClient.shutdownContainer(ct.node, ct.vmid); break;
      case 'reboot': response = await apiClient.rebootContainer(ct.node, ct.vmid); break;
      case 'delete': response = await apiClient.deleteContainer(ct.node, ct.vmid); break;
      case 'console':
        const consoleResponse = await apiClient.getContainerConsole(ct.node, ct.vmid);
        if (consoleResponse.success && consoleResponse.data) {
          consoleInfo.value = consoleResponse.data;
          consoleInfoVmid.value = ct.vmid;
          notificationStore.addSuccess(consoleResponse.message);
        } else {
          notificationStore.addError(consoleResponse.message || '获取控制台信息失败');
        }
        return; // Special handling for console
    }

    if (response.success) {
      notificationStore.addSuccess(response.message, response.data?.task_id, ct.node);
      setTimeout(fetchContainers, 2000); // Refresh list after a short delay for task to progress
    } else {
      notificationStore.addError(response.message || `${actionTextMap[action]}容器 ${ct.vmid} 失败`);
    }
  } catch (error: any) {
    notificationStore.addError(error.message);
  }
}

async function refreshContainerStatus(ct: ContainerStatus) {
  try {
    const updatedStatus = await apiClient.getContainerStatus(ct.node, ct.vmid);
    const index = containers.value.findIndex(c => c.vmid === ct.vmid && c.node === ct.node);
    if (index !== -1) {
      containers.value[index] = { ...containers.value[index], ...updatedStatus };
      notificationStore.addInfo(`容器 ${ct.vmid} 状态已刷新。`);
    }
  } catch (error: any) {
    notificationStore.addError(`刷新容器 ${ct.vmid} 状态失败: ${error.message}`);
  }
}


function openRebuildModal(ct: ContainerStatus) {
  currentContainerForRebuild.value = ct;
  showRebuildModal.value = true;
}

function handleContainerModified() {
  fetchContainers();
}

function formatBytes(bytes: number, decimals = 1) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

onMounted(() => {
  fetchAvailableNodes();
  fetchContainers();
});
</script>