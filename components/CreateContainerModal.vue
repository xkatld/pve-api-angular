<template>
  <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-40 flex justify-center items-start pt-10">
    <div class="relative mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
      <div class="mt-3 text-center">
        <h3 class="text-xl leading-6 font-medium text-gray-900 mb-6">创建新 LXC 容器</h3>
        <form @submit.prevent="submitCreateContainer" class="space-y-4 text-left">
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="node" class="block text-sm font-medium text-gray-700">节点*</label>
              <select id="node" v-model="formData.node" required @change="loadNodeResources(formData.node)"
                      class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                <option disabled value="">请选择节点</option>
                <option v-for="n in availableNodes" :key="n.node" :value="n.node">{{ n.node }}</option>
              </select>
            </div>
            <div>
              <label for="vmid" class="block text-sm font-medium text-gray-700">VMID*</label>
              <input type="number" id="vmid" v-model.number="formData.vmid" required
                     class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
            </div>
          </div>

          <div>
            <label for="hostname" class="block text-sm font-medium text-gray-700">主机名*</label>
            <input type="text" id="hostname" v-model="formData.hostname" required
                   class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
          </div>

          <div>
            <label for="password" class="block text-sm font-medium text-gray-700">密码*</label>
            <input type="password" id="password" v-model="formData.password" required
                   class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="ostemplate" class="block text-sm font-medium text-gray-700">操作系统模板*</label>
              <select id="ostemplate" v-model="formData.ostemplate" required :disabled="!formData.node || loadingNodeResources.templates"
                      class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                <option disabled value="">选择模板 (先选节点)</option>
                <option v-for="tmpl in nodeSpecificResources.templates" :key="tmpl.volid" :value="tmpl.volid">{{ tmpl.volid.split('/').pop() }} ({{formatBytes(tmpl.size)}})</option>
              </select>
               <p v-if="loadingNodeResources.templates" class="text-xs text-gray-500 mt-1">正在加载模板...</p>
            </div>
            <div>
              <label for="storage" class="block text-sm font-medium text-gray-700">存储*</label>
              <select id="storage" v-model="formData.storage" required :disabled="!formData.node || loadingNodeResources.storages"
                      class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                 <option disabled value="">选择存储 (先选节点)</option>
                 <option v-for="stor in nodeSpecificResources.storages" :key="stor.storage" :value="stor.storage">{{ stor.storage }} ({{formatBytes(stor.avail || 0)}} 可用)</option>
              </select>
              <p v-if="loadingNodeResources.storages" class="text-xs text-gray-500 mt-1">正在加载存储...</p>
            </div>
          </div>

          <div>
            <label for="disk_size" class="block text-sm font-medium text-gray-700">磁盘大小 (GB)*</label>
            <input type="number" id="disk_size" v-model.number="formData.disk_size" required min="1"
                   class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label for="cores" class="block text-sm font-medium text-gray-700">CPU核心数*</label>
              <input type="number" id="cores" v-model.number="formData.cores" required min="1"
                     class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
            </div>
            <div>
              <label for="memory" class="block text-sm font-medium text-gray-700">内存 (MB)*</label>
              <input type="number" id="memory" v-model.number="formData.memory" required min="64" step="64"
                     class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
            </div>
            <div>
              <label for="swap" class="block text-sm font-medium text-gray-700">SWAP (MB)*</label>
              <input type="number" id="swap" v-model.number="formData.swap" required min="0" step="64"
                     class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
            </div>
          </div>
          
          <fieldset class="border p-4 rounded-md">
            <legend class="text-sm font-medium text-gray-700 px-1">网络接口 (eth0)</legend>
            <div class="space-y-3">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label for="net_bridge" class="block text-xs font-medium text-gray-600">桥接网卡*</label>
                  <select id="net_bridge" v-model="formData.network.bridge" required :disabled="!formData.node || loadingNodeResources.networks"
                          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                    <option disabled value="">选择桥接 (先选节点)</option>
                    <option v-for="net in nodeSpecificResources.networks" :key="net.iface" :value="net.iface">{{ net.iface }}</option>
                  </select>
                  <p v-if="loadingNodeResources.networks" class="text-xs text-gray-500 mt-1">正在加载网络...</p>
                </div>
                 <div>
                  <label for="net_ip" class="block text-xs font-medium text-gray-600">IP地址/CIDR (或 'dhcp')*</label>
                  <input type="text" id="net_ip" v-model="formData.network.ip" required placeholder="例如: 192.168.1.100/24 或 dhcp"
                         class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                </div>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label for="net_gw" class="block text-xs font-medium text-gray-600">网关 (可选)</label>
                  <input type="text" id="net_gw" v-model="formData.network.gw" placeholder="例如: 192.168.1.1"
                         class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                </div>
                <div>
                  <label for="net_vlan" class="block text-xs font-medium text-gray-600">VLAN ID (可选)</label>
                  <input type="number" id="net_vlan" v-model.number="formData.network.vlan" min="1" max="4094"
                         class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                </div>
              </div>
               <div>
                  <label for="net_rate" class="block text-xs font-medium text-gray-600">速率限制 (MB/s) (可选)</label>
                  <input type="number" id="net_rate" v-model.number="formData.network.rate" min="1"
                         class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                </div>
            </div>
          </fieldset>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="cpulimit" class="block text-sm font-medium text-gray-700">CPU限制 (0为无限制)</label>
              <input type="number" id="cpulimit" v-model.number="formData.cpulimit" min="0"
                    class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
            </div>
             <div>
              <label for="console_mode" class="block text-sm font-medium text-gray-700">控制台模式</label>
              <select id="console_mode" v-model="formData.console_mode"
                      class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                <option v-for="mode in consoleModes" :key="mode" :value="mode">{{ mode }}</option>
              </select>
            </div>
          </div>

          <div>
            <label for="features" class="block text-sm font-medium text-gray-700">额外特性 (可选, 逗号分隔)</label>
            <input type="text" id="features" v-model="formData.features" placeholder="例如: keyctl=1,nesting=1"
                   class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
          </div>

          <div class="flex items-center space-x-4">
            <div class="flex items-center">
              <input id="nesting" type="checkbox" v-model="formData.nesting"
                     class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
              <label for="nesting" class="ml-2 block text-sm text-gray-900">启用嵌套虚拟化</label>
            </div>
            <div class="flex items-center">
              <input id="unprivileged" type="checkbox" v-model="formData.unprivileged"
                     class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
              <label for="unprivileged" class="ml-2 block text-sm text-gray-900">非特权容器</label>
            </div>
             <div class="flex items-center">
              <input id="start" type="checkbox" v-model="formData.start"
                     class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
              <label for="start" class="ml-2 block text-sm text-gray-900">创建后启动</label>
            </div>
          </div>

          <div class="py-3 flex justify-end space-x-3">
            <button type="button" @click="$emit('close')"
                    class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
              取消
            </button>
            <button type="submit" :disabled="isSubmitting"
                    class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center">
              <svg v-if="isSubmitting" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ isSubmitting ? '创建中...' : '创建容器' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue';
import apiClient from '@/services/apiClient';
import { useNotificationStore } from '@/stores/notifications';
import type { ContainerCreate, NodeInfo, NodeResource } from '@/types/proxmox';
import { ConsoleMode } from '@/types/proxmox';

const emit = defineEmits(['close', 'created']);
const notificationStore = useNotificationStore();

const defaultNetwork: ContainerCreate['network'] = {
  name: 'eth0',
  bridge: '',
  ip: 'dhcp',
  gw: undefined,
  vlan: undefined,
  rate: undefined,
};

const formData = reactive<ContainerCreate>({
  node: '',
  vmid: 0,
  hostname: '',
  password: '',
  ostemplate: '',
  storage: '',
  disk_size: 8,
  cores: 1,
  memory: 512,
  swap: 512,
  network: { ...defaultNetwork },
  nesting: false,
  unprivileged: true,
  start: false,
  cpulimit: 0,
  features: '',
  console_mode: ConsoleMode.DEFAULT_TTY,
});

const consoleModes = Object.values(ConsoleMode);
const isSubmitting = ref(false);
const availableNodes = ref<NodeInfo[]>([]);
const nodeSpecificResources = reactive<{
  templates: NodeResource[];
  storages: NodeResource[];
  networks: NodeResource[];
}>({ templates: [], storages: [], networks: [] });

const loadingNodeResources = reactive({
  templates: false,
  storages: false,
  networks: false,
});

async function fetchAvailableNodes() {
  try {
    const response = await apiClient.getNodes();
    if (response.success && response.data) {
      availableNodes.value = response.data;
      if (availableNodes.value.length > 0 && !formData.node) {
         // Optionally pre-select first node
         // formData.node = availableNodes.value[0].node;
         // loadNodeResources(formData.node);
      }
    }
  } catch (error: any) {
    notificationStore.addError('获取可用节点列表失败: ' + error.message);
  }
}

async function loadNodeResources(nodeName: string) {
  if (!nodeName) return;
  
  // Reset dependent fields if node changes
  formData.ostemplate = '';
  formData.storage = '';
  formData.network.bridge = '';

  const types: Array<'templates' | 'storages' | 'networks'> = ['templates', 'storages', 'networks'];
  for (const type of types) {
    loadingNodeResources[type] = true;
    try {
      let response;
      if (type === 'templates') response = await apiClient.getNodeTemplates(nodeName);
      else if (type === 'storages') response = await apiClient.getNodeStorages(nodeName);
      else response = await apiClient.getNodeNetworks(nodeName);

      if (response.success && response.data) {
        nodeSpecificResources[type] = response.data;
      } else {
        nodeSpecificResources[type] = [];
        notificationStore.addError(response.message || `加载节点${type}资源失败`);
      }
    } catch (error: any) {
      nodeSpecificResources[type] = [];
      notificationStore.addError(`加载节点${type}资源时出错: ${error.message}`);
    } finally {
      loadingNodeResources[type] = false;
    }
  }
}


async function submitCreateContainer() {
  if (!formData.node || !formData.vmid || !formData.hostname || !formData.password || !formData.ostemplate || !formData.storage || !formData.network.bridge || !formData.network.ip) {
    notificationStore.addError('请填写所有必填项带 "*" 的字段。');
    return;
  }
  isSubmitting.value = true;
  try {
    // Ensure optional fields are null if empty string, or handle as API expects
    const payload = { ...formData };
    if (payload.network.gw === '') payload.network.gw = undefined;
    if (payload.features === '') payload.features = undefined;

    const response = await apiClient.createContainer(payload);
    if (response.success) {
      notificationStore.addSuccess(response.message, response.data?.task_id, formData.node);
      emit('created');
      emit('close');
    } else {
      notificationStore.addError(response.message || '创建容器失败');
    }
  } catch (error: any) {
    notificationStore.addError(error.message);
  } finally {
    isSubmitting.value = false;
  }
}

function formatBytes(bytes?: number, decimals = 1) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

onMounted(fetchAvailableNodes);
</script>