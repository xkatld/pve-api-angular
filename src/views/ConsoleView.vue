<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { Terminal } from 'xterm'
import { AttachAddon } from 'xterm-addon-attach'
import { FitAddon } from 'xterm-addon-fit'
import apiService from '@/services/apiService'
import { ElMessage } from 'element-plus'

const route = useRoute()
const terminalEl = ref(null)
let term = null
let socket = null
let fitAddon = null

async function setupConsole() {
  const node = route.params.node
  const vmid = route.params.vmid

  if (!terminalEl.value) {
    ElMessage.error('终端元素尚未加载')
    return
  }

  try {
    const response = await apiService.getContainerConsoleTicket(node, vmid)

    if (!response.data || !response.data.success || !response.data.data) {
      ElMessage.error(`获取控制台票据失败: ${response.data?.message || '未知错误'}`)
      return
    }

    const ticketData = response.data.data
    if (!ticketData.ticket || !ticketData.port) {
        ElMessage.error('票据数据不完整，缺少票据或端口信息')
        return
    }
    
    const wsProtocol = 'wss:'
    const wsHost = node
    const wsPort = ticketData.port
    const pveTicket = ticketData.ticket

    const websocketUrl = `${wsProtocol}//${wsHost}:${wsPort}/`
    
    term = new Terminal({
      cursorBlink: true,
      convertEol: true,
      fontFamily: "Consolas, 'Courier New', monospace",
      fontSize: 14,
      rows: 30,
      theme: {
        background: '#202020',
        foreground: '#f0f0f0',
      }
    })

    fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    
    socket = new WebSocket(websocketUrl, [pveTicket])

    const attachAddon = new AttachAddon(socket)
    term.loadAddon(attachAddon)

    term.open(terminalEl.value)
    fitAddon.fit()
    term.focus()

    socket.onclose = (event) => {
      if (event.code !== 1000) {
        ElMessage.error(`控制台连接已断开 (代码: ${event.code}). 请检查PVE节点 "${wsHost}" 是否可访问，端口 ${wsPort} 是否开放，或网络连接。`)
      } else {
        ElMessage.info('控制台连接已关闭。')
      }
      if (term) {
         term.write('\r\n\x1b[31m连接已关闭.\x1b[0m\r\n')
      }
    }
    socket.onerror = (error) => {
      ElMessage.error('WebSocket 连接发生错误。请检查浏览器控制台获取更多信息。')
      if (term) {
        term.write('\r\n\x1b[31mWebSocket 连接错误.\x1b[0m\r\n')
      }
    }

  } catch (error) {
    ElMessage.error(`无法连接到控制台: ${error.message || '请检查后端API是否正确配置和运行'}`)
  }
}

onMounted(() => {
  nextTick(() => {
      setupConsole()
  })
  window.addEventListener('resize', () => {
    if (fitAddon) {
      fitAddon.fit()
    }
  })
})

onBeforeUnmount(() => {
  if (socket) {
    socket.close(1000)
  }
  if (term) {
    term.dispose()
  }
  window.removeEventListener('resize', () => {
    if (fitAddon) {
      fitAddon.fit()
    }
  })
})
</script>

<template>
  <div class="console-container">
    <div ref="terminalEl" class="terminal-instance"></div>
  </div>
</template>

<style scoped>
.console-container {
  width: 100%;
  height: calc(100vh - 60px);
  padding: 5px;
  background-color: #202020;
  box-sizing: border-box;
}
.terminal-instance {
  width: 100%;
  height: 100%;
}
</style>
