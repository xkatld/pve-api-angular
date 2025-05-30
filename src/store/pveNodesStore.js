import { defineStore } from 'pinia'
import apiService from '@/services/apiService'
import { ElMessage } from 'element-plus'

export const usePveNodesStore = defineStore('pveNodes', {
  state: () => ({
    nodes: [],
    isLoading: false,
    error: null,
  }),
  getters: {
    getNodeByName: (state) => (nodeName) => {
      return state.nodes.find(node => node.node === nodeName)
    },
    getNodeIp: (state) => (nodeName) => {
      const node = state.nodes.find(n => n.node === nodeName)
      return node ? node.ip : null
    },
    allNodes: (state) => state.nodes,
  },
  actions: {
    async fetchNodes(forceRefresh = false) {
      if (this.nodes.length > 0 && !forceRefresh) {
        return
      }
      this.isLoading = true
      this.error = null
      try {
        const response = await apiService.getNodes()
        if (response.data && response.data.success && Array.isArray(response.data.data)) {
          this.nodes = response.data.data
        } else {
          this.nodes = []
          const message = `获取PVE节点列表失败: ${response.data?.message || '响应数据格式不正确'}`
          this.error = message
          ElMessage.error(message)
        }
      } catch (err) {
        this.nodes = []
        const message = `获取PVE节点列表时发生网络错误: ${err.message || '未知网络错误'}`
        this.error = message
        ElMessage.error(message)
      } finally {
        this.isLoading = false
      }
    },
    clearNodes() {
      this.nodes = []
      this.error = null
    }
  },
})
