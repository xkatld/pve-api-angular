<template>
  <div>
    <h2>后端服务器管理</h2>
    <p>在此页面添加、查看和管理您的 pve-lxc-server 后端实例。</p>
    <backend-config></backend-config>
  </div>
</template>

<script setup>
import BackendConfig from '@/components/BackendConfig.vue'
</script>

<style scoped>
div {
  padding: 20px;
}
h2 {
  margin-bottom: 10px;
}
p {
  margin-bottom: 20px;
  color: #606266;
}
</style>
