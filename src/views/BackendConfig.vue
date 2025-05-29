<template>
  <el-container class="backend-config-container">
    <el-header>
      <h1>Proxmox 后端配置</h1>
    </el-header>
    <el-main>
      <el-card class="box-card">
        <template #header>
          <div class="card-header">
            <span>后端列表</span>
            <el-button type="primary" :icon="Plus" @click="openAddDialog">添加后端</el-button>
          </div>
        </template>
        <el-table :data="authStore.backends" style="width: 100%">
          <el-table-column prop="name" label="名称" width="180" />
          <el-table-column prop="baseURL" label="API 地址" />
          <el-table-column prop="proxmoxVncBaseURL" label="PVE VNC 地址" />
          <el-table-column label="操作" width="250">
            <template #default="scope">
              <el-button
                size="small"
                type="success"
                :disabled="authStore.activeBackendId === scope.row.id"
                @click="setActive(scope.row.id)"
              >
                {{ authStore.activeBackendId === scope.row.id ? '当前激活' : '设为激活' }}
              </el-button>
               <el-button size="small" :icon="Edit" @click="openEditDialog(scope.row)"></el-button>
              <el-button
                size="small"
                type="danger"
                :icon="Delete"
                @click="deleteBackend(scope.row.id)"
              ></el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-alert v-if="authStore.backends.length === 0" title="请至少添加并激活一个后端配置才能继续使用。" type="warning" show-icon :closable="false" />

         <el-button
            v-if="authStore.activeBackendId"
            type="primary"
            style="margin-top: 20px;"
            @click="goToApp"
          >
            进入管理界面
          </el-button>
      </el-card>

      <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑后端' : '添加后端'" width="500px">
        <el-form :model="form" ref="formRef" :rules="rules" label-width="120px">
          <el-form-item label="后端名称" prop="name">
            <el-input v-model="form.name" placeholder="例如：我的 PVE 服务器"></el-input>
          </el-form-item>
          <el-form-item label="API 地址" prop="baseURL">
            <el-input v-model="form.baseURL" placeholder="例如：https://192.168.1.10:8000/api/v1"></el-input>
             <div class="el-form-item__tip">后端 API 服务的完整 URL。</div>
          </el-form-item>
          <el-form-item label="API 密钥" prop="apiKey">
            <el-input v-model="form.apiKey" type="password" show-password placeholder="请输入后端配置的 API 密钥"></el-input>
          </el-form-item>
           <el-form-item label="PVE VNC 地址" prop="proxmoxVncBaseURL">
            <el-input v-model="form.proxmoxVncBaseURL" placeholder="例如：https://192.168.1.100:8006"></el-input>
            <div class="el-form-item__tip">Proxmox VE 服务器的 Web 界面地址，用于打开控制台。</div>
          </el-form-item>
        </el-form>
        <template #footer>
          <span class="dialog-footer">
            <el-button @click="dialogVisible = false">取消</el-button>
            <el-button type="primary" @click="saveBackend">保存</el-button>
          </span>
        </template>
      </el-dialog>
    </el-main>
  </el-container>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, Delete } from '@element-plus/icons-vue'

const authStore = useAuthStore()
const router = useRouter()
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref(null)
const form = reactive({
  id: null,
  name: '',
  baseURL: '',
  apiKey: '',
  proxmoxVncBaseURL: '',
})

const rules = {
  name: [{ required: true, message: '请输入后端名称', trigger: 'blur' }],
  baseURL: [{ required: true, message: '请输入 API 地址', trigger: 'blur' }, { type: 'url', message: '请输入有效的 URL', trigger: 'blur' }],
  apiKey: [{ required: true, message: '请输入 API 密钥', trigger: 'blur' }],
  proxmoxVncBaseURL: [{ required: true, message: '请输入 PVE VNC 地址', trigger: 'blur' }, { type: 'url', message: '请输入有效的 URL', trigger: 'blur' }],
}

const resetForm = () => {
    form.id = null;
    form.name = '';
    form.baseURL = '';
    form.apiKey = '';
    form.proxmoxVncBaseURL = '';
    isEdit.value = false;
    if (formRef.value) {
        formRef.value.clearValidate();
    }
}

const openAddDialog = () => {
    resetForm();
    dialogVisible.value = true;
}

const openEditDialog = (backend) => {
    resetForm();
    isEdit.value = true;
    Object.assign(form, backend);
    dialogVisible.value = true;
}

const saveBackend = async () => {
  if (!formRef.value) return
  await formRef.value.validate((valid) => {
    if (valid) {
      const backendData = {
          name: form.name,
          baseURL: form.baseURL.endsWith('/') ? form.baseURL.slice(0, -1) : form.baseURL,
          apiKey: form.apiKey,
          proxmoxVncBaseURL: form.proxmoxVncBaseURL.endsWith('/') ? form.proxmoxVncBaseURL.slice(0, -1) : form.proxmoxVncBaseURL,
      };

      if (isEdit.value && form.id) {
          authStore.updateBackend(form.id, backendData);
          ElMessage.success('后端配置已更新');
      } else {
          authStore.addBackend(backendData);
          ElMessage.success('后端配置已添加');
      }
      dialogVisible.value = false;
    } else {
      ElMessage.error('请检查表单输入');
      return false;
    }
  })
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
      authStore.deleteBackend(id);
      ElMessage.success('后端配置已删除');
  }).catch(() => {
      ElMessage.info('已取消删除');
  });
}

const setActive = (id) => {
    authStore.setActiveBackend(id);
    ElMessage.success('后端已切换');
    goToApp();
}

const goToApp = () => {
    router.push({ name: 'ContainerList' });
}

</script>

<style scoped>
.backend-config-container {
  max-width: 1000px;
  margin: 40px auto;
  padding: 20px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.el-form-item__tip {
  font-size: 12px;
  color: #999;
  line-height: 1.5;
}
</style>
