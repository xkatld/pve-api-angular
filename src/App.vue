<template>
  <el-container style="height: 100vh;">
    <el-header style="background-color: #409EFF; color: white; display: flex; align-items: center;">
      <h3 style="margin: 0;">PVE LXC 网页管理界面</h3>
    </el-header>
    <el-container>
      <el-aside width="200px" style="background-color: #f4f4f5;">
        <el-menu :default-openeds="['1']" router :default-active="$route.path">
          <el-menu-item index="/manage-backends">
            <el-icon><Setting /></el-icon>
            <span>后端管理</span>
          </el-menu-item>
          <el-menu-item index="/containers">
            <el-icon><Cpu /></el-icon>
            <span>容器列表</span>
          </el-menu-item>
          <el-menu-item index="/create-container">
            <el-icon><Plus /></el-icon>
            <span>创建容器</span>
          </el-menu-item>
        </el-menu>
      </el-aside>
      <el-main style="padding: 0;">
        <router-view v-slot="{ Component }">
            <keep-alive>
                <component :is="Component" :key="$route.fullPath" v-if="$route.meta.keepAlive"/>
            </keep-alive>
            <component :is="Component" :key="$route.fullPath" v-if="!$route.meta.keepAlive"/>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
</script>

<style>
body {
  margin: 0;
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', '\\5FAE\\8F6F\\96C5\\9ED1', Arial, sans-serif;
}
.el-header {
  padding: 0 20px;
  line-height: 60px;
}
.el-aside .el-menu {
    height: calc(100vh - 60px);
    border-right: none;
}
.el-main {
    background-color: #eef0f3;
}
</style>
