<template>
  <div>
    <h2>创建 LXC 容器</h2>
    <el-form :model="formData" ref="createFormRef" label-width="150px" style="max-width: 700px">
      <el-form-item label="目标节点" prop="node" :rules="[{ required: true, message: '请选择目标节点'}]">
        <el-select v-model="formData.node" placeholder="请选择节点" @change="handleNodeChange">
          <el-option v-for="item in availableNodes" :key="item.node" :label="item.node" :value="item.node"></el-option>
        </el-select>
      </el-form-item>

      <el-form-item label="VMID" prop="vmid" :rules="[{ required: true, message: '请输入VMID'}, { type: 'integer', message: 'VMID必须是数字'}]">
        <el-input-number v-model="formData.vmid" :min="100" placeholder="例如: 101"></el-input-number>
      </el-form-item>

      <el-form-item label="主机名" prop="hostname" :rules="[{ required: true, message: '请输入主机名'}]">
        <el-input v-model="formData.hostname" placeholder="例如: my-ct"></el-input>
      </el-form-item>

      <el-form-item label="密码" prop="password" :rules="[{ required: true, message: '请输入密码'}]">
        <el-input v-model="formData.password" type="password" show-password placeholder="容器 root 密码"></el-input>
      </el-form-item>

      <el-form-item label="操作系统模板" prop="ostemplate" :rules="[{ required: true, message: '请选择模板'}]">
        <el-select v-model="formData.ostemplate" placeholder="请选择或输入模板路径" :disabled="!formData.node" filterable allow-create>
          <el-option v-for="tpl in availableTemplates" :key="tpl.volid" :label="tpl.volid" :value="tpl.volid">
             <span>{{ tpl.volid }} ({{ (tpl.size / (1024*1024*1024)).toFixed(2) }} GB)</span>
          </el-option>
        </el-select>
      </el-form-item>

      <el-form-item label="存储池" prop="storage" :rules="[{ required: true, message: '请选择存储池'}]">
        <el-select v-model="formData.storage" placeholder="请选择存储池" :disabled="!formData.node">
           <el-option v-for="s in availableStorages" :key="s.storage" :label="`${s.storage} (${s.type}, ${ (s.avail / (1024*1024*1024)).toFixed(2)}GB可用)`" :value="s.storage"></el-option>
        </el-select>
      </el-form-item>

      <el-form-item label="磁盘大小 (GB)" prop="disk_size" :rules="[{ required: true, message: '请输入磁盘大小'}, { type: 'integer', message: '磁盘大小必须是数字'}]">
        <el-input-number v-model="formData.disk_size" :min="1" placeholder="例如: 8"></el-input-number>
      </el-form-item>

      <el-form-item label="CPU核心数" prop="cores" :rules="[{ required: true, message: '请输入核心数'}, { type: 'integer', message: '核心数必须是数字'}]">
        <el-input-number v-model="formData.cores" :min="1" :max="maxCpuPerNode" placeholder="例如: 1"></el-input-number>
      </el-form-item>

      <el-form-item label="内存 (MB)" prop="memory" :rules="[{ required: true, message: '请输入内存大小'}, { type: 'integer', message: '内存必须是数字'}]">
        <el-input-number v-model="formData.memory" :min="64" :step="64" placeholder="例如: 512"></el-input-number>
      </el-form-item>

       <el-form-item label="SWAP (MB)" prop="swap" :rules="[{ required: true, message: '请输入SWAP大小'}, { type: 'integer', message: 'SWAP必须是数字'}]">
        <el-input-number v-model="formData.swap" :min="0" :step="64" placeholder="例如: 512"></el-input-number>
      </el-form-item>

      <h4>网络配置 (eth0)</h4>
      <el-form-item label="桥接网卡" prop="network.bridge" :rules="[{ required: true, message: '请选择桥接网卡'}]">
         <el-select v-model="formData.network.bridge" placeholder="选择桥接网卡" :disabled="!formData.node">
            <el-option v-for="net in availableNetworks" :key="net.iface" :label="net.iface" :value="net.iface"></el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="IP配置" prop="network.ip" :rules="[{ required: true, message: '请输入IP配置'}]">
        <el-input v-model="formData.network.ip" placeholder="例如: dhcp 或 192.168.1.100/24"></el-input>
      </el-form-item>
      <el-form-item label="网关" prop="network.gw">
        <el-input v-model="formData.network.gw" placeholder="例如: 192.168.1.1 (可选)"></el-input>
      </el-form-item>
       <el-form-item label="VLAN标签" prop="network.vlan">
        <el-input-number v-model="formData.network.vlan" :min="1" placeholder="可选"></el-input-number>
      </el-form-item>

      <el-form-item label="创建后启动" prop="start">
        <el-switch v-model="formData.start"></el-switch>
      </el-form-item>
       <el-form-item label="非特权容器" prop="unprivileged">
        <el-switch v-model="formData.unprivileged"></el-switch>
      </el-form-item>

      <el-form-item>
        <el-button type="primary" @click="submitForm" :loading="loading">立即创建</el-button>
        <el-button @click="resetForm">重置</el-button>
      </el-form-item>
    </el-form>
     <el-dialog v-model="taskDialog.visible" :title="taskDialog.title" width="40%">
        <p>任务ID: {{ taskDialog.taskId }}</p>
        <p>状态: <el-tag :type="getTaskStatusType(taskDialog.status)">{{ taskDialog.statusText }}</el-tag></p>
        <p v-if="taskDialog.message">信息: {{ taskDialog.message }}</p>
        <template #footer>
          <el-button @click="taskDialog.visible = false" :disabled="taskDialog.running">关闭</el-button>
        </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import apiService from '@/services/apiService'
import { useBackendStore } from '@/store/backendStore'
import { ElMessage } from 'element-plus'

const backendStore = useBackendStore()
const createFormRef = ref(null)
const loading = ref(false)

const defaultNetwork = {
  name: 'eth0',
  bridge: '',
  ip: 'dhcp',
  gw: null,
  vlan: null,
  rate: null
}

const formData = reactive({
  node: '',
  vmid: null,
  hostname: '',
  password: '',
  ostemplate: '',
  storage: '',
  disk_size: 8,
  cores: 1,
  cpulimit: null,
  memory: 512,
  swap: 512,
  network: { ...defaultNetwork },
  nesting: false,
  unprivileged: true,
  start: false,
  features: null,
  console_mode: "默认 (tty)"
})

const availableNodes = ref([])
const availableTemplates = ref([])
const availableStorages = ref([])
const availableNetworks = ref([])
const maxCpuPerNode = ref(1)

const taskDialog = reactive({
    visible: false,
    title: '任务状态',
    taskId: null,
    status: null,
    statusText: '查询中...',
    message: '',
    running: false,
    intervalId: null
})

const fetchInitialData = async () => {
  if (!backendStore.activeBackend) {
    ElMessage.warning('请先选择一个活动的后端服务器。')
    return
  }
  try {
    const nodesResponse = await apiService.getNodes()
    if (nodesResponse.data.success) {
      availableNodes.value = nodesResponse.data.data
    } else {
      ElMessage.error(nodesResponse.data.message || '获取节点列表失败')
    }
  } catch (error) {
    console.error(error)
  }
}

const handleNodeChange = async (selectedNode) => {
  if (!selectedNode) {
    availableTemplates.value = []
    availableStorages.value = []
    availableNetworks.value = []
    maxCpuPerNode.value = 1
    return
  }
  formData.ostemplate = ''
  formData.storage = ''
  formData.network.bridge = ''

  const nodeDetails = availableNodes.value.find(n => n.node === selectedNode)
  if (nodeDetails) {
      maxCpuPerNode.value = nodeDetails.maxcpu || 1
  }


  try {
    loading.value = true
    const [tplResponse, storageResponse, netResponse] = await Promise.all([
      apiService.getNodeTemplates(selectedNode),
      apiService.getNodeStorages(selectedNode),
      apiService.getNodeNetworks(selectedNode)
    ])

    if (tplResponse.data.success) {
      availableTemplates.value = tplResponse.data.data
    } else {
      ElMessage.error(tplResponse.data.message || '获取模板失败')
    }
    if (storageResponse.data.success) {
      availableStorages.value = storageResponse.data.data.filter(s => s.type !== 'dir' || s.content.includes('rootdir'))
    } else {
      ElMessage.error(storageResponse.data.message || '获取存储失败')
    }
     if (netResponse.data.success) {
      availableNetworks.value = netResponse.data.data
      if (availableNetworks.value.length > 0) {
        formData.network.bridge = availableNetworks.value[0].iface
      }
    } else {
      ElMessage.error(netResponse.data.message || '获取网络失败')
    }

  } catch (error) {
    console.error(error)
  } finally {
      loading.value = false
  }
}

const pollTaskStatus = (node, taskId) => {
  taskDialog.running = true
  taskDialog.intervalId = setInterval(async () => {
    try {
      const response = await apiService.getTaskStatus(node, taskId)
      const pveTask = response.data.data
      taskDialog.status = pveTask.status
      taskDialog.statusText = `类型: ${pveTask.type}, 状态: ${pveTask.status}`
      if (pveTask.status === 'stopped') {
        clearInterval(taskDialog.intervalId)
        taskDialog.running = false
        taskDialog.statusText = `任务完成: ${pveTask.exitstatus === 'OK' ? '成功' : `失败 (${pveTask.exitstatus})`}`
        taskDialog.message = pveTask.exitstatus !== 'OK' ? `错误: ${pveTask.exitstatus}` : '容器创建成功！'
        ElMessage({
            message: taskDialog.message,
            type: pveTask.exitstatus === 'OK' ? 'success' : 'error',
        })
      } else if (pveTask.status === 'error') {
        clearInterval(taskDialog.intervalId)
        taskDialog.running = false
        taskDialog.statusText = '任务出错'
        taskDialog.message = `错误: ${pveTask.exitstatus || '未知错误'}`
         ElMessage.error(taskDialog.message)
      }
    } catch (error) {
      clearInterval(taskDialog.intervalId)
      taskDialog.running = false
      taskDialog.status = 'error'
      taskDialog.statusText = '查询任务状态失败'
      console.error(error)
    }
  }, 2000)
}

const submitForm = () => {
  createFormRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true
      try {
        const response = await apiService.createContainer(formData)
        if (response.data.success && response.data.data && response.data.data.task_id) {
          ElMessage.success('创建容器任务已启动。')
          taskDialog.visible = true
          taskDialog.title = `容器 ${formData.hostname} 创建任务`
          taskDialog.taskId = response.data.data.task_id
          taskDialog.status = 'running'
          taskDialog.statusText = '任务进行中...'
          taskDialog.message = ''
          pollTaskStatus(formData.node, response.data.data.task_id)
          resetForm()
        } else {
          ElMessage.error(response.data.message || '创建容器失败')
        }
      } catch (error) {
        console.error(error)
      } finally {
        loading.value = false
      }
    } else {
      ElMessage.error('请检查表单填写是否正确！')
      return false
    }
  })
}

const resetForm = () => {
  createFormRef.value.resetFields()
  formData.network = { ...defaultNetwork }
  formData.unprivileged = true
  formData.start = false
  formData.cpulimit = null
  formData.features = null
  formData.nesting = false
}

const getTaskStatusType = (status) => {
    if (status === 'running') return 'primary'
    if (status === 'stopped') return 'success'
    if (status === 'error') return 'danger'
    return 'info'
}


onMounted(() => {
  fetchInitialData()
  if (availableNodes.value.length > 0 && !formData.node) {
      formData.node = availableNodes.value[0].node
      handleNodeChange(formData.node)
  }
})

watch(() => backendStore.activeBackendId, () => {
    fetchInitialData()
    resetForm()
    availableNodes.value = []
    availableTemplates.value = []
    availableStorages.value = []
    availableNetworks.value = []
})

</script>

<style scoped>
h4 {
  margin-top: 20px;
  margin-bottom: 10px;
  font-size: 1.1em;
  color: #303133;
}
.el-form-item {
    margin-bottom: 18px;
}
</style>
