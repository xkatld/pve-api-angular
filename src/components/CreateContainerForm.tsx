import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ContainerCreatePayload, NetworkInterface, ConsoleMode, NodeInfo, NodeResource } from '../types';
import { createContainer, getNodes, getNodeTemplates, getNodeStorages, getNodeNetworks } from '../apiService';
import { useAppContext } from '../AppContext';

const initialFormData: ContainerCreatePayload = {
  node: '',
  vmid: 0,
  hostname: '',
  password: '',
  ostemplate: '',
  storage: '',
  disk_size: 8,
  cores: 1,
  cpulimit: undefined,
  memory: 512,
  swap: 512,
  network: {
    name: 'eth0',
    bridge: '',
    ip: 'dhcp',
    gw: undefined,
    vlan: undefined,
    rate: undefined,
  },
  nesting: false,
  unprivileged: true,
  start: false,
  features: undefined,
  console_mode: ConsoleMode.DEFAULT_TTY,
};

const CreateContainerForm: React.FC = () => {
  const [formData, setFormData] = useState<ContainerCreatePayload>(initialFormData);
  const [nodes, setNodes] = useState<NodeInfo[]>([]);
  const [templates, setTemplates] = useState<NodeResource[]>([]);
  const [storages, setStorages] = useState<NodeResource[]>([]);
  const [bridges, setBridges] = useState<NodeResource[]>([]);
  
  const { notifyError, notifySuccess, setIsLoading } = useAppContext();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const nodesRes = await getNodes();
        if (nodesRes.success && nodesRes.data) {
          setNodes(nodesRes.data);
          if (nodesRes.data.length > 0) {
            setFormData(prev => ({ ...prev, node: nodesRes.data![0].node }));
          }
        } else {
          notifyError(nodesRes.message || "无法加载节点列表");
        }
      } catch (err: any) {
        notifyError(err.message || "加载初始数据失败");
      }
      setIsLoading(false);
    };
    fetchData();
  }, [notifyError, setIsLoading]);

  useEffect(() => {
    if (formData.node) {
      const fetchNodeSpecificData = async () => {
        setIsLoading(true);
        try {
          const templatesRes = await getNodeTemplates(formData.node);
          if (templatesRes.success && templatesRes.data) setTemplates(templatesRes.data);
          else notifyError(templatesRes.message || `无法加载节点 ${formData.node} 的模板`);

          const storagesRes = await getNodeStorages(formData.node);
          if (storagesRes.success && storagesRes.data) {
            const rootFsStorages = storagesRes.data.filter(s => s.content && s.content.includes('rootdir'));
            setStorages(rootFsStorages);
            if (rootFsStorages.length > 0 && !formData.storage) {
                setFormData(prev => ({ ...prev, storage: rootFsStorages[0].storage }));
            }
          }
          else notifyError(storagesRes.message || `无法加载节点 ${formData.node} 的存储`);
          
          const networksRes = await getNodeNetworks(formData.node);
          if (networksRes.success && networksRes.data) {
            setBridges(networksRes.data);
             if (networksRes.data.length > 0 && !formData.network.bridge) {
                 setFormData(prev => ({ ...prev, network: {...prev.network, bridge: networksRes.data![0].iface} }));
             }
          } else {
            notifyError(networksRes.message || `无法加载节点 ${formData.node} 的网络`);
          }

        } catch (err: any) {
          notifyError(err.message || `加载节点 ${formData.node} 的数据失败`);
        }
        setIsLoading(false);
      };
      fetchNodeSpecificData();
    }
  }, [formData.node, setIsLoading, notifyError]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    if (name.startsWith("network.")) {
      const netField = name.split(".")[1] as keyof NetworkInterface;
      setFormData(prev => ({
        ...prev,
        network: {
          ...prev.network,
          [netField]: type === 'number' ? parseInt(value) || undefined : value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : type === 'number' ? parseInt(value) : value
      }));
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const payload = {
          ...formData,
          vmid: Number(formData.vmid),
          cores: Number(formData.cores),
          memory: Number(formData.memory),
          swap: Number(formData.swap),
          disk_size: Number(formData.disk_size),
          cpulimit: formData.cpulimit ? Number(formData.cpulimit) : undefined,
          network: {
              ...formData.network,
              vlan: formData.network.vlan ? Number(formData.network.vlan) : undefined,
              rate: formData.network.rate ? Number(formData.network.rate) : undefined,
          }
      };

      const response = await createContainer(payload);
      if (response.success) {
        notifySuccess(response.message || '创建容器任务已启动');
        if (response.data?.task_id) {
          notifyInfo(`任务 ID: ${response.data.task_id}. 您可以在任务状态页面跟踪进度。`);
        }
        navigate('/containers');
      } else {
        notifyError(response.message || '创建容器失败');
      }
    } catch (error: any) {
      notifyError(error.message || '创建容器时发生错误');
    } finally {
      setIsLoading(false);
    }
  };
  
  const inputClass = "mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm";
  const labelClass = "block text-sm font-medium text-gray-700";

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-white rounded-lg shadow space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="node" className={labelClass}>目标节点</label>
          <select name="node" id="node" value={formData.node} onChange={handleChange} className={inputClass} required>
            <option value="" disabled>选择一个节点</option>
            {nodes.map(n => <option key={n.node} value={n.node}>{n.node}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="vmid" className={labelClass}>VMID</label>
          <input type="number" name="vmid" id="vmid" value={formData.vmid} onChange={handleChange} className={inputClass} required min="100" />
        </div>
        <div>
          <label htmlFor="hostname" className={labelClass}>主机名</label>
          <input type="text" name="hostname" id="hostname" value={formData.hostname} onChange={handleChange} className={inputClass} required />
        </div>
        <div>
          <label htmlFor="password" className={labelClass}>密码</label>
          <input type="password" name="password" id="password" value={formData.password} onChange={handleChange} className={inputClass} required />
        </div>
         <div>
          <label htmlFor="ostemplate" className={labelClass}>操作系统模板</label>
          <select name="ostemplate" id="ostemplate" value={formData.ostemplate} onChange={handleChange} className={inputClass} required>
            <option value="" disabled>选择模板</option>
            {templates.map(t => <option key={t.volid} value={t.volid}>{t.volid.split('/')[1] || t.volid} ({t.format})</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="storage" className={labelClass}>根文件系统存储</label>
          <select name="storage" id="storage" value={formData.storage} onChange={handleChange} className={inputClass} required>
             <option value="" disabled>选择存储</option>
            {storages.map(s => <option key={s.storage} value={s.storage}>{s.storage} ({s.type})</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="disk_size" className={labelClass}>磁盘大小 (GB)</label>
          <input type="number" name="disk_size" id="disk_size" value={formData.disk_size} onChange={handleChange} className={inputClass} required min="1"/>
        </div>
        <div>
          <label htmlFor="cores" className={labelClass}>CPU核心数</label>
          <input type="number" name="cores" id="cores" value={formData.cores} onChange={handleChange} className={inputClass} required min="1"/>
        </div>
        <div>
          <label htmlFor="cpulimit" className={labelClass}>CPU限制 (0为无限制)</label>
          <input type="number" name="cpulimit" id="cpulimit" value={formData.cpulimit ?? ''} onChange={handleChange} className={inputClass} min="0"/>
        </div>
        <div>
          <label htmlFor="memory" className={labelClass}>内存 (MB)</label>
          <input type="number" name="memory" id="memory" value={formData.memory} onChange={handleChange} className={inputClass} required min="64"/>
        </div>
        <div>
          <label htmlFor="swap" className={labelClass}>SWAP (MB)</label>
          <input type="number" name="swap" id="swap" value={formData.swap} onChange={handleChange} className={inputClass} required min="0"/>
        </div>
      </div>

      <fieldset className="border p-4 rounded-md">
        <legend className="text-lg font-medium text-gray-700 px-2">网络配置 (eth0)</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
            <div>
                <label htmlFor="network.bridge" className={labelClass}>桥接网卡</label>
                <select name="network.bridge" id="network.bridge" value={formData.network.bridge} onChange={handleChange} className={inputClass} required>
                    <option value="" disabled>选择桥接网卡</option>
                    {bridges.map(b => <option key={b.iface} value={b.iface}>{b.iface} ({b.type})</option>)}
                </select>
            </div>
            <div>
                <label htmlFor="network.ip" className={labelClass}>IP地址 (例如: 192.168.1.100/24 或 dhcp)</label>
                <input type="text" name="network.ip" id="network.ip" value={formData.network.ip} onChange={handleChange} className={inputClass} required />
            </div>
            <div>
                <label htmlFor="network.gw" className={labelClass}>网关</label>
                <input type="text" name="network.gw" id="network.gw" value={formData.network.gw ?? ''} onChange={handleChange} className={inputClass} />
            </div>
            <div>
                <label htmlFor="network.vlan" className={labelClass}>VLAN标签</label>
                <input type="number" name="network.vlan" id="network.vlan" value={formData.network.vlan ?? ''} onChange={handleChange} className={inputClass} />
            </div>
             <div>
                <label htmlFor="network.rate" className={labelClass}>速率限制 (MB/s)</label>
                <input type="number" name="network.rate" id="network.rate" value={formData.network.rate ?? ''} onChange={handleChange} className={inputClass} min="0"/>
            </div>
        </div>
      </fieldset>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
         <div className="flex items-center space-x-2">
          <input type="checkbox" name="nesting" id="nesting" checked={!!formData.nesting} onChange={handleChange} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
          <label htmlFor="nesting" className={labelClass}>启用嵌套虚拟化</label>
        </div>
        <div className="flex items-center space-x-2">
          <input type="checkbox" name="unprivileged" id="unprivileged" checked={!!formData.unprivileged} onChange={handleChange} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
          <label htmlFor="unprivileged" className={labelClass}>非特权容器</label>
        </div>
        <div className="flex items-center space-x-2">
          <input type="checkbox" name="start" id="start" checked={!!formData.start} onChange={handleChange} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
          <label htmlFor="start" className={labelClass}>创建后启动</label>
        </div>
         <div>
          <label htmlFor="features" className={labelClass}>额外特性 (例如: keyctl=1,mount=cifs)</label>
          <input type="text" name="features" id="features" value={formData.features ?? ''} onChange={handleChange} className={inputClass} />
        </div>
         <div>
          <label htmlFor="console_mode" className={labelClass}>控制台模式</label>
          <select name="console_mode" id="console_mode" value={formData.console_mode ?? ''} onChange={handleChange} className={inputClass}>
            {Object.values(ConsoleMode).map(mode => (
              <option key={mode} value={mode}>{mode}</option>
            ))}
          </select>
        </div>
      </div>

      <button type="submit" className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
        创建容器
      </button>
    </form>
  );
};

export default CreateContainerForm;
