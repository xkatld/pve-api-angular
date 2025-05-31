<template>
  <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-40 flex justify-center items-start pt-10">
    <div class="relative mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
      <div class="mt-3 text-center">
        <h3 class="text-xl leading-6 font-medium text-gray-900 mb-2">重建 LXC 容器: {{ container.name }} ({{ container.vmid }})</h3>
        <p class="text-sm text-red-600 mb-4">警告: 此操作将删除现有容器及其所有数据，并使用新配置重新创建它。</p>
        <form @submit.prevent="submitRebuildContainer" class="space-y-4 text-left">
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="rebuild_ostemplate" class="block text-sm font-medium text-gray-700">新操作系统模板*</label>
              <select id="rebuild_ostemplate" v-model="formData.ostemplate" required :disabled="loadingNodeResources.templates"
                      class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                <option disabled value="">选择模板</option>
                <option v-for="tmpl in nodeSpecificResources.templates" :key="tmpl.volid" :value="tmpl.volid">{{ tmpl.volid.split('/').pop() }} ({{formatBytes(tmpl.size)}})</option>
              </select>
              <p v-if="loadingNodeResources.templates" class="text-xs text-gray-500 mt-1">正在加载模板...</p>
            </div>
             <div>
              <label for="rebuild_hostname" class="block text-sm font-medium text-gray-700">新主机名*</label>
              <input type="text" id="rebuild_hostname" v-model="formData.hostname" required
                    class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
            </div>
          </div>

          <div>
            <label for="rebuild_password" class="block text-sm font-medium text-gray-700">新密码*</label>
            <input type="password" id="rebuild_password" v-model="formData.password" required
                   class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="rebuild_storage" class="block text-sm font-medium text-gray-700">新存储*</label>
              <select id="rebuild_storage" v-model="formData.storage" required :disabled="loadingNodeResources.storages"
                      class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                 <option disabled value="">选择存储</option>
                 <option v-for="stor in nodeSpecificResources.storages" :key="stor.storage" :value="stor.storage">{{ stor.storage }} ({{formatBytes(stor.avail || 0)}} 可用)</option>
              </select>
              <p v-if="loadingNodeResources.storages" class="text-xs text-gray-500 mt-1">正在加载存储...</p>
            </div>
             <div>
              <label for="rebuild_disk_size" class="block text-sm font-medium text-gray-700">新磁盘大小 (GB)*</label>
              <input type="number" id="rebuild_disk_size" v-model.number="formData.disk_size" required min="1"
                    class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label for="rebuild_cores" class="block text-sm font-medium text-gray-700">新CPU核心数*</label>
              <input type="number" id="rebuild_cores" v-model.number="formData.cores" required min="1"
                     class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
            </div>
            <div>
              <label for="rebuild_memory" class="block text-sm font-medium text-gray-700">新内存 (MB)*</label>
              <input type="number" id="rebuild_memory" v-model.number="formData.memory" required min="64" step="64"
                     class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
            </div>
            <div>
              <label for="rebuild_swap" class="block text-sm font-medium text-gray-700">新SWAP (MB)*</label>
              <input type="number" id="rebuild_swap" v-model.number="formData.swap" required min="0" step="64"
                     class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
            </div>
          </div>
          
          <fieldset class="border p-4 rounded-md">
            <legend class="text-sm font-medium text-gray-700 px-1">新网络接口 (eth0)</legend>
            <div class="space-y-3">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label for="rebuild_net_bridge" class="block text-xs font-medium text-gray-600">新桥接网卡*</label>
                  <select id="rebuild_net_bridge" v-model="formData.network.bridge" required :disabled="loadingNodeResources.networks"
                          class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                    <option disabled value="">选择桥接</option>
                    <option v-for="net in nodeSpecificResources.networks" :key="net.iface" :value="net.iface">{{ net.iface }}</option>
                  </select>
                  <p v-if="loadingNodeResources.networks" class="text-xs text-gray-500 mt-1">正在加载网络...</p>
                </div>
                 <div>
                  <label for="rebuild_net_ip" class="block text-xs font-medium text-gray-600">新IP地址/CIDR (或 'dhcp')*</label>
                  <input type="text" id="rebuild_net_ip" v-model="formData.network.ip" required placeholder="例如: 192.168.1.100/24 或 dhcp"
                         class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                </div>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label for="rebuild_net_gw" class="block text-xs font-medium text-gray-600">新网关 (可选)</label>
                  <input type="text" id="rebuild_net_gw" v-model="formData.network.gw" placeholder="例如: 192.168.1.1"
                         class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                </div>
                <div>
                  <label for="rebuild_net_vlan" class="block text-xs font-medium text-gray-600">新VLAN ID (可选)</label>
                  <input type="number" id="rebuild_net_vlan" v-model.number="formData.network.vlan" min="1" max="4094"
                         class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                </div>
              </div>
               <div>
                  <label for="rebuild_net_rate" class="block text-xs font-medium text-gray-600">新速率限制 (MB/s) (可选)</label>
                  <input type="number" id="rebuild_net_rate" v-model.number="formData.network.rate" min="1"
                         class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                </div>
            </div>
          </fieldset>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
              <label for="rebuild_cpulimit" class="block text-sm font-medium text-gray-700">新CPU限制 (0为无限制)</label>
              <input type="number" id="rebuild_cpulimit" v-model.number="formData.cpulimit" min="0"
                    class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
            </div>
            <div>
              <label for="rebuild_console_mode" class="block text-sm font-medium text-gray-700">新控制台模式</label>
              <select id="rebuild_console_mode" v-model="formData.console_mode"
                      class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                <option v-for="mode in consoleModes" :key="mode" :value="mode">{{ mode }}</option>
              </select>
            </div>
          </div>


          <div>
            <label for="rebuild_features" class="block text-sm font-medium text-gray-700">新额外特性 (可选, 逗号分隔)</label>
            <input type="text" id="rebuild_features" v-model="formData.features" placeholder="例如: keyctl=1,nesting=1"
                   class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
          </div>

          <div class="flex items-center space-x-4">
            <div class="flex items-center">
              <input id="rebuild_nesting" type="checkbox" v-model="formData.nesting"
                     class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
              <label for="rebuild_nesting" class="ml-2 block text-sm text-gray-900">启用嵌套虚拟化</label>
            </div>
            <div class="flex items-center">
              <input id="rebuild_unprivileged" type="checkbox" v-model="formData.unprivileged"
                     class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
              <label for="rebuild_unprivileged" class="ml-2 block text-sm text-gray-900">非特权容器</label>
            </div>
             <div class="flex items-center">
              <input id="rebuild_start" type="checkbox" v-model="formData.start"
                     class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
              <label for="rebuild_start" class="ml-2 block text-sm text-gray-900">重建后启动</label>
            </div>
          </div>

          <div class="py-3 flex justify-end space-x-3">
            <button type="button" @click="$emit('close')"
                    class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
              取消
            </button>
            <button type="submit" :disabled="isSubmitting"
                    class="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 flex items-center">
               <svg v-if="isSubmitting" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ isSubmitting ? '重建中...' : '确认重建' }}
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
import type { ContainerRebuild, ContainerStatus, NodeResource } from '@/types/proxmox';
import { ConsoleMode } from '@/types/proxmox';

const props = defineProps<{ container: ContainerStatus }>();
const emit = defineEmits(['close', 'rebuilt']);
const notificationStore = useNotificationStore();

const defaultNetwork: ContainerRebuild['network'] = {
  name: 'eth0',
  bridge: '',
  ip: 'dhcp',
  gw: undefined,
  vlan: undefined,
  rate: undefined,
};

const formData = reactive<ContainerRebuild>({
  ostemplate: '',
  hostname: props.container.name || `ct-${props.container.vmid}-rebuilt`,
  password: '',
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

async function loadNodeResources(nodeName: string) {
  if (!nodeName) return;
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

async function submitRebuildContainer() {
   if (!formData.ostemplate || !formData.hostname || !formData.password || !formData.storage || !formData.network.bridge || !formData.network.ip) {
    notificationStore.addError('请填写所有必填项带 "*" 的字段。');
    return;
  }
  if (!confirm(`再次确认：是否要重建容器 ${props.container.name} (VMID: ${props.container.vmid})？所有数据将丢失！`)) {
    return;
  }
  isSubmitting.value = true;
  try {
    const payload = { ...formData };
    if (payload.network.gw === '') payload.network.gw = undefined;
    if (payload.features === '') payload.features = undefined;
    
    const response = await apiClient.rebuildContainer(props.container.node, props.container.vmid, payload);
    if (response.success) {
      notificationStore.addSuccess(response.message, response.data?.task_id, props.container.node);
      emit('rebuilt');
      emit('close');
    } else {
      notificationStore.addError(response.message || '重建容器失败');
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

onMounted(() => {
  loadNodeResources(props.container.node);
  // Pre-fill some sensible defaults from existing container if possible, or general defaults
  // This requires fetching current container config if we want to prefill more accurately
  // For now, using very basic defaults as above.
});
</script>