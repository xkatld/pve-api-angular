<template>
  <el-container class="layout-container">
    <el-aside width="200px">
      <el-menu
        :default-active="activeMenu"
        class="el-menu-vertical"
        router
      >
        <div class="logo-container">
            PVE LXC 管理
        </div>
        <el-menu-item index="/">
          <el-icon><Monitor /></el-icon>
          <span>容器列表</span>
        </el-menu-item>
        <el-menu-item index="/create">
          <el-icon><Plus /></el-icon>
          <span>创建容器</span>
        </el-menu-item>
        </el-menu>
    </el-aside>
    <el-container>
      <el-header class="layout-header">
        <span>Proxmox LXC 管理仪表盘</span>
        <el-button type="danger" @click="logout" size="small">
            退出登录
        </el-button>
      </el-header>
      <el-main class="layout-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { ElMessageBox, ElMessage } from 'element-plus';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const activeMenu = computed(() => {
    return route.path;
});

const logout = async () => {
    try {
        await ElMessageBox.confirm('您确定要退出登录吗？', '提示', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning',
        });
        authStore.clearApiKey();
        router.push('/login');
        ElMessage.success('已成功退出登录');
    } catch (error) {
       if (error !== 'cancel') {
           ElMessage.info('已取消退出');
       }
    }
}
</script>

<style scoped>
.layout-container {
  height: 100vh;
}

.el-menu-vertical {
  height: 100%;
  border-right: none;
}

.logo-container {
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    font-weight: bold;
    background-color: #001529;
    color: #fff;
    border-bottom: 1px solid #001529;
}

.el-menu {
    background-color: #001529;
}
.el-menu-item {
    color: #bfcbd9;
}
.el-menu-item:hover {
    background-color: #000c17;
}
.el-menu-item.is-active {
    color: #409EFF;
    background-color: #182c4a;
}
.el-menu-item i {
    color: #bfcbd9;
}
.el-menu-item.is-active i {
    color: #409EFF;
}


.layout-header {
  background-color: #fff;
  color: #333;
  line-height: 60px;
  border-bottom: 1px solid #dcdfe6;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
}

.layout-main {
  padding: 20px;
  background-color: #f0f2f5;
}
</style>
