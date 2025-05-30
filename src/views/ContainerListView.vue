<template>
  <div class="page-container">
    <h2>LXC 容器列表</h2>
    <div class="toolbar">
      <el-button @click="fetchContainersAndNodes" :loading="loading" icon="Refresh" type="primary">刷新数据</el-button>
      <el-select v-model="selectedNode" placeholder="筛选节点 (可选)" clearable @change="fetchContainers" filterable style="width: 200px;">
          <el-option v-for="node in nodes" :key="node.node" :label="node.node" :value="node.node" />
      </el-select>
      <el-input v-model="searchTerm" placeholder="按名称或VMID搜索..." clearable style="width: 250px;" @input="applySearchFilter"></el-input>
    </div>

    <el-table :data="filteredContainers" style="width: 100%;" v-loading="loading" empty-text="沒有找到容器" row-key="vmid" stripe border>
      <el-table-column prop="vmid" label="VMID" width="90" sortable />
      <el-table-column prop="name" label="名称" sortable min-width="150"/>
      <el-table-column prop="status" label="状态" width="110" sortable align="center">
        <template #default="scope">
          <el-tag :type="getStatusTagType(scope.row.status)" effect="dark" round>
            {{ scope.row.status }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="node" label="节点" width="120" sortable />
      <el-table-column prop="cpu" label="CPU" width="100" sortable align="right">
        <template #default="scope">
          {{ (scope.row.cpu * 100).toFixed(1) }}%
        </template>
      </el-table-column>
      <el-table-column label="内存" width="180" sortable :sort-method="(a,b) => a.mem - b.mem" align="right">
         <template #default="scope">
          {{ formatBytes(scope.row.mem) }} / {{ formatBytes(scope.row.maxmem) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="380" fixed="right" align="center">
        <template #default="scope">
          <el-button-group size="small">
            <el-button @click="handleAction(scope.row, 'start')" :disabled="scope.row.status === 'running'" icon="VideoPlay" type="success" plain>启动</el-button>
            <el-button @click="handleAction(scope.row, 'shutdown')" :disabled="scope.row.status !== 'running'" icon="SwitchButton" type="warning" plain>关机</el-button>
            <el-button @click="handleAction(scope.row, 'stop')" :disabled="scope.row.status !== 'running'" icon="CircleClose" type="danger" plain>停止</el-button>
            <el-button @click="handleAction(scope.row, 'reboot')" :disabled="scope.row.status !== 'running'" icon="RefreshRight" plain>重启</el-button>
            <el-button @click="openConsole(scope.row)" icon="Monitor" type="info" plain>控制台</el-button>
          </el-button-group>
        </template>
      </el-table-column>
    </el-table>

     <el-dialog v-model="taskDialog.visible" :title="taskDialog.title" width="40%" :close-on-click-modal="false" :close-on-press-escape="false" :show-close="!taskDialog.running" draggable>
        <p>任务ID: {{ taskDialog.taskId }}</p>
        <p>状态: <el-tag :type="getTaskStatusType(taskDialog.status)" size="large">{{ taskDialog.statusText }}</el-tag></p>
        <p v-if="taskDialog.message">信息: {{ taskDialog.message }}</p>
        <template #footer>
          <el-button @click="taskDialog.visible = false" :disabled="taskDialog.running">关闭</el-button>
        </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed, reactive } from 'vue'
import apiService from '@/services/apiService'
import { useBackendStore } from '@/store/backendStore'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'

const backendStore = useBackendStore()
const router = useRouter()
const allContainers = ref([])
const nodes = ref([])
const selectedNode = ref(null)
const loading = ref(false)
const searchTerm = ref('')

const taskDialog = reactive({
    visible: false,
    title: '任务状态',
    taskId: null,
    status: null,
    statusText: '查询中...',
    message: '',
    running: false,
    intervalId: null
})

const filteredContainers = computed(() => {
  if (!searchTerm.value) {
    return allContainers.value
  }
  return allContainers.value.filter(c =>
    c.name.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
    c.vmid.toString().includes(searchTerm.value)
  )
})

const applySearchFilter = () => {
    // This function is mainly to trigger re-computation if needed,
    // or for more complex filtering logic in the future.
    // The computed property 'filteredContainers' handles the actual filtering.
}

const formatBytes = (bytes, decimals = 2) => {
    if (!bytes || bytes === 0 || typeof bytes !== 'number') return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

const getStatusTagType = (status) => {
  if (status === 'running') return 'success'
  if (status === 'stopped') return 'danger'
  return 'info'
}

const getTaskStatusType = (status) => {
    if (status === 'running') return 'primary'
    if (status === 'stopped') return 'success'
    if (status === 'error') return 'danger'
    return 'info'
}

const fetchNodes = async () => {
  if (!backendStore.activeBackend) return
  try {
    const response = await apiService.getNodes()
    if (response.data.success && response.data.data) {
      nodes.value = response.data.data
    } else {
      ElMessage.error(response.data.message || '获取节点列表失败')
      nodes.value = []
    }
  } catch (error) {
    nodes.value = []
    console.error("获取节点列表时发生错误:", error)
  }
}

const fetchContainers = async () => {
  if (!backendStore.activeBackend) {
    if(router.currentRoute.value.name === 'ContainerList') {
        ElMessage.info('请先选择并激活一个后端服务器。')
    }
    allContainers.value = []
    return
  }
  loading.value = true
  try {
    const response = await apiService.getContainers(selectedNode.value)
    if(response.data.containers && Array.isArray(response.data.containers)){
        allContainers.value = response.data.containers
    } else {
        allContainers.value = []
        if(response.data.message || response.data.error) {
            ElMessage.error(response.data.message || response.data.error || '获取容器数据格式不正确或失败')
        }
    }
  } catch (error) {
    allContainers.value = []
    console.error("获取容器列表时发生错误:", error)
  } finally {
    loading.value = false
  }
}

const fetchContainersAndNodes = async () => {
    await fetchNodes()
    await fetchContainers()
}


const pollTaskStatus = (node, taskId) => {
  if (taskDialog.intervalId) clearInterval(taskDialog.intervalId)
  taskDialog.running = true
  taskDialog.intervalId = setInterval(async () => {
    try {
      const response = await apiService.getTaskStatus(node, taskId)
      const pveTask = response.data.data
      taskDialog.status = pveTask.status
      taskDialog.statusText = `类型: ${pveTask.type || '未知'}, 状态: ${pveTask.status || '未知'}`
      if (pveTask.status === 'stopped') {
        clearInterval(taskDialog.intervalId)
        taskDialog.running = false
        taskDialog.statusText = `任务完成: ${pveTask.exitstatus === 'OK' ? '成功' : `失败 (${pveTask.exitstatus || '未知'})`}`
        taskDialog.message = pveTask.exitstatus !== 'OK' ? `错误: ${pveTask.exitstatus || '未知错误'}` : '操作成功！'
        ElMessage({
            message: taskDialog.message,
            type: pveTask.exitstatus === 'OK' ? 'success' : 'error',
            duration: 5000,
            showClose: true
        })
        fetchContainers()
      } else if (pveTask.status === 'error') {
        clearInterval(taskDialog.intervalId)
        taskDialog.running = false
        taskDialog.statusText = '任务出错'
        taskDialog.message = `错误: ${pveTask.exitstatus || '未知错误'}`
        ElMessage.error({message: taskDialog.message, duration: 5000, showClose: true})
      }
    } catch (error) {
      clearInterval(taskDialog.intervalId)
      taskDialog.running = false
      taskDialog.status = 'error'
      taskDialog.statusText = '查询任务状态失败'
      console.error("轮询任务状态时发生错误:", error)
    }
  }, 3000)
}


const handleAction = async (container, action) => {
  const actionMap = {
    start: { func: apiService.startContainer, name: '启动' },
    stop: { func: apiService.stopContainer, name: '停止' },
    shutdown: { func: apiService.shutdownContainer, name: '关机' },
    reboot: { func: apiService.rebootContainer, name: '重启' },
  }

  ElMessageBox.confirm(`确定要${actionMap[action].name}容器 ${container.name} (VMID: ${container.vmid})吗?`, '确认操作', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: action === 'stop' ? 'error' : 'warning',
    draggable: true,
  }).then(async () => {
    loading.value = true;
    try {
      const response = await actionMap[action].func(container.node, container.vmid)
      if (response.data.success && response.data.data && response.data.data.task_id) {
        ElMessage.success(`${actionMap[action].name}命令已发送。`)
        taskDialog.visible = true
        taskDialog.title = `容器 ${container.name} ${actionMap[action].name}任务`
        taskDialog.taskId = response.data.data.task_id
        taskDialog.status = 'running'
        taskDialog.statusText = '任务进行中...'
        taskDialog.message = ''
        pollTaskStatus(container.node, response.data.data.task_id)
      } else if (response.data.success) {
         ElMessage.success(response.data.message || `${actionMap[action].name}命令已发送，但未返回任务ID。`)
         fetchContainers()
      }
      else {
        ElMessage.error(response.data.message || `${actionMap[action].name}容器失败`)
      }
    } catch (error) {
      console.error(`执行 ${action} 操作时发生错误:`, error)
    } finally {
      loading.value = false
    }
  }).catch(() => {
    ElMessage.info('操作已取消')
  })
}

const openConsole = async (container) => {
  if (!backendStore.activeBackend) {
    ElMessage.error('请先选择后端服务器')
    return
  }
  loading.value = true
  try {
    const response = await apiService.getContainerConsoleTicket(container.node, container.vmid)
    if (response.data.success && response.data.data) {
      const consoleData = response.data.data
      
      localStorage.setItem('vncParams', JSON.stringify({
        host: consoleData.host,
        port: consoleData.port, 
        vncPort: consoleData.port,
        ticket: consoleData.ticket,
        node: consoleData.node,
        vmid: container.vmid,
        encrypt: true, 
        pveApiPort: 8006 
      }))
      
      const routeData = router.resolve({ name: 'ConsoleView', params: { node: container.node, vmid: container.vmid } });
      window.open(routeData.href, `_console_${container.node}_${container.vmid}`);

    } else {
      ElMessage.error(response.data.message || '获取控制台票据失败')
    }
  } catch (error) {
    console.error("打开控制台时发生错误:", error)
  } finally {
      loading.value = false
  }
}

watch(() => backendStore.activeBackendId, (newId, oldId) => {
    nodes.value = []
    selectedNode.value = null
    allContainers.value = [] // 清空容器列表以避免显示旧数据
  if (newId) {
    fetchContainersAndNodes()
  }
}, { immediate: true })

onMounted(() => {
  if (backendStore.activeBackend) {
    fetchContainersAndNodes()
  } else if(router.currentRoute.value.name === 'ContainerList') {
     ElMessage.info('请先在“后端管理”页面配置并激活一个后端服务器。')
  }
})

</script>

<style scoped>
.page-container {
  padding: 20px;
  background-color: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,.1);
}
h2 {
  margin-bottom: 20px;
  font-size: 1.5em;
  color: #303133;
}
.toolbar {
  margin-bottom: 20px; 
  display: flex; 
  align-items: center; 
  gap: 10px;
  flex-wrap: wrap;
}
</style>
