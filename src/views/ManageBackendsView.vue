<script setup>
import { ref, reactive, computed } from 'vue'
import { useBackendStore } from '@/store/backendStore'
import { ElMessage, ElMessageBox } from 'element-plus'

const backendStore = useBackendStore()

const dialogVisible = ref(false)
const isEditing = ref(false)
const currentBackendId = ref(null)

const form = reactive({
  name: '',
  url: '',
  apiKey: '',
  pveNodes: [] 
})

const formRules = {
  name: [{ required: true, message: '请输入后端名称', trigger: 'blur' }],
  url: [{ required: true, message: '请输入后端API的URL', trigger: 'blur' }, { type: 'url', message: '请输入有效的URL', trigger: ['blur', 'change'] }],
  apiKey: [{ required: true, message: '请输入API密钥', trigger: 'blur' }],
  pveNodes: [{ 
    type: 'array', 
    validator: (rule, value, callback) => {
      if (!value || value.length === 0) {
        // 在此版本中，我们允许 pveNodes 为空，但您可以根据需要添加验证
        // callback(new Error('请至少添加一个PVE节点配置'))
        callback()
      } else {
        for (let item of value) {
          if (!item.name || !item.ip) {
            callback(new Error('每个PVE节点都必须填写名称和IP地址'))
            return
          }
        }
        callback()
      }
    }, 
    trigger: 'change' 
  }]
}

const backendFormRef = ref(null)

const activeBackendId = computed(() => backendStore.activeBackendId)

function addPveNode() {
  form.pveNodes.push({ name: '', ip: '', id: Date.now() })
}

function removePveNode(item) {
  const index = form.pveNodes.indexOf(item)
  if (index !== -1) {
    form.pveNodes.splice(index, 1)
  }
}

function openAddDialog() {
  isEditing.value = false
  currentBackendId.value = null
  form.name = `我的后端 #${backendStore.backendList.length + 1}`
  form.url = ''
  form.apiKey = ''
  form.pveNodes = [{ name: '', ip: '', id: Date.now() }]
  dialogVisible.value = true
  if (backendFormRef.value) {
    backendFormRef.value.resetFields()
     // 手动重置pveNodes的初始状态，因为resetFields可能不完美处理动态数组内的对象
    form.pveNodes = [{ name: '', ip: '', id: Date.now() }]
  }
}

function openEditDialog(backend) {
  isEditing.value = true
  currentBackendId.value = backend.id
  form.name = backend.name
  form.url = backend.url
  form.apiKey = backend.apiKey
  form.pveNodes = backend.pveNodes ? JSON.parse(JSON.stringify(backend.pveNodes.map(node => ({...node, id: node.id || Date.now()})))) : [{ name: '', ip: '', id: Date.now() }]
  dialogVisible.value = true
}

function handleDialogClose() {
  if (backendFormRef.value) {
    backendFormRef.value.clearValidate()
  }
  dialogVisible.value = false
}

async function submitForm() {
  if (!backendFormRef.value) return
  await backendFormRef.value.validate((valid) => {
    if (valid) {
      const backendData = {
        name: form.name,
        url: form.url.replace(/\/$/, ''),
        apiKey: form.apiKey,
        pveNodes: form.pveNodes.map(node => ({ name: node.name, ip: node.ip }))
      }
      if (isEditing.value && currentBackendId.value) {
        backendStore.updateBackend(currentBackendId.value, backendData)
        ElMessage.success('后端配置已更新')
      } else {
        backendStore.addBackend(backendData)
        ElMessage.success('新后端已添加')
      }
      handleDialogClose()
    } else {
      ElMessage.error('请检查表单输入项')
      return false
    }
  })
}

function deleteBackend(backendId) {
  ElMessageBox.confirm(
    '确定要删除此后端配置吗？此操作不可撤销。',
    '警告',
    {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning',
    }
  )
  .then(() => {
    backendStore.removeBackend(backendId)
    ElMessage.success('后端配置已删除')
  })
  .catch(() => {
    ElMessage.info('已取消删除')
  })
}

function setActive(backendId) {
  backendStore.setActiveBackend(backendId)
  ElMessage.success('活动后端已切换')
}

</script>

<template>
  <div class="backend-config-container">
    <el-button type="primary" @click="openAddDialog" icon="Plus" class="add-backend-button">
      添加后端服务
    </el-button>

    <el-dialog
      v-model="dialogVisible"
      :title="isEditing ? '编辑后端服务' : '添加新的后端服务'"
      width="600px"
      @close="handleDialogClose"
      draggable
      append-to-body
    >
      <el-form :model="form" :rules="formRules" ref="backendFormRef" label-width="120px" label-position="right">
        <el-form-item label="后端名称" prop="name">
          <el-input v-model="form.name" placeholder="例如：家庭PVE服务"></el-input>
        </el-form-item>
        <el-form-item label="API 服务 URL" prop="url">
          <el-input v-model="form.url" placeholder="例如：http://localhost:8000"></el-input>
        </el-form-item>
        <el-form-item label="API 密钥" prop="apiKey">
          <el-input v-model="form.apiKey" type="password" show-password placeholder="输入您的API密钥"></el-input>
        </el-form-item>

        <el-divider content-position="left">PVE 节点配置</el-divider>
        <p class="pve-nodes-description">
          为此API服务关联的PVE物理节点配置其名称和IP地址/主机名。控制台将尝试使用此IP地址连接。
          节点名称应与您在 LXC 相关操作中看到的节点名一致。
        </p>
        
        <div v-for="(pveNode, index) in form.pveNodes" :key="pveNode.id || index" class="pve-node-item">
          <el-row :gutter="10" align="middle">
            <el-col :span="10">
              <el-form-item 
                :label="`节点 ${index + 1} 名称`"
                :prop="`pveNodes.${index}.name`"
                :rules="{ required: true, message: '节点名称不能为空', trigger: 'blur' }"
                label-width="100px"
              >
                <el-input v-model="pveNode.name" placeholder="例如：pve1 或 node/pve1"></el-input>
              </el-form-item>
            </el-col>
            <el-col :span="10">
              <el-form-item 
                :label="`节点 ${index + 1} IP/主机名`"
                :prop="`pveNodes.${index}.ip`" 
                :rules="{ required: true, message: '节点IP/主机名不能为空', trigger: 'blur' }"
                label-width="130px"
              >
                <el-input v-model="pveNode.ip" placeholder="例如：192.168.1.100"></el-input>
              </el-form-item>
            </el-col>
            <el-col :span="4">
              <el-button type="danger" @click="removePveNode(pveNode)" icon="Delete" circle v-if="form.pveNodes.length > 0"></el-button>
            </el-col>
          </el-row>
        </div>
        <el-button @click="addPveNode" type="success" plain icon="Plus" class="add-pve-node-button">添加PVE节点</el-button>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handleDialogClose">取消</el-button>
          <el-button type="primary" @click="submitForm">
            {{ isEditing ? '保存更改' : '确认添加' }}
          </el-button>
        </span>
      </template>
    </el-dialog>

    <el-divider content-position="center" v-if="backendStore.backendList.length > 0">已配置的后端服务</el-divider>
    
    <div v-if="backendStore.backendList.length === 0" class="empty-state">
      <el-empty description="暂未配置任何后端服务。请点击上方按钮添加。"></el-empty>
    </div>

    <el-table :data="backendStore.backendList" style="width: 100%" v-else stripe border>
      <el-table-column prop="name" label="后端名称" width="180"></el-table-column>
      <el-table-column prop="url" label="API 服务 URL"></el-table-column>
      <el-table-column label="PVE 节点数" width="120" align="center">
        <template #default="scope">
          {{ scope.row.pveNodes ? scope.row.pveNodes.length : 0 }}
        </template>
      </el-table-column>
      <el-table-column label="状态" width="120" align="center">
        <template #default="scope">
          <el-tag v-if="scope.row.id === activeBackendId" type="success" effect="dark">当前活动</el-tag>
          <el-tag v-else type="info" effect="light">未激活</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="260" align="center">
        <template #default="scope">
          <el-button 
            size="small" 
            type="success" 
            @click="setActive(scope.row.id)" 
            :disabled="scope.row.id === activeBackendId"
            plain
          >
            设为活动
          </el-button>
          <el-button size="small" type="primary" @click="openEditDialog(scope.row)" icon="Edit" plain>编辑</el-button>
          <el-button size="small" type="danger" @click="deleteBackend(scope.row.id)" icon="Delete" plain>删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style scoped>
.backend-config-container {
  padding: 10px;
}
.add-backend-button {
  margin-bottom: 20px;
}
.pve-node-item {
  margin-bottom: 15px;
  padding: 10px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  background-color: #fafafa;
}
.add-pve-node-button {
  margin-top: 10px;
  width: 100%;
}
.pve-nodes-description {
  font-size: 0.85em;
  color: #909399;
  margin-bottom: 15px;
  line-height: 1.4;
}
.empty-state {
  margin-top: 30px;
}
.dialog-footer {
  text-align: right;
}
</style>
