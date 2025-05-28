<template>
  <div class="backend-config-container">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <span>后端配置</span>
          <el-button type="primary" :icon="Plus" @click="showAddDialog = true">添加后端</el-button>
        </div>
      </template>

      <el-table :data="authStore.backends" style="width: 100%">
        <el-table-column prop="name" label="名称"></el-table-column>
        <el-table-column prop="baseURL" label="API 地址"></el-table-column>
        <el-table-column label="操作">
          <template #default="scope">
            <el-button
              link
              type="primary"
              size="small"
              @click="editBackend(scope.row)"
              >编辑</el-button
            >
            <el-button
              link
              type="danger"
              size="small"
              @click="deleteBackend(scope.row.id)"
              >删除</el-button
            >
            <el-button
              v-if="authStore.activeBackendId !== scope.row.id"
              link
              type="success"
              size="small"
              @click="authStore.setActiveBackend(scope.row.id)"
              >激活</el-button
            >
            <span v-else style="color: var(--el-color-success);"> (已激活) </span>
          </template>
        </el-table-column>
      </el-table>

      <div style="margin-top: 20px; text-align: right;">
        <el-button type="primary" @click="navigateToHome" :disabled="!authStore.activeBackendId">进入管理界面</el-button>
      </div>
    </el-card>

    <el-dialog
      v-model="showAddDialog"
      :title="editMode ? '编辑后端' : '添加后端'"
      width="500px"
      @close="resetForm"
    >
      <el-form :model="currentBackend" label-width="120px">
        <el-form-item label="后端名称">
          <el-input v-model="currentBackend.name" placeholder="例如: 我的Proxmox服务器"></el-input>
        </el-form-item>
        <el-form-item label="API 地址">
          <el-input v-model="currentBackend.baseURL" placeholder="例如: https://192.168.1.10:8000/api/v1"></el-input>
        </el-form-item>
        <el-form-item label="API 密钥">
          <el-input type="password" v-model="currentBackend.apiKey" placeholder="后端服务设置的API密钥"></el-input>
        </el-form-item>
        <el-form-item label="Proxmox VNC 地址">
          <el-input v-model="currentBackend.proxmoxVncBaseURL" placeholder="例如: https://192.168.1.100:8006"></el-input>
          <div style="font-size: 12px; color: #999;">用于生成控制台链接，只需Proxmox服务器IP和端口。</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showAddDialog = false">取消</el-button>
          <el-button type="primary" @click="saveBackend">保存</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'

const authStore = useAuthStore()
const router = useRouter()

const showAddDialog = ref(false)
const editMode = ref(false)
const currentBackend = reactive({
  id: null,
  name: '',
  baseURL: '',
  apiKey: '',
  proxmoxVncBaseURL: ''
})

const resetForm = () => {
  editMode.value = false
  currentBackend.id = null
  currentBackend.name = ''
  currentBackend.baseURL = ''
  currentBackend.apiKey = ''
  currentBackend.proxmoxVncBaseURL = ''
}

const editBackend = (backend) => {
  editMode.value = true
  Object.assign(currentBackend, backend)
  showAddDialog.value = true
}

const saveBackend = () => {
  if (!currentBackend.name || !currentBackend.baseURL || !currentBackend.apiKey || !currentBackend.proxmoxVncBaseURL) {
    ElMessage.error('请填写所有必填项')
    return
  }

  if (editMode.value) {
    authStore.updateBackend(currentBackend.id, currentBackend)
    ElMessage.success('后端信息更新成功')
  } else {
    authStore.addBackend({ ...currentBackend })
    ElMessage.success('后端添加成功')
  }
  showAddDialog.value = false
}

const deleteBackend = (id) => {
  ElMessageBox.confirm(
    '确定要删除此后端配置吗？',
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }
  ).then(() => {
    authStore.deleteBackend(id)
    ElMessage.success('后端删除成功')
  }).catch(() => {
    // 用户取消
  })
}

const navigateToHome = () => {
  if (authStore.activeBackendId) {
    router.push('/')
  } else {
    ElMessage.warning('请先选择一个激活的后端')
  }
}
</script>

<style scoped>
.backend-config-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f0f2f5;
}

.box-card {
  width: 90%;
  max-width: 800px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
