import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ContainerRebuildPayload, NetworkInterface, ConsoleMode, NodeResource, ContainerStatus } from '../types';
import { rebuildContainer, getNodeTemplates, getNodeStorages, getNodeNetworks, getContainerStatus } from '../apiService';
import { useAppContext } from '../AppContext';

interface RebuildContainerFormProps {
  node: string;
  vmid: string;
}

const RebuildContainerForm: React.FC<RebuildContainerFormProps> = ({ node, vmid }) => {
  const [formData, setFormData] = useState<Partial<ContainerRebuildPayload>>({});
  const [templates, setTemplates] = useState<NodeResource[]>([]);
  const [storages, setStorages] = useState<NodeResource[]>([]);
  const [bridges, setBridges] = useState<NodeResource[]>([]);
  
  const { notifyError, notifySuccess, setIsLoading } = useAppContext();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        const statusRes = await getContainerStatus(node,vmid);
        // Pydantic schema `ContainerStatus` does not provide full config.
        // We should ideally fetch full config for defaults, but API for that is not exposed in current backend.
        // Setting some sensible defaults or leaving blank.
        setFormData({
            hostname: statusRes.name || `ct-${vmid}`,
            cores: 1, 
            memory: statusRes.maxmem ? Math.floor(statusRes.maxmem / (1024*1024)) : 512,
            swap: 512, // Default, cannot get from status
            disk_size: 8, // Default
            network: { name: 'eth0', ip: 'dhcp', bridge: ''}, // Default
            unprivileged: true, // Default
            nesting: false, // Default
            start: false, // Default
            console_mode: ConsoleMode.DEFAULT_TTY, // Default
        });

        const templatesRes = await getNodeTemplates(node);
        if (templatesRes.success && templatesRes.data) setTemplates(templatesRes.data);
        else notifyError(templatesRes.message || `无法加载节点 ${node} 的模板`);

        const storagesRes = await getNodeStorages(node);
         if (storagesRes.success && storagesRes.data) {
            const rootFsStorages = storagesRes.data.filter(s => s.content && s.content.includes('rootdir'));
            setStorages(rootFsStorages);
            if (rootFsStorages.length > 0 && !formData.storage) {
                 setFormData(prev => ({ ...prev, storage: rootFsStorages[0].storage }));
            }
          }
        else notifyError(storagesRes.message || `无法加载节点 ${node} 的存储`);
        
        const networksRes = await getNodeNetworks(node);
        if (networksRes.success && networksRes.data) {
          setBridges(networksRes.data);
           if (networksRes.data.length > 0 && !formData.network?.bridge) {
               setFormData(prev => ({ ...prev, network: {...(prev.network || {name: 'eth0', ip: 'dhcp'}), bridge: networksRes.data![0].iface} }));
           }
        } else {
          notifyError(networksRes.message || `无法加载节点 ${node} 的网络`);
        }

      } catch (err: any) {
        notifyError(err.message || `加载重建数据失败`);
      }
      setIsLoading(false);
    };
    fetchInitialData();
  }, [node, vmid, setIsLoading, notifyError]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    if (name.startsWith("network.")) {
      const netField = name.split(".")[1] as keyof NetworkInterface;
      setFormData(prev => ({
        ...prev,
        network: {
          ...(prev.network || {name: 'eth0', ip: 'dhcp', bridge: ''}), // Ensure network object exists
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
    
    const { ostemplate, hostname, password, storage, disk_size, cores, memory, swap, network } = formData;
    if (!ostemplate || !hostname || !password || !storage || !disk_size || !cores || !memory || !swap || !network?.bridge) {
        notifyError("请填写所有必填字段（模板, 主机名, 密码, 存储, 磁盘, CPU, 内存, Swap, 网络桥接）。");
        setIsLoading(false);
        return;
    }

    try {
      const payload: ContainerRebuildPayload = {
          ostemplate, hostname, password, storage,
          disk_size: Number(disk_size),
          cores: Number(cores),
          memory: Number(memory),
          swap: Number(swap),
          network: {
              name: network.name || 'eth0',
              bridge: network.bridge,
              ip: network.ip || 'dhcp',
              gw: network.gw || undefined,
              vlan: network.vlan ? Number(network.vlan) : undefined,
              rate: network.rate ? Number(network.rate) : undefined,
          },
          cpulimit: formData.cpulimit ? Number(formData.cpulimit) : undefined,
          nesting: !!formData.nesting,
          unprivileged: !!formData.unprivileged,
          start: !!formData.start,
          features: formData.features || undefined,
          console_mode: formData.console_mode || ConsoleMode.DEFAULT_TTY,
      };

      const response = await rebuildContainer(node, vmid, payload);
      if (response.success) {
        notifySuccess(response.message || '重建容器任务已启动');
        if (response.data?.task_id) {
          notifyInfo(`任务 ID: ${response.data.task_id}. 您可以在任务状态页面跟踪进度。`);
        }
        navigate(`/containers/${node}/${vmid}`);
      } else {
        notifyError(response.message || '重建容器失败');
      }
    } catch (error: any) {
      notifyError(error.message || '重建容器时发生错误');
    } finally {
      setIsLoading(false);
    }
  };
  
  const inputClass = "mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm";
  const labelClass = "block text-sm font-medium text-gray-700";

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-white rounded-lg shadow space-y-6">
      <p className="text-sm text-yellow-700 bg-yellow-100 p-3 rounded-md">
        警告：重建容器将会删除现有容器及其所有数据，并使用新配置重新创建一个同名容器。此操作不可逆。
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="hostname" className={labelClass}>新主机名</label>
          <input type="text" name="hostname" id="hostname" value={formData.hostname || ''} onChange={handleChange} className={inputClass} required />
        </div>
        <div>
          <label htmlFor="password" className={labelClass}>新密码</label>
          <input type="password" name="password" id="password" value={formData.password || ''} onChange={handleChange} className={inputClass} required />
        </div>
         <div>
          <label htmlFor="ostemplate" className={labelClass}>新操作系统模板</label>
          <select name="ostemplate" id="ostemplate" value={formData.ostemplate || ''} onChange={handleChange} className={inputClass} required>
            <option value="" disabled>选择模板</option>
            {templates.map(t => <option key={t.volid} value={t.volid}>{t.volid.split('/')[1] || t.volid} ({t.format})</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="storage" className={labelClass}>新根文件系统存储</label>
          <select name="storage" id="storage" value={formData.storage || ''} onChange={handleChange} className={inputClass} required>
             <option value="" disabled>选择存储</option>
            {storages.map(s => <option key={s.storage} value={s.storage}>{s.storage} ({s.type})</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="disk_size" className={labelClass}>新磁盘大小 (GB)</label>
          <input type="number" name="disk_size" id="disk_size" value={formData.disk_size || ''} onChange={handleChange} className={inputClass} required min="1"/>
        </div>
        <div>
          <label htmlFor="cores" className={labelClass}>新CPU核心数</label>
          <input type="number" name="cores" id="cores" value={formData.cores || ''} onChange={handleChange} className={inputClass} required min="1"/>
        </div>
        <div>
          <label htmlFor="cpulimit" className={labelClass}>新CPU限制 (0为无限制)</label>
          <input type="number" name="cpulimit" id="cpulimit" value={formData.cpulimit ?? ''} onChange={handleChange} className={inputClass} min="0"/>
        </div>
        <div>
          <label htmlFor="memory" className={labelClass}>新内存 (MB)</label>
          <input type="number" name="memory" id="memory" value={formData.memory || ''} onChange={handleChange} className={inputClass} required min="64"/>
        </div>
        <div>
          <label htmlFor="swap" className={labelClass}>新SWAP (MB)</label>
          <input type="number" name="swap" id="swap" value={formData.swap || ''} onChange={handleChange} className={inputClass} required min="0"/>
        </div>
      </div>

      <fieldset className="border p-4 rounded-md">
        <legend className="text-lg font-medium text-gray-700 px-2">新网络配置 (eth0)</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
            <div>
                <label htmlFor="network.bridge" className={labelClass}>桥接网卡</label>
                <select name="network.bridge" id="network.bridge" value={formData.network?.bridge || ''} onChange={handleChange} className={inputClass} required>
                    <option value="" disabled>选择桥接网卡</option>
                    {bridges.map(b => <option key={b.iface} value={b.iface}>{b.iface} ({b.type})</option>)}
                </select>
            </div>
            <div>
                <label htmlFor="network.ip" className={labelClass}>IP地址 (例如: 192.168.1.100/24 或 dhcp)</label>
                <input type="text" name="network.ip" id="network.ip" value={formData.network?.ip || ''} onChange={handleChange} className={inputClass} required />
            </div>
            <div>
                <label htmlFor="network.gw" className={labelClass}>网关</label>
                <input type="text" name="network.gw" id="network.gw" value={formData.network?.gw ?? ''} onChange={handleChange} className={inputClass} />
            </div>
            <div>
                <label htmlFor="network.vlan" className={labelClass}>VLAN标签</label>
                <input type="number" name="network.vlan" id="network.vlan" value={formData.network?.vlan ?? ''} onChange={handleChange} className={inputClass} />
            </div>
             <div>
                <label htmlFor="network.rate" className={labelClass}>速率限制 (MB/s)</label>
                <input type="number" name="network.rate" id="network.rate" value={formData.network?.rate ?? ''} onChange={handleChange} className={inputClass} min="0"/>
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
          <label htmlFor="start" className={labelClass}>重建后启动</label>
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

      <button type="submit" className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-md shadow focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2">
        确认重建容器
      </button>
    </form>
  );
};

export default RebuildContainerForm;
