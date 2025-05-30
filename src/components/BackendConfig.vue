<template>
  <el-card shadow="never">
    <template #header>
      <div class="card-header">
        <span>配置新的后端服务器</span>
      </div>
    </template>

    <el-form :model="newBackend" label-width="120px" ref="formRef" label-position="right">
      <el-form-item label="后端名称" prop="name" :rules="[{ required: true, message: '请输入后端名称', trigger: 'blur' }]">
        <el-input v-model="newBackend.name" placeholder="例如: 主力 PVE 服务器"></el-input>
      </el-form-item>
      <el-form-item label="API 地址" prop="url" :rules="[{ required: true, message: '请输入 API 地址', trigger: 'blur' }, { type: 'url', message: '请输入有效的 URL (例如 http://host:port)', trigger: ['blur', 'change'] }]">
        <el-input v-model="newBackend.url" placeholder="例如: http://192.168.1.10:8000"></el-input>
      </el-form-item>
      <el-form-item label="API 密钥" prop="apiKey" :rules="[{ required: true, message: '请输入 API 密钥', trigger: 'blur' }]">
        <el-input v-model="newBackend.apiKey" type="password" show-password placeholder="pve-lxc-server 的全局 API 密钥"></el-input>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="handleAddBackend" icon="Plus">添加后端</el-button>
      </el-form-item>
    </el-form>

    <el-divider />

    <h4>已配置的后端列表</h4>
    <el-table :data="backendStore.backendList" style="width: 100%" empty-text="暂无后端配置" stripe border>
      <el-table-column prop="name" label="后端名称" width="180" />
      <el-table-column prop="url" label="API 地址" />
      <el-table-column label="活动状态" width="120" align="center">
        <template #default="scope">
          <el-tag :type="backendStore.activeBackendId === scope.row.id ? 'success' : 'info'" effect="dark" round>
            {{ backendStore.activeBackendId === scope.row.id ? '当前活动' : '未激活' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" align="center">
        <template #default="scope">
          <el-button-group size="small">
            <el-button
              type="success"
              @click="backendStore.setActiveBackend(scope.row.id)"
              :disabled="backendStore.activeBackendId === scope.row.id"
              plain
              icon="Check"
            >
              激活
            </el-button>
            <el-button
              type="danger"
              @click="confirmRemoveBackend(scope.row.id)"
              plain
              icon="Delete"
            >
              删除
            </el-button>
          </el-button-group>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useBackendStore } from '@/store/backendStore'
import { ElMessage, ElMessageBox } from 'element-plus'

const backendStore = useBackendStore()
const formRef = ref(null)

const newBackend = reactive({
  name: '',
  url: '',
  apiKey: ''
})

const handleAddBackend = () => {
  formRef.value.validate((valid) => {
    if (valid) {
      try {
        const parsedUrl = new URL(newBackend.url)
        if (!['http:', 'https:',].includes(parsedUrl.protocol)) {
            ElMessage.error('API 地址必须以 http:// 或 https:// 开头')
            return
        }
      } catch (e) {
        ElMessage.error('API 地址不是一个有效的 URL')
        return
      }
      backendStore.addBackend({ ...newBackend })
      newBackend.name = ''
      newBackend.url = ''
      newBackend.apiKey = ''
      formRef.value.resetFields()
      ElMessage.success('后端添加成功！')
    } else {
      ElMessage.error('请检查表单输入！')
      return false
    }
  })
}

const confirmRemoveBackend = (backendId) => {
  ElMessageBox.confirm(
    '确定要删除此后端配置吗？此操作无法撤销。',
    '确认删除',
    {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning',
      draggable: true,
    }
  )
  .then(() => {
    backendStore.removeBackend(backendId)
    ElMessage.success('后端配置已删除')
  })
  .catch(() => {
    ElMessage.info('已取消删除')
  })
}
</script>

<style scoped>
.card-header {
  font-weight: bold;
}
h4 {
  margin-top: 20px;
  margin-bottom: 10px;
  font-size: 1.1em;
}
.el-form-item {
    margin-bottom: 22px;
}
.el-divider {
    margin: 30px 0;
}
</style>
