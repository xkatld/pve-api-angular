<template>
  <div>
    <h2>LXC 容器列表</h2>
    <el-button @click="fetchContainers" :loading="loading">刷新列表</el-button>
    <el-select v-model="selectedNode" placeholder="选择节点 (可选)" clearable @change="fetchContainers" style="margin-left: 10px;">
        <el-option v-for="node in nodes" :key="node.node" :label="node.node" :value="node.node" />
    </el-select>

    <el-table :data="containers" style="width: 100%; margin-top: 20px;" v-loading="loading">
      <el-table-column prop="vmid" label="VMID" width="80" />
      <el-table-column prop="name" label="名称" />
      <el-table-column prop="status" label="状态" width="100">
        <template #default="scope">
          <el-tag :type="scope.row.status === 'running' ? 'success' : 'danger'">
            {{ scope.row.status }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="node" label="节点" width="100" />
      <el-table-column prop="cpu" label="CPU 使用率" width="120">
        <template #default="scope">
          {{ (scope.row.cpu * 100).toFixed(2) }}%
        </template>
      </el-table-column>
      <el-table-column prop="mem" label="内存使用" width="180">
         <template #default="scope">
          {{ (scope.row.mem / (1024*1024)).toFixed(2) }} MB / {{ (scope.row.maxmem / (1024*1024)).toFixed(2) }} MB
        </template>
      </el-table-column>
      <el-table-column label="操作" width="280">
        <template #default="scope">
          <el-button size="small" @click="handleAction(scope.row, 'start')" :disabled="scope.row.status === 'running'">启动</el-button>
          <el-button size="small" type="warning" @click="handleAction(scope.row, 'shutdown')" :disabled="scope.row.status !== 'running'">关机</el-button>
          <el-button size="small" type="danger" @click="handleAction(scope.row, 'stop')" :disabled="scope.row.status !== 'running'">停止</el-button>
          <el-button size="small" @click="handleAction(scope.row, 'reboot')" :disabled="scope.row.status !== 'running'">重启</el-button>
        </template>
      </el-table-column>
    </el-table>
     <p v-if="!loading && containers.length === 0">没有找到容器。</p>
     <el-dialog v-model="taskDialogVisible" title="任务进行中" width="30%">
        <p>任务ID: {{ currentTaskId }}</p>
        <p>状态: {{ taskStatus || '查询中...' }}</p>
        <template #footer>
          <el-button @click="taskDialogVisible = false">关闭</el-button>
        </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import apiService from '@/services/apiService'
import { useBackendStore } from '@/store/backendStore'
import { ElMessage, ElMessageBox } from 'element-plus'

const backendStore = useBackendStore()
const containers = ref([])
const nodes = ref([])
const selectedNode = ref(null)
const loading = ref(false)
const taskDialogVisible = ref(false)
const currentTaskId = ref(null)
const taskStatus = ref(null)
let taskInterval = null

const fetchNodes = async () => {
  if (!backendStore.activeBackend) return
  try {
    const response = await apiService.getNodes()
    if (response.data.success) {
      nodes.value = response.data.data
    } else {
      ElMessage.error(response.data.message || '获取节点列表失败')
    }
  } catch (error) {
    console.error(error)
  }
}

const fetchContainers = async () => {
  if (!backendStore.activeBackend) {
    ElMessage.info('请先选择一个活动的后端服务器。')
    containers.value = []
    return
  }
  loading.value = true
  try {
    const response = await apiService.getContainers(selectedNode.value)
    containers.value = response.data.containers
  } catch (error) {
    containers.value = []
    console.error(error)
  } finally {
    loading.value = false
  }
}

const pollTaskStatus = async (node, taskId) => {
  if (taskInterval) clearInterval(taskInterval)
  taskStatus.value = '查询中...'
  taskInterval = setInterval(async () => {
    try {
      const response = await apiService.getTaskStatus(node, taskId)
      const pveTask = response.data.data
      taskStatus.value = `类型: ${pveTask.type}, 状态: ${pveTask.status}`
      if (pveTask.status === 'stopped') {
        clearInterval(taskInterval)
        taskStatus.value = `任务完成: ${pveTask.exitstatus === 'OK' ? '成功' : `失败 (${pveTask.exitstatus})`}`
        ElMessage.success('操作完成！')
        fetchContainers()
         setTimeout(() => { taskDialogVisible.value = false }, 2000)
      }
    } catch (error) {
      clearInterval(taskInterval)
      taskStatus.value = '查询任务状态失败'
      console.error(error)
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
    type: 'warning',
  }).then(async () => {
    loading.value = true;
    try {
      const response = await actionMap[action].func(container.node, container.vmid)
      if (response.data.success && response.data.data && response.data.data.task_id) {
        ElMessage.success(`${actionMap[action].name}命令已发送。任务ID: ${response.data.data.task_id}`)
        currentTaskId.value = response.data.data.task_id
        taskDialogVisible.value = true
        pollTaskStatus(container.node, response.data.data.task_id)
      } else if (response.data.success) {
         ElMessage.success(response.data.message || `${actionMap[action].name}命令已发送，但未返回任务ID。`)
         fetchContainers()
      }
      else {
        ElMessage.error(response.data.message || `${actionMap[action].name}容器失败`)
      }
    } catch (error) {
      console.error(error)
    } finally {
      loading.value = false
    }
  }).catch(() => {
    ElMessage.info('操作已取消')
  })
}

watch(() => backendStore.activeBackendId, (newId, oldId) => {
  if (newId !== oldId || !containers.value.length) {
      nodes.value = []
      selectedNode.value = null
      fetchNodes()
      fetchContainers()
  }
}, { immediate: true })

onMounted(() => {
  if (backendStore.activeBackend) {
    fetchNodes()
    fetchContainers()
  }
})

</script>
