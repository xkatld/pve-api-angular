<template>
  <div>
    <el-card>
      <template #header>
        <span>创建新的 LXC 容器</span>
      </template>

      <el-form :model="form" ref="createFormRef" label-width="150px" :rules="rules">
        <el-tabs v-model="activeTab">
          <el-tab-pane label="基本配置" name="basic">
            <el-form-item label="目标节点" prop="node">
              <el-input v-model="form.node" placeholder="例如: pve"></el-input>
            </el-form-item>
            <el-form-item label="VMID" prop="vmid">
              <el-input-number v-model="form.vmid" :min="100" placeholder="必须唯一, 例如: 105"></el-input-number>
            </el-form-item>
            <el-form-item label="主机名" prop="hostname">
              <el-input v-model="form.hostname" placeholder="例如: my-ct"></el-input>
            </el-form-item>
            <el-form-item label="密码" prop="password">
              <el-input v-model="form.password" type="password" placeholder="容器 root 用户的密码" show-password></el-input>
            </el-form-item>
            <el-form-item label="确认密码" prop="confirmPassword">
              <el-input v-model="form.confirmPassword" type="password" placeholder="请再次输入密码" show-password></el-input>
            </el-form-item>
             <el-form-item label="操作系统模板" prop="ostemplate">
              <el-input v-model="form.ostemplate" placeholder="例如: local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.gz"></el-input>
            </el-form-item>
          </el-tab-pane>

          <el-tab-pane label="资源配置" name="resources">
             <el-form-item label="存储池" prop="storage">
              <el-input v-model="form.storage" placeholder="例如: local-lvm"></el-input>
            </el-form-item>
            <el-form-item label="磁盘大小 (GB)" prop="disk_size">
              <el-input-number v-model="form.disk_size" :min="1" placeholder="例如: 8"></el-input-number>
            </el-form-item>
            <el-form-item label="CPU 核心数" prop="cores">
              <el-input-number v-model="form.cores" :min="1" placeholder="例如: 1"></el-input-number>
            </el-form-item>
            <el-form-item label="CPU 限制">
              <el-input-number v-model="form.cpulimit" :min="0" placeholder="0 表示无限制"></el-input-number>
            </el-form-item>
            <el-form-item label="内存 (MB)" prop="memory">
              <el-input-number v-model="form.memory" :min="64" :step="64" placeholder="例如: 512"></el-input-number>
            </el-form-item>
            <el-form-item label="SWAP (MB)" prop="swap">
              <el-input-number v-model="form.swap" :min="0" :step="64" placeholder="例如: 512"></el-input-number>
            </el-form-item>
          </el-tab-pane>

          <el-tab-pane label="网络配置" name="network">
            <el-form-item label="接口名称" prop="network.name">
               <el-input v-model="form.network.name" placeholder="例如: eth0"></el-input>
            </el-form-item>
            <el-form-item label="桥接网卡" prop="network.bridge">
               <el-input v-model="form.network.bridge" placeholder="例如: vmbr0"></el-input>
            </el-form-item>
            <el-form-item label="IP 配置" prop="network.ip">
               <el-input v-model="form.network.ip" placeholder="例如: 192.168.1.100/24 或 dhcp"></el-input>
            </el-form-item>
            <el-form-item label="网关 (GW)">
               <el-input v-model="form.network.gw" placeholder="例如: 192.168.1.1"></el-input>
            </el-form-item>
            <el-form-item label="VLAN 标签">
               <el-input-number v-model="form.network.vlan" :min="1" placeholder="可选"></el-input-number>
            </el-form-item>
            <el-form-item label="速率限制 (MB/s)">
               <el-input-number v-model="form.network.rate" :min="1" placeholder="可选"></el-input-number>
            </el-form-item>
          </el-tab-pane>

           <el-tab-pane label="高级选项" name="advanced">
                <el-form-item label="非特权容器">
                    <el-switch v-model="form.unprivileged"></el-switch>
                </el-form-item>
                 <el-form-item label="启用嵌套虚拟化">
                    <el-switch v-model="form.nesting"></el-switch>
                </el-form-item>
                 <el-form-item label="额外功能">
                    <el-input v-model="form.features" placeholder="例如: keyctl=1,mount=cifs"></el-input>
                </el-form-item>
                <el-form-item label="创建后启动">
                    <el-switch v-model="form.start"></el-switch>
                </el-form-item>
           </el-tab-pane>
        </el-tabs>

        <el-form-item>
            <el-button type="primary" @click="submitForm" :loading="isSubmitting">立即创建</el-button>
            <el-button @click="resetForm">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { createContainerApi } from '../api/lxc';
import { ElMessage } from 'element-plus';

const router = useRouter();
const createFormRef = ref(null);
const isSubmitting = ref(false);
const activeTab = ref('basic');

const form = ref({
  node: '',
  vmid: 105,
  hostname: '',
  password: '',
  confirmPassword: '',
  ostemplate: '',
  storage: 'local-lvm',
  disk_size: 8,
  cores: 1,
  cpulimit: 0,
  memory: 512,
  swap: 512,
  network: {
    name: 'eth0',
    bridge: 'vmbr0',
    ip: 'dhcp',
    gw: '',
    vlan: null,
    rate: null,
  },
  nesting: false,
  unprivileged: true,
  start: false,
  features: '',
});

const validatePass = (rule, value, callback) => {
  if (value === '') {
    callback(new Error('请输入密码'));
  } else {
    if (form.value.confirmPassword !== '') {
      if (!createFormRef.value) return;
      createFormRef.value.validateField('confirmPassword', () => null);
    }
    callback();
  }
};

const validatePass2 = (rule, value, callback) => {
  if (value === '') {
    callback(new Error('请再次输入密码'));
  } else if (value !== form.value.password) {
    callback(new Error("两次输入的密码不一致!"));
  } else {
    callback();
  }
};

const rules = ref({
  node: [{ required: true, message: '请输入目标节点', trigger: 'blur' }],
  vmid: [{ required: true, message: '请输入 VMID', trigger: 'blur' }],
  hostname: [{ required: true, message: '请输入主机名', trigger: 'blur' }],
  password: [{ required: true, validator: validatePass, trigger: 'blur' }],
  confirmPassword: [{ required: true, validator: validatePass2, trigger: 'blur' }],
  ostemplate: [{ required: true, message: '请输入操作系统模板', trigger: 'blur' }],
  storage: [{ required: true, message: '请输入存储池', trigger: 'blur' }],
  disk_size: [{ required: true, message: '请输入磁盘大小', trigger: 'blur' }],
  cores: [{ required: true, message: '请输入 CPU 核心数', trigger: 'blur' }],
  memory: [{ required: true, message: '请输入内存大小', trigger: 'blur' }],
  swap: [{ required: true, message: '请输入 SWAP 大小', trigger: 'blur' }],
  'network.name': [{ required: true, message: '请输入接口名称', trigger: 'blur' }],
  'network.bridge': [{ required: true, message: '请输入桥接网卡', trigger: 'blur' }],
  'network.ip': [{ required: true, message: '请输入 IP 配置', trigger: 'blur' }],
});

const submitForm = async () => {
  if (!createFormRef.value) return;
  await createFormRef.value.validate(async (valid) => {
    if (valid) {
      isSubmitting.value = true;
      try {
        const dataToSend = { ...form.value };
        delete dataToSend.confirmPassword;
        if (dataToSend.network.vlan === null || dataToSend.network.vlan === 0) {
            delete dataToSend.network.vlan;
        }
        if (dataToSend.network.rate === null || dataToSend.network.rate === 0) {
            delete dataToSend.network.rate;
        }
         if (dataToSend.cpulimit === 0) {
            delete dataToSend.cpulimit;
        }

        const response = await createContainerApi(dataToSend);
        if (response.success) {
            ElMessage.success(`容器创建任务已启动 (任务ID: ${response.data?.task_id})`);
            router.push('/');
        } else {
            ElMessage.error(`创建失败: ${response.message}`);
        }
      } catch (error) {
        console.error('创建容器失败:', error);
        ElMessage.error(`创建失败: ${error?.response?.data?.detail || error}`);
      } finally {
        isSubmitting.value = false;
      }
    } else {
      ElMessage.error('请检查表单输入项！');
      return false;
    }
  });
};

const resetForm = () => {
  if (!createFormRef.value) return;
  createFormRef.value.resetFields();
  form.value = { // Also reset nested and non-field values
    node: '',
    vmid: 105,
    hostname: '',
    password: '',
    confirmPassword: '',
    ostemplate: '',
    storage: 'local-lvm',
    disk_size: 8,
    cores: 1,
    cpulimit: 0,
    memory: 512,
    swap: 512,
    network: {
      name: 'eth0',
      bridge: 'vmbr0',
      ip: 'dhcp',
      gw: '',
      vlan: null,
      rate: null,
    },
    nesting: false,
    unprivileged: true,
    start: false,
    features: '',
  };
  activeTab.value = 'basic';
};
</script>

<style scoped>
.el-card {
  max-width: 800px;
  margin: 20px auto;
}
.el-form-item {
    margin-bottom: 22px;
}
.el-tabs {
    margin-bottom: 20px;
}
.el-input-number {
    width: 100%;
}
</style>
