<template>
  <div>
    <el-card>
        <template #header>
            <div class="card-header">
                <span>容器列表</span>
                 <el-button type="primary" @click="goToCreate">
                    <el-icon><Plus /></el-icon> 创建容器
                </el-button>
            </div>
        </template>

      <el-table :data="containers" v-loading="loading" style="width: 100%">
        <el-table-column prop="vmid" label="VMID" width="80" />
        <el-table-column prop="name" label="名称" />
        <el-table-column prop="node" label="节点" width="100" />
        <el-table-column label="状态" width="100">
            <template #default="scope">
                <el-tag :type="getStatusType(scope.row.status)">
                    {{ scope.row.status }}
                </el-tag>
            </template>
        </el-table-column>
         <el-table-column label="CPU" width="120">
            <template #default="scope">
                {{ (scope.row.cpu * 100).toFixed(1) }}%
            </template>
        </el-table-column>
        <el-table-column label="内存" width="180">
            <template #default="scope">
               {{ formatBytes(scope.row.mem) }} / {{ formatBytes(scope.row.maxmem) }}
            </template>
        </el-table-column>
        <el-table-column prop="uptime" label="运行时间" width="150">
             <template #default="scope">
                {{ formatUptime(scope.row.uptime) }}
            </template>
        </el-table-column>
        <el-table-column label="操作" width="320">
          <template #default="scope">
            <el-button-group>
                <el-button size="small" type="success" @click="handleAction(scope.row, 'start')" :disabled="scope.row.status === 'running'">启动</el-button>
                <el-button size="small" type="warning" @click="handleAction(scope.row, 'shutdown')" :disabled="scope.row.status !== 'running'">关闭</el-button>
                <el-button size="small" type="danger" @click="handleAction(scope.row, 'stop')" :disabled="scope.row.status !== 'running'">停止</el-button>
                <el-button size="small" @click="handleAction(scope.row, 'reboot')" :disabled="scope.row.status !== 'running'">重启</el-button>
                <el-button size="small" type="info" @click="openConsole(scope.row)">控制台</el-button>
                <el-button size="small" type="danger" @click="handleAction(scope.row, 'delete')">删除</el-button>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getContainersApi, startContainerApi, stopContainerApi, shutdownContainerApi, rebootContainerApi, deleteContainerApi, getConsoleApi } from '../api/lxc'
import { ElMessage, ElMessageBox } from 'element-plus'

const containers = ref([])
const loading = ref(false)
const router = useRouter()

const fetchContainers = async () => {
  loading.value = true
  try {
    const response = await getContainersApi()
    containers.value = response.containers
  } catch (error) {
    console.error('获取容器列表失败:', error)
  } finally {
    loading.value = false
  }
}

const getStatusType = (status) => {
    return status === 'running' ? 'success' : 'danger';
}

const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

const formatUptime = (seconds) => {
    if (seconds <= 0) return 'N/A';
    const d = Math.floor(seconds / (3600*24));
    const h = Math.floor(seconds % (3600*24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    const s = Math.floor(seconds % 60);
    return `${d}天 ${h}时 ${m}分 ${s}秒`;
}

const handleAction = async (row, action) => {
    let apiFunc;
    let actionText = '';

    switch(action) {
        case 'start': apiFunc = startContainerApi; actionText = '启动'; break;
        case 'stop': apiFunc = stopContainerApi; actionText = '强制停止'; break;
        case 'shutdown': apiFunc = shutdownContainerApi; actionText = '关闭'; break;
        case 'reboot': apiFunc = rebootContainerApi; actionText = '重启'; break;
        case 'delete': apiFunc = deleteContainerApi; actionText = '删除'; break;
        default: return;
    }

    try {
        await ElMessageBox.confirm(`确定要 ${actionText} 容器 ${row.name} (${row.vmid}) 吗？`, '警告', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: action === 'delete' || action === 'stop' ? 'warning' : 'info',
        })

        loading.value = true;
        const response = await apiFunc(row.node, row.vmid);
        if (response.success) {
            ElMessage.success(`容器 ${actionText} 命令已发送 (任务ID: ${response.data?.task_id})`);
            setTimeout(fetchContainers, 3000);
        } else {
            ElMessage.error(`${actionText} 失败: ${response.message}`);
        }
    } catch (error) {
       if (error !== 'cancel') {
          console.error(`${actionText} 容器失败:`, error);
          ElMessage.error(`${actionText} 容器失败: ${error?.response?.data?.detail || error}`);
       }
    } finally {
        if (action !== 'delete') { // 删除后不需要取消 loading
            loading.value = false;
        }
    }
}

const openConsole = async (row) => {
    try {
        const response = await getConsoleApi(row.node, row.vmid);
        if (response.success && response.data) {
            const { ticket, port, user, host } = response.data;
            const url = `https://<你的Proxmox服务器IP>:8006/?console=lxc&vmid=${row.vmid}&node=${row.node}&vnc=html5&resize=scale&xtermjs=1&username=${user}&ticket=${encodeURIComponent(ticket)}`;
            window.open(url, `_blank`);
             ElMessage.info(`正在打开 ${row.name} 的控制台...`);
        } else {
             ElMessage.error(`获取控制台失败: ${response.message}`);
        }
    } catch (error) {
        ElMessage.error(`获取控制台失败: ${error}`);
    }
}


const goToCreate = () => {
    router.push('/create');
}


onMounted(fetchContainers)
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.el-button-group .el-button {
    margin-right: 5px;
}
</style>
