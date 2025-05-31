import React, { useState, useEffect, useCallback } from 'react';
import { ApiService } from './ApiService';

const initialContainerFormData = {
  node: '',
  vmid: '',
  hostname: '',
  password: '',
  ostemplate: '',
  storage: '',
  disk_size: 8,
  cores: 1,
  cpulimit: null,
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
  console_mode: '默认 (tty)',
};

function App() {
  const [apiKey, setApiKey] = useState(localStorage.getItem('pveApiKey') || '');
  const [nodes, setNodes] = useState([]);
  const [containers, setContainers] = useState([]);
  const [selectedNode, setSelectedNode] = useState('');
  const [nodeResources, setNodeResources] = useState({ templates: [], storages: [], networks: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [currentView, setCurrentView] = useState('nodes'); // nodes, containers, tasks

  const [taskNode, setTaskNode] = useState('');
  const [taskId, setTaskId] = useState('');
  const [taskDetails, setTaskDetails] = useState(null);

  const [showContainerModal, setShowContainerModal] = useState(false);
  const [containerFormData, setContainerFormData] = useState(initialContainerFormData);
  const [isRebuildMode, setIsRebuildMode] = useState(false);
  const [rebuildVmid, setRebuildVmid] = useState('');
  const [rebuildNode, setRebuildNode] = useState('');

  const [consoleInfo, setConsoleInfo] = useState(null);
  const [showConsoleModal, setShowConsoleModal] = useState(false);

  const displayAlert = (message, type = 'error', duration = 5000) => {
    if (type === 'error') setError(message);
    if (type === 'success') setSuccessMessage(message);
    setTimeout(() => {
      setError(null);
      setSuccessMessage(null);
    }, duration);
  };

  const handleApiKeyChange = (e) => {
    setApiKey(e.target.value);
    localStorage.setItem('pveApiKey', e.target.value);
  };

  const fetchData = useCallback(async (serviceCall, setter, loadingMessage = '加载中...') => {
    if (!apiKey) {
      displayAlert('请输入 API 密钥');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await serviceCall(apiKey);
      setter(result.data || (Array.isArray(result.containers) ? result.containers : result));
      if (result.message && result.success) displayAlert(result.message, 'success');
    } catch (err) {
      displayAlert(err.detail || err.message || '发生未知错误');
      setter(Array.isArray(setter([])) ? [] : null); // Reset to default type
    } finally {
      setIsLoading(false);
    }
  }, [apiKey]);

  useEffect(() => {
    if (apiKey && currentView === 'nodes') {
      fetchData(ApiService.getNodes, setNodes, '正在加载节点...');
    }
  }, [apiKey, currentView, fetchData]);

  useEffect(() => {
    if (apiKey && currentView === 'containers') {
        fetchData((key) => ApiService.getContainers(key, selectedNode || null), setContainers, '正在加载容器...');
    }
  }, [apiKey, currentView, selectedNode, fetchData]);


  const fetchNodeDetails = async (nodeName) => {
    if (!apiKey || !nodeName) return;
    setIsLoading(true);
    try {
      const [templates, storages, networks] = await Promise.all([
        ApiService.getNodeTemplates(nodeName, apiKey),
        ApiService.getNodeStorages(nodeName, apiKey),
        ApiService.getNodeNetworks(nodeName, apiKey),
      ]);
      setNodeResources({
        templates: templates.data || [],
        storages: storages.data || [],
        networks: networks.data || [],
      });
    } catch (err) {
      displayAlert(err.detail || err.message || '加载节点资源失败');
      setNodeResources({ templates: [], storages: [], networks: [] });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleContainerFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.startsWith('network.')) {
      const netField = name.split('.')[1];
      setContainerFormData(prev => ({
        ...prev,
        network: { ...prev.network, [netField]: type === 'checkbox' ? checked : value }
      }));
    } else {
      setContainerFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleCreateOrRebuildContainer = async (e) => {
    e.preventDefault();
    if (!apiKey) {
      displayAlert('请输入 API 密钥');
      return;
    }
    setIsLoading(true);
    const dataToSubmit = { ...containerFormData };
    if (dataToSubmit.cpulimit === '' || dataToSubmit.cpulimit === null) delete dataToSubmit.cpulimit;
    else dataToSubmit.cpulimit = parseInt(dataToSubmit.cpulimit);

    dataToSubmit.disk_size = parseInt(dataToSubmit.disk_size);
    dataToSubmit.cores = parseInt(dataToSubmit.cores);
    dataToSubmit.memory = parseInt(dataToSubmit.memory);
    dataToSubmit.swap = parseInt(dataToSubmit.swap);
    if (dataToSubmit.network.vlan === '' || dataToSubmit.network.vlan === null) delete dataToSubmit.network.vlan;
    else dataToSubmit.network.vlan = parseInt(dataToSubmit.network.vlan);
    if (dataToSubmit.network.rate === '' || dataToSubmit.network.rate === null) delete dataToSubmit.network.rate;
    else dataToSubmit.network.rate = parseInt(dataToSubmit.network.rate);


    try {
      let response;
      if (isRebuildMode) {
        response = await ApiService.rebuildContainer(rebuildNode, rebuildVmid, dataToSubmit, apiKey);
      } else {
        dataToSubmit.vmid = parseInt(dataToSubmit.vmid);
        response = await ApiService.createContainer(dataToSubmit, apiKey);
      }
      displayAlert(response.message || (isRebuildMode ? '重建任务已启动' : '创建任务已启动'), 'success');
      setShowContainerModal(false);
      fetchData((key) => ApiService.getContainers(key, selectedNode || null), setContainers);
    } catch (err) {
      displayAlert(err.detail || err.message || (isRebuildMode ? '重建容器失败' : '创建容器失败'));
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateContainerModal = () => {
    setIsRebuildMode(false);
    setContainerFormData(initialContainerFormData);
    if (nodes.length > 0) {
        setContainerFormData(prev => ({...prev, node: nodes[0].node}));
        fetchNodeDetails(nodes[0].node); // Load resources for the first node by default
    }
    setShowContainerModal(true);
  };

  const openRebuildContainerModal = (ct) => {
    setIsRebuildMode(true);
    setRebuildVmid(ct.vmid);
    setRebuildNode(ct.node);
    fetchNodeDetails(ct.node); // Load resources for the container's node
    setContainerFormData({
      node: ct.node, // Should not be editable in rebuild
      vmid: ct.vmid, // Should not be editable in rebuild
      hostname: ct.name || `ct-${ct.vmid}`,
      password: '', // Always require new password
      ostemplate: '', // User must select
      storage: '', // User must select
      disk_size: Math.round((ct.maxdisk || 8589934592) / (1024 * 1024 * 1024)), // example from API
      cores: ct.maxcpu || 1,
      cpulimit: null,
      memory: Math.round((ct.maxmem || 536870912) / (1024 * 1024)),
      swap: Math.round((ct.maxswap || 536870912) / (1024 * 1024)), // Assuming maxswap might be available
      network: { // This part needs actual config to be fetched or reset
        name: 'eth0',
        bridge: 'vmbr0', // Default, ideally fetch current if possible
        ip: 'dhcp',
        gw: '',
        vlan: null,
        rate: null,
      },
      nesting: false, // Default, or fetch current features
      unprivileged: true, // Default, or fetch current
      start: false,
      features: '', // Default, or fetch current
      console_mode: '默认 (tty)',
    });
    setShowContainerModal(true);
  };
  
  useEffect(() => {
    if (showContainerModal && containerFormData.node) {
        fetchNodeDetails(containerFormData.node);
    }
  }, [containerFormData.node, showContainerModal]);


  const handleContainerAction = async (node, vmid, action) => {
    if (!apiKey) {
      displayAlert('请输入 API 密钥');
      return;
    }
    if (action === 'delete' && !window.confirm(`确定要删除容器 ${vmid} 吗？此操作不可恢复！`)) {
      return;
    }
    setIsLoading(true);
    try {
      let response;
      switch (action) {
        case 'start': response = await ApiService.startContainer(node, vmid, apiKey); break;
        case 'stop': response = await ApiService.stopContainer(node, vmid, apiKey); break;
        case 'shutdown': response = await ApiService.shutdownContainer(node, vmid, apiKey); break;
        case 'reboot': response = await ApiService.rebootContainer(node, vmid, apiKey); break;
        case 'delete': response = await ApiService.deleteContainer(node, vmid, apiKey); break;
        case 'status': 
            response = await ApiService.getContainerStatus(node, vmid, apiKey);
            displayAlert(JSON.stringify(response.data || response, null, 2), 'success'); // Show full status
            setIsLoading(false); return;
        case 'console':
            response = await ApiService.getContainerConsole(node, vmid, apiKey);
            if (response.success && response.data) {
              setConsoleInfo(response.data);
              setShowConsoleModal(true);
            } else {
              displayAlert(response.message || '获取控制台信息失败');
            }
            setIsLoading(false); return;
        default: throw new Error('未知操作');
      }
      displayAlert(response.message || `容器 ${vmid} ${action} 命令已发送`, 'success');
      // Short delay to allow Proxmox to process, then refresh
      setTimeout(() => fetchData((key) => ApiService.getContainers(key, selectedNode || null), setContainers), 2000);
    } catch (err) {
      displayAlert(err.detail || err.message || `容器 ${vmid} 操作 ${action} 失败`);
    } finally {
      if (action !== 'status' && action !== 'console') setIsLoading(false);
    }
  };

  const handleGetTaskStatus = async (e) => {
    e.preventDefault();
    if (!taskNode || !taskId) {
        displayAlert('请输入节点和任务 ID');
        return;
    }
    fetchData((key) => ApiService.getTaskStatus(taskNode, taskId, key), setTaskDetails, '正在获取任务状态...');
  };
  
  const renderAlerts = () => (
    <>
      {error && <div className="alert alert-danger position-fixed bottom-0 end-0 m-3" style={{zIndex: 1050}} role="alert">{error}</div>}
      {successMessage && <div className="alert alert-success position-fixed bottom-0 end-0 m-3" style={{zIndex: 1050}} role="alert">{successMessage}</div>}
    </>
  );

  const renderNodes = () => (
    <div>
      <h2><i className="bi bi-server"></i> 节点列表</h2>
      {nodes.length > 0 ? (
        <ul className="list-group">
          {nodes.map(node => (
            <li key={node.node} className="list-group-item d-flex justify-content-between align-items-center">
              <div>
                <strong>{node.node}</strong> ({node.status})<br />
                <small>CPU: {node.cpu.toFixed(2)}/{node.maxcpu} | 内存: {(node.mem / (1024**3)).toFixed(2)}/{(node.maxmem / (1024**3)).toFixed(2)} GB | 磁盘: {(node.disk / (1024**3)).toFixed(2)}/{(node.maxdisk / (1024**3)).toFixed(2)} GB</small>
              </div>
              <button className="btn btn-sm btn-outline-primary" onClick={() => {setSelectedNode(node.node); setCurrentView('containers');}}>查看容器</button>
            </li>
          ))}
        </ul>
      ) : !isLoading && <p>没有可用的节点，或未输入有效的 API 密钥。</p>}
    </div>
  );

  const renderContainers = () => (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2><i className="bi bi-box"></i> 容器列表 {selectedNode && `(节点: ${selectedNode})`}</h2>
        <div>
          {selectedNode && <button className="btn btn-outline-secondary me-2" onClick={() => {setSelectedNode(''); fetchNodeDetails(''); /* Reset/clear node specific details if any */ }}>查看所有节点容器</button>}
          <button className="btn btn-primary" onClick={openCreateContainerModal}><i className="bi bi-plus-circle"></i> 创建容器</button>
        </div>
      </div>
      {containers.length > 0 ? (
        <div className="table-responsive">
          <table className="table table-striped table-hover">
            <thead>
              <tr>
                <th>VMID</th><th>名称</th><th>状态</th><th>节点</th><th>CPU</th><th>内存</th><th>操作</th>
              </tr>
            </thead>
            <tbody>
              {containers.map(ct => (
                <tr key={`${ct.node}-${ct.vmid}`}>
                  <td>{ct.vmid}</td>
                  <td>{ct.name}</td>
                  <td><span className={`badge bg-${ct.status === 'running' ? 'success' : 'secondary'}`}>{ct.status}</span></td>
                  <td>{ct.node}</td>
                  <td>{ct.cpu ? ct.cpu.toFixed(2) : 'N/A'}</td>
                  <td>{ct.mem ? `${(ct.mem / (1024**2)).toFixed(0)}MB / ${(ct.maxmem / (1024**2)).toFixed(0)}MB` : 'N/A'}</td>
                  <td>
                    <div className="btn-group btn-group-sm" role="group">
                      <button className="btn btn-outline-success" onClick={() => handleContainerAction(ct.node, ct.vmid, 'start')} disabled={ct.status === 'running'}><i className="bi bi-play-fill"></i></button>
                      <button className="btn btn-outline-warning" onClick={() => handleContainerAction(ct.node, ct.vmid, 'shutdown')} disabled={ct.status !== 'running'}><i className="bi bi-power"></i></button>
                      <button className="btn btn-outline-danger" onClick={() => handleContainerAction(ct.node, ct.vmid, 'stop')} disabled={ct.status !== 'running'}><i className="bi bi-stop-fill"></i></button>
                      <button className="btn btn-outline-info" onClick={() => handleContainerAction(ct.node, ct.vmid, 'reboot')} disabled={ct.status !== 'running'}><i className="bi bi-arrow-repeat"></i></button>
                    </div>
                    <div className="btn-group btn-group-sm ms-1" role="group">
                      <button className="btn btn-outline-secondary" onClick={() => handleContainerAction(ct.node, ct.vmid, 'status')}><i className="bi bi-info-circle"></i></button>
                      <button className="btn btn-outline-dark" onClick={() => handleContainerAction(ct.node, ct.vmid, 'console')}><i className="bi bi-terminal"></i></button>
                      <button className="btn btn-warning btn-sm" onClick={() => openRebuildContainerModal(ct)}><i className="bi bi-arrow-counterclockwise"></i> 重建</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleContainerAction(ct.node, ct.vmid, 'delete')}><i className="bi bi-trash"></i> 删除</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : !isLoading && <p>没有找到容器，或选择的节点上没有容器。</p>}
    </div>
  );

  const renderTasks = () => (
    <div>
      <h2><i className="bi bi-list-task"></i> 任务状态查询</h2>
      <form onSubmit={handleGetTaskStatus} className="row g-3 align-items-end">
        <div className="col-md-4">
          <label htmlFor="taskNode" className="form-label">节点名称</label>
          <input type="text" className="form-control" id="taskNode" value={taskNode} onChange={e => setTaskNode(e.target.value)} required />
        </div>
        <div className="col-md-4">
          <label htmlFor="taskId" className="form-label">任务 ID</label>
          <input type="text" className="form-control" id="taskId" value={taskId} onChange={e => setTaskId(e.target.value)} required />
        </div>
        <div className="col-md-4">
          <button type="submit" className="btn btn-primary w-100"><i className="bi bi-search"></i> 查询状态</button>
        </div>
      </form>
      {taskDetails && (
        <div className="mt-4 card">
          <div className="card-header">任务详情 (ID: {taskDetails.id})</div>
          <div className="card-body">
            <p><strong>状态:</strong> {taskDetails.status}</p>
            <p><strong>退出状态:</strong> {taskDetails.exitstatus || 'N/A'}</p>
            <p><strong>类型:</strong> {taskDetails.type}</p>
            <p><strong>开始时间:</strong> {taskDetails.starttime ? new Date(taskDetails.starttime * 1000).toLocaleString() : 'N/A'}</p>
            <p><strong>结束时间:</strong> {taskDetails.endtime ? new Date(taskDetails.endtime * 1000).toLocaleString() : 'N/A'}</p>
          </div>
        </div>
      )}
    </div>
  );
  
  const renderContainerModal = () => (
    <div className={`modal fade ${showContainerModal ? 'show d-block' : ''}`} tabIndex="-1" style={{backgroundColor: showContainerModal ? 'rgba(0,0,0,0.5)' : 'transparent'}}>
      <div className="modal-dialog modal-lg modal-dialog-scrollable">
        <div className="modal-content">
          <form onSubmit={handleCreateOrRebuildContainer}>
            <div className="modal-header">
              <h5 className="modal-title">{isRebuildMode ? `重建容器 ${rebuildVmid} (节点: ${rebuildNode})` : '创建新 LXC 容器'}</h5>
              <button type="button" className="btn-close" onClick={() => setShowContainerModal(false)}></button>
            </div>
            <div className="modal-body">
              <div className="row">
                {!isRebuildMode && (
                  <div className="col-md-6 mb-3">
                    <label htmlFor="node" className="form-label">目标节点*</label>
                    <select className="form-select" id="node" name="node" value={containerFormData.node} onChange={handleContainerFormChange} required>
                      <option value="" disabled>选择一个节点</option>
                      {nodes.map(n => <option key={n.node} value={n.node}>{n.node}</option>)}
                    </select>
                  </div>
                )}
                {!isRebuildMode && (
                  <div className="col-md-6 mb-3">
                    <label htmlFor="vmid" className="form-label">VMID*</label>
                    <input type="number" className="form-control" id="vmid" name="vmid" value={containerFormData.vmid} onChange={handleContainerFormChange} required />
                  </div>
                )}
                <div className="col-md-6 mb-3">
                  <label htmlFor="hostname" className="form-label">主机名*</label>
                  <input type="text" className="form-control" id="hostname" name="hostname" value={containerFormData.hostname} onChange={handleContainerFormChange} required />
                </div>
                 <div className="col-md-6 mb-3">
                  <label htmlFor="password" className="form-label">密码*</label>
                  <input type="password" placeholder={isRebuildMode ? "输入新密码" : ""} className="form-control" id="password" name="password" value={containerFormData.password} onChange={handleContainerFormChange} required />
                </div>
                 <div className="col-md-6 mb-3">
                  <label htmlFor="ostemplate" className="form-label">操作系统模板*</label>
                  <select className="form-select" id="ostemplate" name="ostemplate" value={containerFormData.ostemplate} onChange={handleContainerFormChange} required disabled={!containerFormData.node && !isRebuildMode}>
                    <option value="" disabled>选择模板</option>
                    {nodeResources.templates.map(t => <option key={t.volid} value={t.volid}>{t.volid.split('/')[1]} ({ (t.size / (1024**3)).toFixed(2) } GB)</option>)}
                  </select>
                </div>
                <div className="col-md-6 mb-3">
                  <label htmlFor="storage" className="form-label">根文件系统存储*</label>
                   <select className="form-select" id="storage" name="storage" value={containerFormData.storage} onChange={handleContainerFormChange} required disabled={!containerFormData.node && !isRebuildMode}>
                    <option value="" disabled>选择存储</option>
                    {nodeResources.storages.filter(s => s.type === 'lvm' || s.type === 'lvmthin' || s.type === 'dir' || s.type === 'zfspool').map(s => <option key={s.storage} value={s.storage}>{s.storage} ({(s.avail/(1024**3)).toFixed(2)}/{(s.total/(1024**3)).toFixed(2)} GB)</option>)}
                  </select>
                </div>
                <div className="col-md-6 mb-3">
                  <label htmlFor="disk_size" className="form-label">磁盘大小 (GB)*</label>
                  <input type="number" className="form-control" id="disk_size" name="disk_size" value={containerFormData.disk_size} onChange={handleContainerFormChange} required />
                </div>
                 <div className="col-md-6 mb-3">
                  <label htmlFor="cores" className="form-label">CPU核心数*</label>
                  <input type="number" className="form-control" id="cores" name="cores" value={containerFormData.cores} onChange={handleContainerFormChange} required />
                </div>
                <div className="col-md-6 mb-3">
                  <label htmlFor="cpulimit" className="form-label">CPU限制 (0=无限制)</label>
                  <input type="number" className="form-control" id="cpulimit" name="cpulimit" value={containerFormData.cpulimit === null ? '' : containerFormData.cpulimit} onChange={handleContainerFormChange} />
                </div>
                <div className="col-md-6 mb-3">
                  <label htmlFor="memory" className="form-label">内存 (MB)*</label>
                  <input type="number" className="form-control" id="memory" name="memory" value={containerFormData.memory} onChange={handleContainerFormChange} required />
                </div>
                <div className="col-md-6 mb-3">
                  <label htmlFor="swap" className="form-label">SWAP (MB)*</label>
                  <input type="number" className="form-control" id="swap" name="swap" value={containerFormData.swap} onChange={handleContainerFormChange} required />
                </div>
                
                <h6 className="mt-3">网络接口 (eth0)</h6>
                <div className="col-md-4 mb-3">
                  <label htmlFor="net_bridge" className="form-label">桥接网卡*</label>
                  <select className="form-select" id="net_bridge" name="network.bridge" value={containerFormData.network.bridge} onChange={handleContainerFormChange} required disabled={!containerFormData.node && !isRebuildMode}>
                     <option value="" disabled>选择桥接</option>
                     {nodeResources.networks.map(n => <option key={n.iface} value={n.iface}>{n.iface} ({n.active ? '活动' : '非活动'}, {n.type})</option>)}
                  </select>
                </div>
                <div className="col-md-4 mb-3">
                  <label htmlFor="net_ip" className="form-label">IP配置 (例: 192.168.1.100/24 或 dhcp)*</label>
                  <input type="text" className="form-control" id="net_ip" name="network.ip" value={containerFormData.network.ip} onChange={handleContainerFormChange} required />
                </div>
                <div className="col-md-4 mb-3">
                  <label htmlFor="net_gw" className="form-label">网关</label>
                  <input type="text" className="form-control" id="net_gw" name="network.gw" value={containerFormData.network.gw} onChange={handleContainerFormChange} />
                </div>
                <div className="col-md-6 mb-3">
                  <label htmlFor="net_vlan" className="form-label">VLAN标签</label>
                  <input type="number" className="form-control" id="net_vlan" name="network.vlan" value={containerFormData.network.vlan === null ? '' : containerFormData.network.vlan} onChange={handleContainerFormChange} />
                </div>
                 <div className="col-md-6 mb-3">
                  <label htmlFor="net_rate" className="form-label">速率限制 (MB/s)</label>
                  <input type="number" className="form-control" id="net_rate" name="network.rate" value={containerFormData.network.rate === null ? '' : containerFormData.network.rate} onChange={handleContainerFormChange} />
                </div>

                <h6 className="mt-3">高级选项</h6>
                 <div className="col-md-12 mb-3">
                    <label htmlFor="features" className="form-label">额外功能 (例: keyctl=1,mount=cifs)</label>
                    <input type="text" className="form-control" id="features" name="features" value={containerFormData.features} onChange={handleContainerFormChange} />
                </div>
                <div className="col-md-6 mb-3">
                    <label htmlFor="console_mode" className="form-label">控制台模式</label>
                    <select className="form-select" id="console_mode" name="console_mode" value={containerFormData.console_mode} onChange={handleContainerFormChange}>
                        <option value="默认 (tty)">默认 (tty)</option>
                        <option value="shell">Shell</option>
                    </select>
                </div>
                <div className="col-md-4 d-flex align-items-center mb-3">
                  <div className="form-check form-switch">
                    <input className="form-check-input" type="checkbox" role="switch" id="nesting" name="nesting" checked={containerFormData.nesting} onChange={handleContainerFormChange} />
                    <label className="form-check-label" htmlFor="nesting">启用嵌套虚拟化</label>
                  </div>
                </div>
                <div className="col-md-4 d-flex align-items-center mb-3">
                  <div className="form-check form-switch">
                    <input className="form-check-input" type="checkbox" role="switch" id="unprivileged" name="unprivileged" checked={containerFormData.unprivileged} onChange={handleContainerFormChange} />
                    <label className="form-check-label" htmlFor="unprivileged">非特权容器</label>
                  </div>
                </div>
                 <div className="col-md-4 d-flex align-items-center mb-3">
                  <div className="form-check form-switch">
                    <input className="form-check-input" type="checkbox" role="switch" id="start" name="start" checked={containerFormData.start} onChange={handleContainerFormChange} />
                    <label className="form-check-label" htmlFor="start">{isRebuildMode ? '重建后启动' : '创建后启动'}</label>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowContainerModal(false)}>关闭</button>
              <button type="submit" className="btn btn-primary" disabled={isLoading}>{isLoading ? '处理中...' : (isRebuildMode ? '确认重建' : '确认创建')}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  const renderConsoleModal = () => (
    <div className={`modal fade ${showConsoleModal ? 'show d-block' : ''}`} tabIndex="-1" style={{backgroundColor: showConsoleModal ? 'rgba(0,0,0,0.5)' : 'transparent'}}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">容器控制台信息</h5>
            <button type="button" className="btn-close" onClick={() => setShowConsoleModal(false)}></button>
          </div>
          <div className="modal-body">
            {consoleInfo ? (
              <>
                <p>请使用noVNC客户端或兼容工具连接到以下地址 (通常需要先通过Proxmox主机地址进行代理访问):</p>
                <p><strong>主机:</strong> {consoleInfo.host} (Proxmox 服务器)</p>
                <p><strong>节点:</strong> {consoleInfo.node}</p>
                <p><strong>端口 (用于 vncproxy):</strong> {consoleInfo.port}</p>
                <p><strong>用户:</strong> {consoleInfo.user}</p>
                <p><strong>票据 (Ticket):</strong></p>
                <textarea className="form-control" rows="3" value={consoleInfo.ticket} readOnly />
                <p className="mt-2"><small>注意: 票据通常有有效期。您可能需要配置 Websockify 才能直接从浏览器访问。</small></p>
                <p><small>一个可能的连接URL (取决于您的noVNC设置): <code>https://{consoleInfo.host}:8006/?console=lxc&vmid={consoleInfo.vmid}&node={consoleInfo.node}&vncticket={encodeURIComponent(consoleInfo.ticket)}</code> (将 {consoleInfo.vmid} 替换为实际 VMID)</small></p>
              </>
            ) : <p>无法加载控制台信息。</p>}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setShowConsoleModal(false)}>关闭</button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="container-fluid mt-3">
      <header className="d-flex flex-wrap align-items-center justify-content-center justify-content-md-between py-3 mb-4 border-bottom">
        <a href="/" className="d-flex align-items-center col-md-3 mb-2 mb-md-0 text-dark text-decoration-none">
          <h4><i className="bi bi-hdd-stack"></i> Proxmox LXC 管理面板</h4>
        </a>
        <div className="col-md-5 text-end">
          <input 
            type="password" 
            className="form-control" 
            placeholder="请输入全局 API 密钥" 
            value={apiKey}
            onChange={handleApiKeyChange} 
          />
        </div>
      </header>

      {renderAlerts()}
      {isLoading && <div className="spinner-border text-primary position-fixed top-50 start-50" role="status"><span className="visually-hidden">加载中...</span></div>}

      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button className={`nav-link ${currentView === 'nodes' ? 'active' : ''}`} onClick={() => setCurrentView('nodes')}>节点管理</button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${currentView === 'containers' ? 'active' : ''}`} onClick={() => setCurrentView('containers')}>容器管理</button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${currentView === 'tasks' ? 'active' : ''}`} onClick={() => setCurrentView('tasks')}>任务状态</button>
        </li>
      </ul>

      {currentView === 'nodes' && renderNodes()}
      {currentView === 'containers' && renderContainers()}
      {currentView === 'tasks' && renderTasks()}
      
      {showContainerModal && renderContainerModal()}
      {showConsoleModal && renderConsoleModal()}

      <footer className="pt-3 mt-4 text-muted border-top">
        &copy; {new Date().getFullYear()} LXC 管理面板
      </footer>
    </div>
  );
}

export default App;
