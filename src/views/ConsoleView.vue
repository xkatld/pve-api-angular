<template>
  <div class="console-view-container">
    <div id="xterm-header">
      <div class="xterm-status-bar">
        <div class="xterm-status-left">
          <span class="xterm-status-dot" :style="{ backgroundColor: connectionStatusColor }"></span>
          <span class="xterm-status-text">{{ connectionStatusText }}</span>
        </div>
        <div class="xterm-status-right">
          <el-button @click="reconnectConsole" size="small" :disabled="isConnecting || isConnected" icon="Refresh">重新连接</el-button>
          <el-button @click="disconnectConsole" size="small" type="danger" :disabled="!isConnected && !isConnecting" icon="CircleClose">断开</el-button>
        </div>
      </div>
    </div>
    <div id="xterm-container" ref="xtermContainerRef"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { Terminal } from 'xterm'
import { AttachAddon } from 'xterm-addon-attach'
import { FitAddon } from 'xterm-addon-fit'

const xtermContainerRef = ref(null)
let term = null
let ws = null
let fitAddon = null

const connectionStatusText = ref('准备连接...')
const connectionStatusColor = ref('#FFC107') 
const isConnecting = ref(false)
const isConnected = ref(false)

const updateStatus = (text, color, connected = false, connecting = false) => {
  connectionStatusText.value = text
  connectionStatusColor.value = color
  isConnected.value = connected
  isConnecting.value = connecting
}

const connectTerminal = () => {
  if (isConnecting.value || isConnected.value) {
    return
  }

  const vncParamsItem = localStorage.getItem('vncParams')
  if (!vncParamsItem) {
    updateStatus('错误：找不到连接参数。请从容器列表页重新打开控制台。', '#F44336')
    return
  }
  const vncParams = JSON.parse(vncParamsItem)

  if (!xtermContainerRef.value) {
    updateStatus('错误：终端容器未准备好。', '#F44336')
    return
  }
  
  updateStatus('正在连接...', '#2196F3', false, true)

  term = new Terminal({
    cursorBlink: true,
    rows: 30,
    cols: 100,
    fontSize: 14,
    fontFamily: 'Consolas, "Courier New", monospace, "Noto Sans Mono CJK SC"',
    theme: {
      background: '#1e1e1e',
      foreground: '#d4d4d4',
      cursor: '#d4d4d4',
      selectionBackground: '#555555',
      black: '#000000',
      red: '#cd3131',
      green: '#0dbc79',
      yellow: '#e5e510',
      blue: '#2472c8',
      magenta: '#bc3fbc',
      cyan: '#11a8cd',
      white: '#e5e5e5',
      brightBlack: '#666666',
      brightRed: '#f14c4c',
      brightGreen: '#23d18b',
      brightYellow: '#f5f543',
      brightBlue: '#3b8eea',
      brightMagenta: '#d670d6',
      brightCyan: '#29b8db',
      brightWhite: '#e5e5e5'
    },
    allowProposedApi: true, // 某些 addon 可能需要
    convertEol: true // 处理不同系统的换行符
  })

  fitAddon = new FitAddon()
  term.loadAddon(fitAddon)
  
  // 清空容器并打开终端
  while (xtermContainerRef.value.firstChild) {
    xtermContainerRef.value.removeChild(xtermContainerRef.value.firstChild);
  }
  term.open(xtermContainerRef.value)
  
  try {
    fitAddon.fit()
  } catch (e) {
    console.warn("FitAddon.fit() error on initial open:", e)
  }
  term.focus()


  const host = vncParams.host
  const pveApiPort = vncParams.pveApiPort
  const password = vncParams.ticket 
  const path = `api2/json/nodes/${vncParams.node}/lxc/${vncParams.vmid}/vncwebsocket?port=${vncParams.vncPort}&vncticket=${password}`
  const scheme = vncParams.encrypt ? 'wss' : 'ws'
  const url = `${scheme}://${host}:${pveApiPort}/${path}`

  console.log(`尝试连接WebSocket: ${url}`)

  try {
    ws = new WebSocket(url)
    const attachAddon = new AttachAddon(ws, { bidirectional: true }) // 启用双向数据流
    term.loadAddon(attachAddon)

    ws.onopen = () => {
      updateStatus('已连接', '#4CAF50', true, false)
      console.log('WebSocket已连接')
      term.focus()
      try {
        fitAddon.fit()
      } catch(e) {
        console.warn("FitAddon.fit() error on connect:", e)
      }
    }

    ws.onclose = (event) => {
      updateStatus(`已断开连接 ${event.code} ${event.reason || ''}`.trim(), '#FF9800', false, false)
      console.log('WebSocket已断开连接', event)
      if (term && !term.isDisposed) {
         term.writeln(`\r\n\x1b[31m连接已断开 (代码: ${event.code}${event.reason ? ', 原因: ' + event.reason : ''}).\x1b[0m`)
      }
    }

    ws.onerror = (errorEvent) => {
      updateStatus('连接错误', '#F44336', false, false)
      console.error('WebSocket错误事件:', errorEvent)
      if (term && !term.isDisposed) {
        term.writeln('\r\n\x1b[31m连接发生错误。\x1b[0m')
      }
    }

  } catch (error) {
    updateStatus('建立连接时发生代码错误', '#F44336', false, false)
    console.error("WebSocket连接代码错误:", error)
  }
}

const disconnectConsole = () => {
  if (ws) {
    ws.close()
    ws = null
  }
  if (term && !term.isDisposed) {
    term.dispose()
    term = null
  }
  updateStatus('已手动断开', '#757575', false, false)
}

const reconnectConsole = () => {
    if (isConnecting.value || isConnected.value) {
        return;
    }
    disconnectConsole(); 
    nextTick(() => { 
        connectTerminal();
    });
}

const handleResize = () => {
  if (fitAddon && term && term.element && term.element.parentElement && !term.isDisposed) {
      try {
        fitAddon.fit()
      } catch(e) {
        console.warn("FitAddon.fit() error on resize:", e)
      }
  }
}

onMounted(() => {
  nextTick(() => { // 确保 DOM 元素已准备好
    connectTerminal()
  })
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  disconnectConsole()
  localStorage.removeItem('vncParams')
  window.removeEventListener('resize', handleResize)
})

</script>

<style scoped>
.console-view-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #1e1e1e;
  overflow: hidden; /* 防止父级出现滚动条 */
}

#xterm-header {
  flex-shrink: 0;
  width: 100%;
}

.xterm-status-bar {
  background-color: #333;
  color: white;
  padding: 0 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9em;
  height: 35px;
  box-sizing: border-box;
}
.xterm-status-left {
  display: flex;
  align-items: center;
}
.xterm-status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-right: 8px;
  border: 1px solid #fff3;
}
.xterm-status-text {
  line-height: 1;
}
.xterm-status-right .el-button {
  margin-left: 8px;
}

#xterm-container {
  flex-grow: 1;
  padding: 5px 10px 10px 10px;
  overflow: hidden;
  width: 100%;
  height: calc(100% - 35px); /* 减去状态栏高度 */
  box-sizing: border-box;
}

:deep(.xterm) {
    height: 100% !important;
    width: 100% !important;
}
:deep(.xterm .xterm-viewport) {
    width: 100% !important; 
    overflow-y: scroll !important; /* 允许终端内部滚动 */
}
:deep(.xterm .xterm-screen) {
    width: 100% !important;
}
</style>
