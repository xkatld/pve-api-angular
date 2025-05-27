<template>
  <div class="login-container">
    <el-card class="login-card">
      <template #header>
        <div class="card-header">
          <span>请输入 Proxmox API 密钥</span>
        </div>
      </template>
      <el-form @submit.prevent="handleLogin">
        <el-form-item label="API 密钥">
          <el-input
            v-model="apiKeyInput"
            type="password"
            placeholder="请输入您的全局 API 密钥"
            show-password
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" native-type="submit" :loading="loading">
            保存并进入
          </el-button>
        </el-form-item>
      </el-form>
       <el-alert title="请确保在后端 .env 文件中已设置 GLOBAL_API_KEY，并在此处输入相同的值。" type="info" show-icon :closable="false" />
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { ElMessage } from 'element-plus'

const apiKeyInput = ref('')
const loading = ref(false)
const router = useRouter()
const authStore = useAuthStore()

const handleLogin = () => {
  if (!apiKeyInput.value) {
    ElMessage.warning('请输入 API 密钥')
    return
  }
  loading.value = true
  authStore.setApiKey(apiKeyInput.value)
  loading.value = false
  ElMessage.success('API 密钥已保存')
  router.push('/')
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f0f2f5;
}
.login-card {
  width: 400px;
}
</style>
