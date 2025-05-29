<template>
  <el-card class="box-card">
    <template #header>
      <div class="card-header">
        <span>创建 LXC 容器</span>
      </div>
    </template>
    <el-form :model="form" ref="formRef" :rules="rules" label-width="150px" v-loading="loading.page">
        <el-divider content-position="left">基础配置</el-divider>
        <el-row :gutter="20">
            <el-col :span="12">
                 <el-form-item label="Proxmox 节点" prop="node">
                    <el-select v-model="form.node" placeholder="请选择节点" @change="handleNodeChange" :loading="loading.nodes" style="width: 100%;">
                    <el-option v-for="item in resources.nodes" :key="item.node" :label="`${item.node} (${item.status})`" :value="item.node" />
                    </el-select>
                </el-form-item>
            </el-col>
             <el-col :span="12">
                 <el-form-item label="VMID" prop="vmid">
                    <el-input-number v-model="form.vmid" :min="100" placeholder="请输入 VMID"></el-input-number>
                </el-form-item>
             </el-col>
        </el-row>
        <el-row :gutter="20">
            <el-col :span="12">
                <el-form-item label="主机名" prop="hostname">
                    <el-input v-model="form.hostname" placeholder="请输入容器主机名"></el-input>
                </el-form-item>
            </el-col>
             <el-col :span="12">
                <el-form-item label="Root 密码" prop="password">
                    <el-input v-model="form.password" type="password" show-password placeholder="请输入 root 密码"></el-input>
                </el-form-item>
            </el-col>
        </el-row>

        <el-divider content-position="left">系统与存储</el-divider>
        <el-row :gutter="20">
             <el-col :span="12">
                 <el-form-item label="CT 模板" prop="ostemplate">
                    <el-select v-model="form.ostemplate" placeholder="请选择 CT 模板" :loading="loading.templates" :disabled="!form.node" filterable style="width: 100%;">
                    <el-option v-for="item in resources.templates" :key="item.volid" :label="item.volid.split('/')[1]" :value="item.volid" />
                    </el-select>
                </el-form-item>
            </el-col>
             <el-col :span="12">
                <el-form-item label="根磁盘存储" prop="storage">
                    <el-select v-model="form.storage" placeholder="请选择存储" :loading="loading.storages" :disabled="!form.node" style="width: 100%;">
                    <el-option v-for="item in resources.storages" :key="item.storage" :label="`${item.storage} (${formatStorageType(item.type)}, 可用: ${formatBytes(item.avail)})`" :value="item.storage" />
                    </el-select>
                </el-form-item>
            </el-col>
        </el-row>
         <el-form-item label="磁盘大小 (GB)" prop="disk_size">
            <el-input-number v-model="form.disk_size" :min="1" placeholder="例如：8"></el-input-number>
        </el-form-item>

        <el-divider content-position="left">CPU 与内存</el-divider>
         <el-row :gutter="20">
            <el-col :span="12">
                <el-form-item label="CPU 核心数" prop="cores">
                    <el-input-number v-model="form.cores" :min="1" placeholder="例如：1"></el-input-number>
                </el-form-item>
            </el-col>
             <el-col :span="12">
                <el-form-item label="内存 (MB)" prop="memory">
                    <el-input-number v-model="form.memory" :min="64" :step="64" placeholder="例如：512"></el-input-number>
                </el-form-item>
            </el-col>
        </el-row>
        <el-row :gutter="20">
            <el-col :span="12">
                <el-form-item label="SWAP (MB)" prop="swap">
                    <el-input-number v-model="form.swap" :min="0" :step="64" placeholder="例如：512"></el-input-number>
                </el-form-item>
            </el-col>
        </el-row>

       <el-divider content-position="left">网络配置 (eth0)</el-divider>
        <el-row :gutter="20">
            <el-col :span="12">
                <el-form-item label="网络桥接" prop="network.bridge">
                     <el-select v-model="form.network.bridge" placeholder="请选择网络桥接" :loading="loading.networks" :disabled="!form.node" style="width: 100%;">
                    <el-option v-for="item in resources.networks" :key="item.iface" :label="item.iface" :value="item.iface" />
                    </el-select>
                </el-form-item>
            </el-col>
            <el-col :span="12">
                 <el-form-item label="IP 配置方式" prop="ipType">
                    <el-radio-group v-model="ipType">
                        <el-radio label="dhcp">DHCP</el-radio>
                        <el-radio label="static">静态 IP</el-radio>
                    </el-radio-group>
                </el-form-item>
            </el-col>
        </el-row>
       <el-row :gutter="20" v-if="ipType === 'static'">
            <el-col :span="12">
                 <el-form-item label="IP 地址/CIDR" prop="network.ip">
                    <el-input v-model="form.network.ip" placeholder="例如：192.168.1.100/24"></el-input>
                </el-form-item>
            </el-col>
            <el-col :span="12">
                <el-form-item label="网关" prop="network.gw">
                    <el-input v-model="form.network.gw" placeholder="例如：192.168.1.1"></el-input>
                </el-form-item>
            </el-col>
        </el-row>
        <el-form-item label="VLAN 标签" prop="network.vlan">
            <el-input-number v-model="form.network.vlan" :min="1" placeholder="可选"></el-input-number>
        </el-form-item>

        <el-divider content-position="left">高级选项</el-divider>
        <el-form-item label="">
             <el-checkbox v-model="form.unprivileged">非特权容器</el-checkbox>
             <el-checkbox v-model="form.nesting">启用嵌套</el-checkbox>
             <el-checkbox v-model="form.start">创建后启动</el-checkbox>
        </el-form-item>


      <el-form-item>
        <el-button type="primary" @click="submitForm" :loading="loading.submit">立即创建</el-button>
        <el-button @click="resetForm">重置表单</el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  getNodesApi,
  getNodeTemplatesApi,
  getNodeStoragesApi,
  getNodeNetworksApi,
  createContainerApi,
  getTaskStatusApi
} from '../api/lxc'
import { ElMessage, ElNotification } from 'element-plus'

const router = useRouter()
const formRef = ref(null)
const ipType = ref('dhcp')

const form = reactive({
  node: '',
  vmid: 100,
  hostname: '',
  password: '',
  ostemplate: '',
  storage: '',
  disk_size: 8,
  cores: 1,
  memory: 512,
  swap: 512,
  network: {
    name: 'eth0',
    bridge: 'vmbr0',
    ip: '',
    gw: '',
    vlan: null,
  },
  nesting: false,
  unprivileged: true,
  start: false,
})

const loading = reactive({
    page: false,
    nodes: false,
    templates: false,
    storages: false,
    networks: false,
    submit: false,
})

const resources = reactive({
    nodes: [],
    templates: [],
    storages: [],
    networks: [],
})

const rules = {
  node: [{ required: true, message: '请选择 Proxmox 节点', trigger: 'change' }],
  vmid: [{ required: true, message: '请输入 VMID', trigger: 'blur' }],
  hostname: [{ required: true, message: '请输入主机名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入 Root 密码', trigger: 'blur' }],
  ostemplate: [{ required: true, message: '请选择 CT 模板', trigger: 'change' }],
  storage: [{ required: true, message: '请选择根磁盘存储', trigger: 'change' }],
  disk_size: [{ required: true, message: '请输入磁盘大小', trigger: 'blur' }],
  cores: [{ required: true, message: '请输入 CPU 核心数', trigger: 'blur' }],
  memory: [{ required: true, message: '请输入内存大小', trigger: 'blur' }],
  swap: [{ required: true, message: '请输入 SWAP 大小', trigger: 'blur' }],
  'network.bridge': [{ required: true, message: '请选择网络桥接', trigger: 'change' }],
   'network.ip': [{
        validator: (rule, value, callback) => {
            if (ipType.value === 'static' && !value) {
                callback(new Error('请输入 IP 地址/CIDR'));
            } else {
                callback();
            }
        },
        trigger: 'blur'
    }],
    'network.gw': [{
        validator: (rule, value, callback) => {
            if (ipType.value === 'static' && !value) {
                callback(new Error('请输入网关'));
            } else {
                callback();
            }
        },
        trigger: 'blur'
    }],
}

watch(ipType, (newVal) => {
    if (newVal === 'dhcp') {
        form.network.ip = 'dhcp';
        form.network.gw = '';
        formRef.value.clearValidate(['network.ip', 'network.gw']);
    } else {
        form.network.ip = '';
    }
});


const fetchNodes = async () => {
    loading.nodes = true;
    loading.page = true;
    try {
        const data = await getNodesApi();
        resources.nodes = data.filter(node => node.status === 'online');
        if (resources.nodes.length > 0) {
            form.node = resources.nodes[0].node;
            handleNodeChange(form.node);
        }
    } catch (error) {
        ElMessage.error('获取节点列表失败');
    } finally {
        loading.nodes = false;
        loading.page = false;
    }
}

const fetchNodeResources = async (node) => {
    loading.templates = true;
    loading.storages = true;
    loading.networks = true;

    form.ostemplate = '';
    form.storage = '';
    form.network.bridge = '';
    resources.templates = [];
    resources.storages = [];
    resources.networks = [];

    try {
        const [templatesData, storagesData, networksData] = await Promise.all([
            getNodeTemplatesApi(node),
            getNodeStoragesApi(node),
            getNodeNetworksApi(node)
        ]);
        resources.templates = templatesData.filter(t => t.content === 'vztmpl');
        resources.storages = storagesData.filter(s => s.active && s.content?.includes('rootdir'));
        resources.networks = networksData.filter(n => n.type === 'bridge' && n.active);

        if (resources.templates.length > 0) form.ostemplate = resources.templates[0].volid;
        if (resources.storages.length > 0) form.storage = resources.storages[0].storage;
        if (resources.networks.length > 0) form.network.bridge = resources.networks[0].iface;
         else form.network.bridge = 'vmbr0'; // Fallback

    } catch (error) {
        ElMessage.error(`获取节点 ${node} 资源失败`);
    } finally {
        loading.templates = false;
        loading.storages = false;
        loading.networks = false;
    }
}

const handleNodeChange = (node) => {
    if (node) {
        fetchNodeResources(node);
    }
}

const pollTask = (node, taskId) => {
    const interval = setInterval(async () => {
        try {
            const data = await getTaskStatusApi(node, taskId);
            if (data && data.status !== 'running') {
                clearInterval(interval);
                loading.submit = false;
                 if (data.exitstatus === 'OK') {
                    ElNotification({
                        title: '创建成功',
                        message: `容器 ${form.hostname} (VMID: ${data.id}) 已成功创建并完成: ${data.status}`,
                        type: 'success',
                        duration: 0,
                    });
                    router.push('/');
                } else {
                     ElNotification({
                        title: '创建失败',
                        message: `容器创建任务失败: ${data.exitstatus || data.status}`,
                        type: 'error',
                        duration: 0,
                    });
                }
            } else if (!data) {
                clearInterval(interval);
                loading.submit = false;
                ElMessage.warning(`无法获取任务 ${taskId} 状态，请前往 PVE 查看详情。`);
            }
        } catch (error) {
            clearInterval(interval);
            loading.submit = false;
            ElMessage.error(`查询任务 ${taskId} 状态失败`);
        }
    }, 3000);
}


const submitForm = async () => {
  if (!formRef.value) return
  await formRef.value.validate(async (valid) => {
    if (valid) {
      loading.submit = true
      try {
        const payload = { ...form };
        if (ipType.value === 'dhcp') {
            payload.network.ip = 'dhcp';
            delete payload.network.gw;
        }
        if (!payload.network.vlan) {
            delete payload.network.vlan;
        }

        const features = [];
        if (payload.nesting) features.push("nesting=1");
        payload.features = features.join(',');

        const response = await createContainerApi(payload)
         if (response && response.data) {
            ElMessage.info(`创建任务已启动: ${response.data}`);
            pollTask(payload.node, response.data);
        } else {
             ElMessage.error('启动创建任务失败，未收到任务 ID');
             loading.submit = false;
        }

      } catch (error) {
        ElMessage.error('创建容器失败');
        console.error(error)
        loading.submit = false
      }
    } else {
      ElMessage.error('请检查表单输入项');
      return false
    }
  })
}

const resetForm = () => {
  if (formRef.value) {
    formRef.value.resetFields()
  }
  ipType.value = 'dhcp';
  form.network.ip = 'dhcp';
  form.network.gw = '';
  form.network.vlan = null;
  form.nesting = false;
  form.unprivileged = true;
  form.start = false;
  // 保留节点选择并重新加载资源
  if(form.node) {
      handleNodeChange(form.node);
  }
}

const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

const formatStorageType = (type) => {
    const map = {
        'dir': '目录',
        'lvm': 'LVM',
        'lvmthin': 'LVM-Thin',
        'nfs': 'NFS',
        'cifs': 'CIFS',
        'zfs': 'ZFS',
        'zfspool': 'ZFS Pool',
    }
    return map[type] || type;
}


onMounted(fetchNodes)
</script>

<style scoped>
.box-card {
  max-width: 900px;
  margin: 20px auto;
}
.el-divider {
    margin: 30px 0;
}
.el-input-number {
    width: 100%;
}
.el-select {
    width: 100%;
}
</style>
