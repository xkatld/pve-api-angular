<template>
  <div class="space-y-6">
    <h1 class="text-3xl font-semibold">节点管理</h1>

    <div class="bg-white p-6 rounded-lg shadow">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-semibold">节点列表</h2>
        <button
          @click="fetchNodes"
          :disabled="loadingNodes"
          class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 flex items-center"
        >
          <svg v-if="loadingNodes" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ loadingNodes ? '加载中...' : '刷新节点' }}
        </button>
      </div>
      <div v-if="loadingNodes && nodes.length === 0" class="text-center py-4">正在加载节点信息...</div>
      <div v-else-if="nodes.length === 0" class="text-center py-4 text-gray-500">未找到任何在线节点。</div>
      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">节点名称</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CPU</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">内存</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">磁盘</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">运行时间 (天)</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="node in nodes" :key="node.node">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ node.node }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm">
                <span :class="node.status === 'online' ? 'text-green-600' : 'text-red-600'">{{ node.status }}</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ (node.cpu * 100).toFixed(1) }}% ({{ node.maxcpu }} 核)</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatBytes(node.mem) }} / {{ formatBytes(node.maxmem) }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatBytes(node.disk) }} / {{ formatBytes(node.maxdisk) }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ (node.uptime / 86400).toFixed(1) }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button @click="selectNode(node.node)" class="text-blue-600 hover:text-blue-800">查看资源</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="selectedNode" class="bg-white p-6 rounded-lg shadow mt-6">
      <h2 class="text-xl font-semibold mb-4">节点 {{ selectedNode }} 的资源</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <h3 class="text-lg font-medium mb-2">CT 模板</h3>
          <button @click="fetchNodeResources('templates')" :disabled="loadingResources.templates" class="text-sm text-blue-500 hover:underline mb-2">刷新</button>
          <div v-if="loadingResources.templates">加载中...</div>
          <ul v-else-if="nodeResources.templates?.length" class="list-disc list-inside text-sm space-y-1">
            <li v-for="template in nodeResources.templates" :key="template.volid">{{ template.volid }} ({{ formatBytes(template.size) }})</li>
          </ul>
          <div v-else class="text-sm text-gray-500">无可用模板。</div>
        </div>
        <div>
          <h3 class="text-lg font-medium mb-2">存储</h3>
           <button @click="fetchNodeResources('storages')" :disabled="loadingResources.storages" class="text-sm text-blue-500 hover:underline mb-2">刷新</button>
          <div v-if="loadingResources.storages">加载中...</div>
          <ul v-else-if="nodeResources.storages?.length" class="list-disc list-inside text-sm space-y-1">
            <li v-for="storage in nodeResources.storages" :key="storage.storage">{{ storage.storage }} ({{ storage.type }}, {{ formatBytes(storage.used || 0) }}/{{ formatBytes(storage.total || 0) }})</li>
          </ul>
          <div v-else class="text-sm text-gray-500">无可用存储。</div>
        </div>
        <div>
          <h3 class="text-lg font-medium mb-2">网络 (桥接)</h3>
           <button @click="fetchNodeResources('networks')" :disabled="loadingResources.networks" class="text-sm text-blue-500 hover:underline mb-2">刷新</button>
          <div v-if="loadingResources.networks">加载中...</div>
          <ul v-else-if="nodeResources.networks?.length" class="list-disc list-inside text-sm space-y-1">
            <li v-for="network in nodeResources.networks" :key="network.iface">{{ network.iface }} ({{ network.active ? '活动' : '非活动' }})</li>
          </ul>
          <div v-else class="text-sm text-gray-500">无可用网络接口。</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import apiClient from '@/services/apiClient';
import { useNotificationStore } from '@/stores/notifications';
import type { NodeInfo, NodeResource } from '@/types/proxmox';

const notificationStore = useNotificationStore();
const nodes = ref<NodeInfo[]>([]);
const loadingNodes = ref(false);
const selectedNode = ref<string | null>(null);

const nodeResources = reactive<{
  templates: NodeResource[] | null;
  storages: NodeResource[] | null;
  networks: NodeResource[] | null;
}>({
  templates: null,
  storages: null,
  networks: null,
});

const loadingResources = reactive({
  templates: false,
  storages: false,
  networks: false,
});

async function fetchNodes() {
  loadingNodes.value = true;
  try {
    const response = await apiClient.getNodes();
    if (response.success && response.data) {
      nodes.value = response.data;
    } else {
      notificationStore.addError(response.message || '获取节点列表失败');
      nodes.value = [];
    }
  } catch (error: any) {
    notificationStore.addError(error.message);
    nodes.value = [];
  } finally {
    loadingNodes.value = false;
  }
}

async function selectNode(nodeName: string) {
  selectedNode.value = nodeName;
  nodeResources.templates = null;
  nodeResources.storages = null;
  nodeResources.networks = null;
  await fetchNodeResources('templates');
  await fetchNodeResources('storages');
  await fetchNodeResources('networks');
}

type ResourceType = 'templates' | 'storages' | 'networks';

async function fetchNodeResources(type: ResourceType) {
  if (!selectedNode.value) return;
  loadingResources[type] = true;
  try {
    let response;
    if (type === 'templates') response = await apiClient.getNodeTemplates(selectedNode.value);
    else if (type === 'storages') response = await apiClient.getNodeStorages(selectedNode.value);
    else response = await apiClient.getNodeNetworks(selectedNode.value);

    if (response.success && response.data) {
      nodeResources[type] = response.data;
    } else {
      notificationStore.addError(response.message || `获取${type}失败`);
      nodeResources[type] = [];
    }
  } catch (error: any) {
    notificationStore.addError(error.message);
    nodeResources[type] = [];
  } finally {
    loadingResources[type] = false;
  }
}

function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

onMounted(fetchNodes);
</script>