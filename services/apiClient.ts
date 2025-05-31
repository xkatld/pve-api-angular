import axios, { type AxiosInstance, type AxiosError } from 'axios';
import { useApiKeyStore } from '@/stores/apiKey';
import type {
  NodeListResponse, NodeResourceResponse, ContainerListResponse, ContainerCreate,
  OperationResponse, ContainerStatus, ContainerRebuild, ConsoleResponse, TaskStatusInfo
} from '@/types/proxmox';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
});

apiClient.interceptors.request.use(config => {
  const apiKeyStore = useApiKeyStore();
  if (apiKeyStore.apiKey) {
    config.headers.Authorization = `Bearer ${apiKeyStore.apiKey}`;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

function handleError(error: AxiosError, operation: string): string {
  if (error.response) {
    const data = error.response.data as any;
    return data?.detail || data?.error || `操作失败: ${operation} - ${error.message}`;
  } else if (error.request) {
    return `操作失败: ${operation} - 未收到服务器响应`;
  } else {
    return `操作失败: ${operation} - 请求设置错误: ${error.message}`;
  }
}

export default {
  async getNodes(): Promise<NodeListResponse> {
    try {
      const response = await apiClient.get<NodeListResponse>('/nodes');
      return response.data;
    } catch (err) {
      throw new Error(handleError(err as AxiosError, '获取节点列表'));
    }
  },

  async getNodeTemplates(node: string): Promise<NodeResourceResponse> {
    try {
      const response = await apiClient.get<NodeResourceResponse>(`/nodes/${node}/templates`);
      return response.data;
    } catch (err) {
      throw new Error(handleError(err as AxiosError, `获取节点 ${node} 模板`));
    }
  },

  async getNodeStorages(node: string): Promise<NodeResourceResponse> {
    try {
      const response = await apiClient.get<NodeResourceResponse>(`/nodes/${node}/storages`);
      return response.data;
    } catch (err) {
      throw new Error(handleError(err as AxiosError, `获取节点 ${node} 存储`));
    }
  },

  async getNodeNetworks(node: string): Promise<NodeResourceResponse> {
    try {
      const response = await apiClient.get<NodeResourceResponse>(`/nodes/${node}/networks`);
      return response.data;
    } catch (err) {
      throw new Error(handleError(err as AxiosError, `获取节点 ${node} 网络`));
    }
  },

  async getContainers(node?: string): Promise<ContainerListResponse> {
    try {
      const params = node ? { node } : {};
      const response = await apiClient.get<ContainerListResponse>('/containers', { params });
      return response.data;
    } catch (err) {
      throw new Error(handleError(err as AxiosError, '获取容器列表'));
    }
  },

  async createContainer(data: ContainerCreate): Promise<OperationResponse> {
    try {
      const response = await apiClient.post<OperationResponse>('/containers', data);
      return response.data;
    } catch (err) {
      throw new Error(handleError(err as AxiosError, '创建容器'));
    }
  },

  async getContainerStatus(node: string, vmid: string): Promise<ContainerStatus> {
    try {
      const response = await apiClient.get<ContainerStatus>(`/containers/${node}/${vmid}/status`);
      return response.data;
    } catch (err) {
      throw new Error(handleError(err as AxiosError, `获取容器 ${vmid} 状态`));
    }
  },

  async startContainer(node: string, vmid: string): Promise<OperationResponse> {
    try {
      const response = await apiClient.post<OperationResponse>(`/containers/${node}/${vmid}/start`);
      return response.data;
    } catch (err) {
      throw new Error(handleError(err as AxiosError, `启动容器 ${vmid}`));
    }
  },

  async stopContainer(node: string, vmid: string): Promise<OperationResponse> {
    try {
      const response = await apiClient.post<OperationResponse>(`/containers/${node}/${vmid}/stop`);
      return response.data;
    } catch (err) {
      throw new Error(handleError(err as AxiosError, `停止容器 ${vmid}`));
    }
  },

  async shutdownContainer(node: string, vmid: string): Promise<OperationResponse> {
    try {
      const response = await apiClient.post<OperationResponse>(`/containers/${node}/${vmid}/shutdown`);
      return response.data;
    } catch (err) {
      throw new Error(handleError(err as AxiosError, `关闭容器 ${vmid}`));
    }
  },

  async rebootContainer(node: string, vmid: string): Promise<OperationResponse> {
    try {
      const response = await apiClient.post<OperationResponse>(`/containers/${node}/${vmid}/reboot`);
      return response.data;
    } catch (err) {
      throw new Error(handleError(err as AxiosError, `重启容器 ${vmid}`));
    }
  },

  async deleteContainer(node: string, vmid: string): Promise<OperationResponse> {
    try {
      const response = await apiClient.delete<OperationResponse>(`/containers/${node}/${vmid}`);
      return response.data;
    } catch (err) {
      throw new Error(handleError(err as AxiosError, `删除容器 ${vmid}`));
    }
  },

  async rebuildContainer(node: string, vmid: string, data: ContainerRebuild): Promise<OperationResponse> {
    try {
      const response = await apiClient.post<OperationResponse>(`/containers/${node}/${vmid}/rebuild`, data);
      return response.data;
    } catch (err) {
      throw new Error(handleError(err as AxiosError, `重建容器 ${vmid}`));
    }
  },

  async getContainerConsole(node: string, vmid: string): Promise<ConsoleResponse> {
    try {
      const response = await apiClient.post<ConsoleResponse>(`/containers/${node}/${vmid}/console`);
      return response.data;
    } catch (err) {
      throw new Error(handleError(err as AxiosError, `获取容器 ${vmid} 控制台信息`));
    }
  },

  async getTaskStatus(node: string, taskId: string): Promise<OperationResponse> {
     try {
      const response = await apiClient.get<OperationResponse>(`/tasks/${node}/${taskId}`);
      return response.data;
    } catch (err) {
      throw new Error(handleError(err as AxiosError, `获取任务 ${taskId} 状态`));
    }
  },

  async checkServiceStatus(): Promise<any> {
    try {
      const response = await apiClient.get('/');
      return response.data;
    } catch (err) {
       throw new Error(handleError(err as AxiosError, '检查服务状态'));
    }
  }
};