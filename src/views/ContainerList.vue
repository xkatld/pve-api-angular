<template>
  <el-container class="common-layout">
    <el-header class="header">
      <div class="header-left">
        <img src="/vite.svg" alt="logo" class="logo" />
        <span class="title">Proxmox LXC 管理</span>
      </div>
      <div class="header-right">
        <el-dropdown @command="handleBackendChange">
          <el-button type="primary" plain>
            {{ authStore.activeBackend?.name || '选择后端' }}<el-icon class="el-icon--right"><arrow-down /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item
                v-for="backend in authStore.backends"
                :key="backend.id"
                :command="backend.id"
              >
                {{ backend.name }}
              </el-dropdown-item>
              <el-dropdown-item divided command="manageBackends">管理后端</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <el-button type="danger" :icon="SwitchButton" @click="logout" style="margin-left: 10px;">退出登录</el-button>
      </div>
    </el-header>

    <el-main class="main-content">
      <el-card class="box-card">
        <template #header>
          <div class="card-header">
            <span>LXC 容器列表</span>
            <el-button-group>
              <el-button type="primary" :icon="Plus" @click="goToCreate">创建容器</el-button>
              <el-button :icon="Refresh" @click="fetchContainers">刷新</el-button>
            </el-button-group>
          </div>
        </template>
        <el-table
          v-loading="loading"
          :data="containers"
          style="width: 100%"
          :row-class-name="tableRowClassName"
        >
          <el-table-column prop="vmid" label="VMID" width="80"></el-table-column>
          <el-table-column prop="name" label="名称"></el-table-column>
          <el-table-column prop="node" label="节点"></el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="scope">
              <el-tag :type="statusTagType(scope.row.status)">{{ scope.row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="CPU 使用" width="120">
            <template #default="scope">
              {{ scope.row.cpu_usage ? (scope.row.cpu_usage * 100).toFixed(2) + '%' : 'N/A' }}
            </template>
          </el-table-column>
          <el-table-column label="内存使用" width="120">
            <template #default="scope">
              {{ formatBytes(scope.row.mem_used) }} / {{ formatBytes(scope.row.mem_total) }}
            </template>
          </el-table-column>
          <el-table-column label="根磁盘使用" width="120">
            <template #default="scope">
              {{ formatBytes(scope.row.rootfs_used) }} / {{ formatBytes(scope.row.rootfs_total) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="300">
            <template #default="scope">
              <el-button-group>
                <el-button
                  type="primary"
                  :icon="VideoPlay"
                  size="small"
                  @click="startContainer(scope.row.node, scope.row.vmid)"
                  :disabled="scope.row.status === 'running'"
                  >启动</el-button
                >
                <el-button
                  type="warning"
                  :icon="SwitchFilled"
                  size="small"
                  @click="shutdownContainer(scope.row.node, scope.row.vmid)"
                  :disabled="scope.row.status !== 'running'"
                  >关机</el-button
                >
                <el-button
                  type="danger"
                  :icon="CircleCloseFilled"
                  size="small"
                  @click="stopContainer(scope.row.node, scope.row.vmid)"
                  :disabled="scope.row.status !== 'running'"
                  >停止</el-button
                >
                <el-button
                  type="info"
                  :icon="Refresh"
                  size="small"
                  @click="rebootContainer(scope.row.node, scope.row.vmid)"
                  :disabled="scope.row.status !== 'running'"
                  >重启</el-button
                >
                <el-button
                  type="danger"
                  :icon="Delete"
                  size="small"
                  @click="deleteContainer(scope.row.node, scope.row.vmid)"
                  >删除</el-button
                >
                <el-button
                  type="success"
                  :icon="Monitor"
                  size="small"
                  @click="openConsole(scope.row.node, scope.row.vmid)"
                  >控制台</el-button
                >
              </el-button-group>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </el-main>
  </el-container>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Refresh,
  Plus,
  VideoPlay,
  SwitchFilled,
  CircleCloseFilled,
  Delete,
  Monitor,
  SwitchButton,
  ArrowDown
} from '@element-plus/icons-vue'
import { useAuthStore } from '../stores/auth'
import {
  getContainersApi,
  startContainerApi,
  stopContainerApi,
  shutdownContainerApi,
  rebootContainerApi,
  deleteContainerApi
} from '../api/lxc'

const authStore = useAuthStore()
const router = useRouter()

const containers = ref([])
const loading = ref(false)
let refreshInterval = null

const fetchContainers = async () => {
  loading.value = true
  try {
    const data = await getContainersApi()
    containers.value = data.data
  } catch (error) {
    ElMessage.error(`获取容器列表失败: ${error.message}`)
  } finally {
    loading.value = false
  }
}

const statusTagType = (status) => {
  switch (status) {
    case 'running':
      return 'success'
    case 'stopped':
      return 'danger'
    case 'unknown':
      return 'info'
    default:
      return ''
  }
}

const formatBytes = (bytes) => {
  if (bytes === undefined || bytes === null) return 'N/A'
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  if (bytes === 0) return '0 B'
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)))
  return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i]
}

const tableRowClassName = ({ row }) => {
  if (row.status === 'stopped') {
    return 'stopped-row'
  }
  return ''
}

const executeAction = async (actionFn, node, vmid, successMsg, confirmMsg) => {
  if (confirmMsg) {
    try {
      await ElMessageBox.confirm(confirmMsg, '确认操作', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      })
    } catch {
      return
    }
  }

  try {
    await actionFn(node, vmid)
    ElMessage.success(successMsg)
    await fetchContainers()
  } catch (error) {
    ElMessage.error(`操作失败: ${error.message}`)
  }
}

const startContainer = (node, vmid) => {
  executeAction(startContainerApi, node, vmid, '容器启动成功', `确定要启动容器 VMID ${vmid} 吗？`)
}

const shutdownContainer = (node, vmid) => {
  executeAction(shutdownContainerApi, node, vmid, '容器关机成功', `确定要优雅关机容器 VMID ${vmid} 吗？`)
}

const stopContainer = (node, vmid) => {
  executeAction(stopContainerApi, node, vmid, '容器停止成功', `确定要强制停止容器 VMID ${vmid} 吗？`)
}

const rebootContainer = (node, vmid) => {
  executeAction(rebootContainerApi, node, vmid, '容器重启成功', `确定要重启容器 VMID ${vmid} 吗？`)
}

const deleteContainer = (node, vmid) => {
  executeAction(deleteContainerApi, node, vmid, '容器删除成功', `确定要删除容器 VMID ${vmid} 吗？此操作不可逆！`)
}

const openConsole = (node, vmid) => {
  if (!authStore.proxmoxVncBaseURL) {
    ElMessage.error('请在后端配置中设置Proxmox VNC基础地址')
    return
  }
  const url = `${authStore.proxmoxVncBaseURL}/?console=lxc&vmid=${vmid}&node=${node}&resize=1&novnc=1`
  window.open(url, '_blank')
}

const goToCreate = () => {
  router.push('/create')
}

const logout = () => {
  authStore.clearAuth()
  router.push('/config')
}

const handleBackendChange = (command) => {
  if (command === 'manageBackends') {
    router.push('/config')
  } else {
    authStore.setActiveBackend(command)
    fetchContainers()
  }
}

onMounted(() => {
  if (authStore.activeBackendId) {
    fetchContainers()
    refreshInterval = setInterval(fetchContainers, 15000)
  } else {
    router.push('/config')
  }
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
</script>

<style scoped>
.common-layout {
  min-height: 100vh;
  background-color: #f0f2f5;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  padding: 0 20px;
}

.header-left {
  display: flex;
  align-items: center;
}

.logo {
  height: 32px;
  margin-right: 10px;
}

.title {
  font-size: 20px;
  font-weight: bold;
  color: #333;
}

.main-content {
  padding: 20px;
}

.box-card {
  margin-bottom: 20px;
}

.table-row-container {
  height: 100%;
}

.el-table .stopped-row {
  --el-table-tr-bg-color: var(--el-color-info-light-9);
}
</style>
