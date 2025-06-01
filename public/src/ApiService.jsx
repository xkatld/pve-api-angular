const API_BASE_URL = '/api/v1';

const request = async (endpoint, method = 'GET', body = null, apiKey = '') => {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const config = {
    method,
    headers,
  };

  if (body && (method === 'POST' || method === 'PUT' || method === 'DELETE')) {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { message: `HTTP 错误: ${response.status} ${response.statusText}` };
      }
      throw errorData;
    }
    if (response.status === 204 || response.headers.get("content-length") === "0") {
        return { success: true, message: "操作成功完成，无返回内容。" };
    }
    return await response.json();
  } catch (error) {
    console.error(`API 请求失败 (${method} ${endpoint}):`, error);
    throw error;
  }
};

export const ApiService = {
  getNodes: (apiKey) => request('/nodes', 'GET', null, apiKey),
  getNodeTemplates: (node, apiKey) => request(`/nodes/${node}/templates`, 'GET', null, apiKey),
  getNodeStorages: (node, apiKey) => request(`/nodes/${node}/storages`, 'GET', null, apiKey),
  getNodeNetworks: (node, apiKey) => request(`/nodes/${node}/networks`, 'GET', null, apiKey),

  getContainers: (apiKey, node = null) => {
    const endpoint = node ? `/containers?node=${node}` : '/containers';
    return request(endpoint, 'GET', null, apiKey);
  },
  createContainer: (data, apiKey) => request('/containers', 'POST', data, apiKey),
  getContainerStatus: (node, vmid, apiKey) => request(`/containers/${node}/${vmid}/status`, 'GET', null, apiKey),
  startContainer: (node, vmid, apiKey) => request(`/containers/${node}/${vmid}/start`, 'POST', null, apiKey),
  stopContainer: (node, vmid, apiKey) => request(`/containers/${node}/${vmid}/stop`, 'POST', null, apiKey),
  shutdownContainer: (node, vmid, apiKey) => request(`/containers/${node}/${vmid}/shutdown`, 'POST', null, apiKey),
  rebootContainer: (node, vmid, apiKey) => request(`/containers/${node}/${vmid}/reboot`, 'POST', null, apiKey),
  deleteContainer: (node, vmid, apiKey) => request(`/containers/${node}/${vmid}`, 'DELETE', null, apiKey),
  rebuildContainer: (node, vmid, data, apiKey) => request(`/containers/${node}/${vmid}/rebuild`, 'POST', data, apiKey),
  getContainerConsole: (node, vmid, apiKey) => request(`/containers/${node}/${vmid}/console`, 'POST', null, apiKey),

  getTaskStatus: (node, taskId, apiKey) => request(`/tasks/${node}/${taskId}`, 'GET', null, apiKey),

  getServiceStatus: (apiKey) => request('/', 'GET', null, apiKey),
  getHealthCheck: (apiKey) => request('/health', 'GET', null, apiKey),

  resyncNatRules: (apiKey) => request(`/nat/rules/resync`, 'POST', null, apiKey),
  createNatRule: (node, vmid, data, apiKey) => request(`/nodes/${node}/lxc/${vmid}/nat`, 'POST', data, apiKey),
  getNatRulesForContainer: (node, vmid, apiKey, skip = 0, limit = 100) => request(`/nodes/${node}/lxc/${vmid}/nat?skip=${skip}&limit=${limit}`, 'GET', null, apiKey),
  getAllNatRules: (apiKey, skip = 0, limit = 100) => request(`/nat/rules?skip=${skip}&limit=${limit}`, 'GET', null, apiKey),
  getNatRuleDetails: (ruleId, apiKey) => request(`/nat/rules/${ruleId}`, 'GET', null, apiKey),
  updateNatRule: (ruleId, data, apiKey) => request(`/nat/rules/${ruleId}`, 'PUT', data, apiKey),
  deleteNatRule: (ruleId, apiKey) => request(`/nat/rules/${ruleId}`, 'DELETE', null, apiKey),
};
