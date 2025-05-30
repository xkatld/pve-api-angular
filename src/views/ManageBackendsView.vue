<template>
  <div class="page-container">
    <h2>后端服务器管理</h2>
    <p class="page-description">在此页面添加、查看和管理您的 pve-lxc-server 后端实例。</p>
    <backend-config></backend-config>
  </div>
</template>

<script setup>
import BackendConfig from '@/components/BackendConfig.vue'
</script>

<style scoped>
.page-container {
  padding: 20px;
}
h2 {
  margin-bottom: 10px;
  font-size: 1.5em;
  color: #303133;
}
.page-description {
  margin-bottom: 20px;
  color: #606266;
  font-size: 0.9em;
}
</style>
