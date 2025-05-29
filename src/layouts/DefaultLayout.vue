<template>
  <el-container class="main-layout">
    <el-header class="app-header">
      <div class="logo">
        <img src="/vite.svg" alt="Logo" />
        <span>Proxmox LXC 管理</span>
      </div>
      <div class="header-menu">
         <el-select
            v-model="activeBackendId"
            placeholder="选择后端"
            @change="switchBackend"
            size="small"
            style="margin-right: 20px; width: 200px;"
            v-if="authStore.backends.length > 1"
          >
            <el-option
              v-for="item in authStore.backends"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
          <span v-else-if="authStore.activeBackend" style="margin-right: 20px; font-size: 14px; color: #eee">
              {{ authStore.activeBackend.name }}
          </span>
         <el-button type="primary" :icon="Setting" circle @click="goToConfig" title="配置后端"></el-button>
         <el-button type="danger" :icon="SwitchButton" circle @click="logout" title="退出登录"></el-button>
      </div>
    </el-header>
    <el-container>
      <el-aside width="200px" class="app-aside">
        <el-menu
            :default-active="activeMenu"
            class="el-menu-vertical-demo"
            router
        >
          <el-menu-item index="/">
            <el-icon><List /></el-icon>
            <span>容器列表</span>
          </el-menu-item>
          <el-menu-item index="/create">
             <el-icon><Plus /></el-icon>
            <span>创建容器</span>
          </el-menu-item>
        </el-menu>
      </el-aside>
      <el-main class="app-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { ElMessage } from 'element-plus'
import { List, Plus, Setting, SwitchButton } from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const activeMenu = computed(() => route.path)
const activeBackendId = computed({
    get: () => authStore.activeBackendId,
    set: (val) => {}
})

const switchBackend = (id) => {
    authStore.setActiveBackend(id)
    ElMessage.success('后端已切换');
    router.go(0); // 刷新页面以重新加载数据
}

const goToConfig = () => {
    router.push({ name: 'BackendConfig' })
}

const logout = () => {
  authStore.clearAuth()
  ElMessage.success('已退出')
  router.push({ name: 'BackendConfig' })
}
</script>

<style scoped>
.main-layout, .el-container {
  height: 100vh;
}

.app-header {
  background-color: #337ecc;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
}

.logo {
  display: flex;
  align-items: center;
}

.logo img {
  width: 30px;
  height: 30px;
  margin-right: 10px;
}

.logo span {
  font-size: 20px;
  font-weight: bold;
}

.header-menu {
    display: flex;
    align-items: center;
}

.app-aside {
  background-color: #f4f4f5;
  border-right: 1px solid #e0e0e0;
}

.el-menu {
    border-right: none;
    background-color: transparent;
}

.app-main {
  background-color: #ffffff;
  padding: 20px;
}
</style>
