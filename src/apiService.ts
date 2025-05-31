import axios, { AxiosInstance } from 'axios';
import {
  NodeListApiResponse, NodeResourceResponse, ContainerListResponse, OperationResponse,
  ContainerStatus, ContainerCreatePayload, ContainerRebuildPayload, ConsoleApiResponse,
  TaskStatusInfo
} from './types';

let apiClient: AxiosInstance;
let currentApiKey: string | null = null;
let currentApiBaseUrl: string | null = null;

export const initializeApiClient = (apiBaseUrl: string, apiKey: string) => {
  currentApiBaseUrl = apiBaseUrl;
  currentApiKey = apiKey;
  apiClient = axios.create({
    baseURL: apiBaseUrl,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
  });
};

export const updateApiClientConfig = (apiBaseUrl?: string, apiKey?: string) => {
  if (apiBaseUrl) currentApiBaseUrl = apiBaseUrl;
  if (apiKey) currentApiKey = apiKey;

  if (currentApiBaseUrl && currentApiKey) {
    apiClient = axios.create({
      baseURL: currentApiBaseUrl,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentApiKey}`,
      },
    });
  }
};


const ensureApiClient = () => {
  if (!apiClient) {
    throw new Error("API 客户端未初始化。请先在设置中配置 API 地址和密钥。");
  }
  return apiClient;
};

export const getNodes = async (): Promise<NodeListApiResponse> => {
  const response = await ensureApiClient().get<NodeListApiResponse>('/nodes');
  return response.data;
};

export const getNodeTemplates = async (node: string): Promise<NodeResourceResponse> => {
  const response = await ensureApiClient().get<NodeResourceResponse>(`/nodes/${node}/templates`);
  return response.data;
};

export const getNodeStorages = async (node: string): Promise<NodeResourceResponse> => {
  const response = await ensureApiClient().get<NodeResourceResponse>(`/nodes/${node}/storages`);
  return response.data;
};

export const getNodeNetworks = async (node: string): Promise<NodeResourceResponse> => {
  const response = await ensureApiClient().get<NodeResourceResponse>(`/nodes/${node}/networks`);
  return response.data;
};

export const getContainers = async (node?: string): Promise<ContainerListResponse> => {
  const params = node ? { node } : {};
  const response = await ensureApiClient().get<ContainerListResponse>('/containers', { params });
  return response.data;
};

export const createContainer = async (data: ContainerCreatePayload): Promise<OperationResponse> => {
  const response = await ensureApiClient().post<OperationResponse>('/containers', data);
  return response.data;
};

export const getContainerStatus = async (node: string, vmid: string): Promise<ContainerStatus> => {
  const response = await ensureApiClient().get<ContainerStatus>(`/containers/${node}/${vmid}/status`);
  return response.data;
};

export const startContainer = async (node: string, vmid: string): Promise<OperationResponse> => {
  const response = await ensureApiClient().post<OperationResponse>(`/containers/${node}/${vmid}/start`);
  return response.data;
};

export const stopContainer = async (node: string, vmid: string): Promise<OperationResponse> => {
  const response = await ensureApiClient().post<OperationResponse>(`/containers/${node}/${vmid}/stop`);
  return response.data;
};

export const shutdownContainer = async (node: string, vmid: string): Promise<OperationResponse> => {
  const response = await ensureApiClient().post<OperationResponse>(`/containers/${node}/${vmid}/shutdown`);
  return response.data;
};

export const rebootContainer = async (node: string, vmid: string): Promise<OperationResponse> => {
  const response = await ensureApiClient().post<OperationResponse>(`/containers/${node}/${vmid}/reboot`);
  return response.data;
};

export const deleteContainer = async (node: string, vmid: string): Promise<OperationResponse> => {
  const response = await ensureApiClient().delete<OperationResponse>(`/containers/${node}/${vmid}`);
  return response.data;
};

export const rebuildContainer = async (node: string, vmid: string, data: ContainerRebuildPayload): Promise<OperationResponse> => {
  const response = await ensureApiClient().post<OperationResponse>(`/containers/${node}/${vmid}/rebuild`, data);
  return response.data;
};

export const getContainerConsole = async (node: string, vmid: string): Promise<ConsoleApiResponse> => {
  const response = await ensureApiClient().post<ConsoleApiResponse>(`/containers/${node}/${vmid}/console`);
  return response.data;
};

export const getTaskStatus = async (node: string, taskId: string): Promise<OperationResponse<TaskStatusInfo>> => {
  const response = await ensureApiClient().get<OperationResponse<TaskStatusInfo>>(`/tasks/${node}/${taskId}`);
  return response.data;
};
