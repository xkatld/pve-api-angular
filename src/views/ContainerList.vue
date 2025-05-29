<template>
  <el-card class="box-card">
    <template #header>
      <div class="card-header">
        <span>LXC 容器列表</span>
        <el-button type="primary" :icon="Refresh" @click="fetchContainers" :loading="loading">刷新</el-button>
      </div>
    </template>
    <el-table :data="containers" style="width: 100%" v-loading="loading">
      <el-table-column prop="vmid" label="VMID" width="80" sortable />
      <el-table-column prop="name" label="名称" width="180" sortable />
      <el-table-column prop="node" label="节点" width="100" sortable />
      <el-table-column prop="status" label="状态" width="100" sortable>
         <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)">
              {{ scope.row.status }}
            </el-tag>
          </template>
      </el-table-column>
       <el-table-column label="CPU 使用率" width="120">
            <template #default="scope">
                {{ formatCpu(scope.row.cpu) }}
            </template>
        </el-table-column>
        <el-table-column label="内存使用" width="180">
            <template #default="scope">
                {{ formatMemory(scope.row.mem) }} / {{ formatMemory(scope.row.maxmem) }}
            </template>
        </el-table-column>
       <el-table-column prop="uptime" label="运行时间" width="150">
           <template #default="scope">
                {{ formatUptime(scope.row.uptime) }}
            </template>
       </el-table-column>
      <el-table-column label="操作" min-width="350" fixed="right">
        <template #default="scope">
           <el-button-group>
            <el-button
                size="small"
                type="primary"
                :icon="VideoPlay"
                @click="handleAction('start', scope.row)"
                :disabled="scope.row.status === 'running' || actionLoading[scope.row.vmid]"
                :loading="actionLoading[scope.row.vmid] === 'start'"
            >
              启动
            </el-button>
             <el-button
                size="small"
                type="warning"
                :icon="SwitchButton"
                @click="handleAction('shutdown', scope.row)"
                :disabled="scope.row.status !== 'running' || actionLoading[scope.row.vmid]"
                 :loading="actionLoading[scope.row.vmid] === 'shutdown'"
            >
              关闭
            </el-button>
            <el-button
                size="small"
                type="danger"
                :icon="CloseBold"
                @click="handleAction('stop', scope.row)"
                :disabled="scope.row.status !== 'running' || actionLoading[scope.row.vmid]"
                :loading="actionLoading[scope.row.vmid] === 'stop'"
            >
              停止
            </el-button>
             <el-button
                size="small"
                :icon="RefreshRight"
                @click="handleAction('reboot', scope.row)"
                :disabled="scope.row.status !== 'running' || actionLoading[scope.row.vmid]"
                :loading="actionLoading[scope.row.vmid] === 'reboot'"
            >
              重启
            </el-button>
            <el-button
                size="small"
                :icon="Monitor"
                @click="openConsole(scope.row)"
                :disabled="scope.row.status !== 'running' || actionLoading[scope.row.vmid]"
                 :loading="actionLoading[scope.row.vmid] === 'console'"
            >
              控制台
            </el-button>
            <el-button
                size="small"
                type="danger"
                :icon="Delete"
                @click="handleAction('delete', scope.row)"
                :disabled="actionLoading[scope.row.vmid]"
                :loading="actionLoading[scope.row.vmid] === 'delete'"
            >
              删除
            </el-button>
            </el-button-group>
        </template>
      </el-table-column>
    </el-table>
     <el-empty v-if="!loading && containers.length === 0" description="没有找到 LXC 容器" />
  </el-card>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue'
import {
  getContainersApi,
  startContainerApi,
  stopContainerApi,
  shutdownContainerApi,
  rebootContainerApi,
  deleteContainerApi,
  getConsoleApi,
  getTaskStatusApi
} from '../api/lxc'
import { useAuthStore } from '../stores/auth'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, VideoPlay, SwitchButton, CloseBold, RefreshRight, Monitor, Delete } from '@element-plus/icons-vue'

const containers = ref([])
const loading = ref(false)
const actionLoading = reactive({})
const authStore = useAuthStore()

const fetchContainers = async () => {
  loading.value = true
  try {
    const data = await getContainersApi()
    containers.value = data.containers || []
  } catch (error) {
    ElMessage.error('获取容器列表失败')
    console.error(error)
  } finally {
    loading.value = false
  }
}

const pollTaskStatus = (node, taskId, vmid, actionName) => {
  const interval = setInterval(async () => {
    try {
      const data = await getTaskStatusApi(node, taskId)
      if (data && data.status !== 'running') {
        clearInterval(interval);
        ElMessage.success(`容器 ${vmid} ${actionName} 操作完成: ${data.status}`);
        delete actionLoading[vmid];
        fetchContainers();
      } else if (!data) {
           clearInterval(interval);
           ElMessage.warning(`无法获取任务 ${taskId} 状态，请稍后刷新列表。`);
           delete actionLoading[vmid];
           fetchContainers();
      }
    } catch (error) {
      clearInterval(interval);
      ElMessage.error(`查询任务 ${taskId} 状态失败`);
      delete actionLoading[vmid];
      fetchContainers();
    }
  }, 3000);
}

const handleAction = async (action, container) => {
  const { node, vmid, name } = container
  let apiCall = null
  let actionName = ''
  let confirmMessage = ''

  switch (action) {
    case 'start':
      apiCall = startContainerApi
      actionName = '启动'
      confirmMessage = `确定要启动容器 ${name} (${vmid}) 吗？`
      break
    case 'shutdown':
      apiCall = shutdownContainerApi
      actionName = '关闭'
      confirmMessage = `确定要关闭容器 ${name} (${vmid}) 吗？`
      break
    case 'stop':
      apiCall = stopContainerApi
      actionName = '停止'
      confirmMessage = `确定要强制停止容器 ${name} (${vmid}) 吗？这可能导致数据丢失！`
      break
    case 'reboot':
      apiCall = rebootContainerApi
      actionName = '重启'
      confirmMessage = `确定要重启容器 ${name} (${vmid}) 吗？`
      break
    case 'delete':
      apiCall = deleteContainerApi
      actionName = '删除'
      confirmMessage = `确定要删除容器 ${name} (${vmid}) 吗？此操作不可恢复！`
      break
    default:
      return
  }

  ElMessageBox.confirm(confirmMessage, '操作确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: action === 'delete' || action === 'stop' ? 'warning' : 'info',
  }).then(async () => {
    actionLoading[vmid] = action
    try {
      const response = await apiCall(node, vmid)
      if (response && response.data) {
           ElMessage.info(`容器 ${vmid} ${actionName} 任务已启动: ${response.data}`);
           pollTaskStatus(node, response.data, vmid, actionName);
      } else {
           ElMessage.success(`容器 ${vmid} ${actionName} 操作请求已发送，请稍后刷新。`);
           delete actionLoading[vmid];
           setTimeout(fetchContainers, 3000);
      }
    } catch (error) {
      console.error(`执行 ${actionName} 操作失败:`, error)
       delete actionLoading[vmid];
    }
  }).catch(() => {
    ElMessage.info('已取消操作')
  })
}

const openConsole = async (container) => {
    const { node, vmid } = container;
    actionLoading[vmid] = 'console';
    try {
        const consoleData = await getConsoleApi(node, vmid);
        if (consoleData && consoleData.ticket) {
            const vncUrl = authStore.proxmoxVncBaseURL;
            if (!vncUrl) {
                ElMessage.error('请先在后端配置中设置 Proxmox VNC 地址');
                return;
            }
            const url = `${vncUrl}/?console=lxc&vmid=${vmid}&node=${node}&vncproxy=${consoleData.host}&port=${consoleData.port}&vncticket=${encodeURIComponent(consoleData.ticket)}`;
            window.open(url, '_blank');
        } else {
             ElMessage.error('获取控制台信息失败');
        }
    } catch (error) {
         ElMessage.error('打开控制台失败');
         console.error(error);
    } finally {
         delete actionLoading[vmid];
    }
}

const getStatusType = (status) => {
  return status === 'running' ? 'success' : 'info';
}

const formatCpu = (cpu) => {
    return cpu ? `${(cpu * 100).toFixed(2)} %` : 'N/A';
}

const formatMemory = (mem) => {
    if (!mem) return 'N/A';
    const gb = mem / (1024 * 1024 * 1024);
    if (gb >= 1) {
        return `${gb.toFixed(2)} GB`;
    } else {
        const mb = mem / (1024 * 1024);
        return `${mb.toFixed(0)} MB`;
    }
}

const formatUptime = (seconds) => {
    if (!seconds) return 'N/A';
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    let str = '';
    if (d > 0) str += `${d} 天 `;
    if (h > 0) str += `${h} 小时 `;
    if (m > 0) str += `${m} 分钟 `;
    str += `${s} 秒`;
    return str;
}


onMounted(fetchContainers)
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.el-button-group {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
}
.el-button-group .el-button {
    margin-left: 0 !important;
}
</style>
