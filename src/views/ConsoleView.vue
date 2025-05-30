<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { Terminal } from 'xterm'
import { AttachAddon } from 'xterm-addon-attach'
import { FitAddon } from 'xterm-addon-fit'
import apiService from '@/services/apiService'
import { ElMessage } from 'element-plus'
import { usePveNodesStore } from '@/store/pveNodesStore'

const route = useRoute()
const terminalEl = ref(null)
let term = null
let socket = null
let fitAddon = null

async function setupConsole() {
  const nodeNameFromRoute = route.params.node
  const vmid = route.params.vmid
  const pveNodesStore = usePveNodesStore()

  if (!terminalEl.value) {
    ElMessage.error('终端元素尚未加载')
    return
  }

  let pveNodeIpOrHostname = pveNodesStore.getNodeIp(nodeNameFromRoute)

  if (!pveNodeIpOrHostname) {
    ElMessage.info(`正在尝试获取节点 "${nodeNameFromRoute}" 的IP信息...`)
    await pveNodesStore.fetchNodes(true)
    pveNodeIpOrHostname = pveNodesStore.getNodeIp(nodeNameFromRoute)

    if (!pveNodeIpOrHostname) {
      ElMessage.warn(`无法从节点列表中获取节点 "${nodeNameFromRoute}" 的有效IP地址。将尝试使用节点名称 "${nodeNameFromRoute}" 直接连接。请确保该名称可被正确解析。`)
      pveNodeIpOrHostname = nodeNameFromRoute
    }
  }
  
  if (!pveNodeIpOrHostname) {
     ElMessage.error(`最终无法确定PVE节点 "${nodeNameFromRoute}" 的连接地址。`)
     return
  }
  
  try {
    const ticketResponse = await apiService.getContainerConsoleTicket(nodeNameFromRoute, vmid)

    if (!ticketResponse.data || !ticketResponse.data.success || !ticketResponse.data.data) {
      ElMessage.error(`获取控制台票据失败: ${ticketResponse.data?.message || '未知错误'}`)
      return
    }

    const ticketData = ticketResponse.data.data
    if (!ticketData.ticket || !ticketData.port || !ticketData.upid) {
        ElMessage.error('票据数据不完整，缺少票据、端口或UPID信息')
        return
    }
    
    const wsProtocol = 'wss:'
    const wsHost = pveNodeIpOrHostname
    const wsPort = ticketData.port
    const pveTicket = ticketData.ticket
    const pveUpid = ticketData.upid

    const websocketUrl = `${wsProtocol}//${wsHost}:${wsPort}/?vncticket=${encodeURIComponent(pveTicket)}&upid=${encodeURIComponent(pveUpid)}`
    
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
    
    socket = new WebSocket(websocketUrl)

    const attachAddon = new AttachAddon(socket)
    term.loadAddon(attachAddon)

    term.open(terminalEl.value)
    fitAddon.fit()
    term.focus()

    socket.onopen = () => {
        ElMessage.success(`已连接到节点 ${wsHost} 的控制台。`)
    }

    socket.onclose = (event) => {
      if (event.code !== 1000) {
        ElMessage.error(`控制台连接已断开 (代码: ${event.code})。`)
      } else {
        ElMessage.info('控制台连接已关闭。')
      }
      if (term) {
         term.write(`\r\n\x1b[31m连接已关闭 (代码: ${event.code}).\x1b[0m\r\n`)
      }
    }
    socket.onerror = () => {
      ElMessage.error('WebSocket 连接发生错误。详情请查看浏览器开发者控制台。')
      if (term) {
        term.write('\r\n\x1b[31mWebSocket 连接错误.\x1b[0m\r\n')
      }
    }

  } catch (error) {
    let errorMessage = error.message || '请检查后端API是否正确配置和运行'
    if (error.name === 'SecurityError' && (wsProtocol === 'wss:' || websocketUrl.startsWith('wss:'))) {
        errorMessage = 'WebSocket 安全连接失败。如果PVE使用自签名证书，您可能需要在浏览器中手动信任该证书，或确保PVE节点地址正确且证书有效。'
    }
    ElMessage.error(`无法连接到控制台: ${errorMessage}`)
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
