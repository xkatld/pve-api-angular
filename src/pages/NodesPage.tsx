import React, { useEffect, useState } from 'react';
import { getNodes, getNodeTemplates, getNodeStorages, getNodeNetworks } from '../apiService';
import { NodeInfo, NodeResource } from '../types';
import { useAppContext } from '../AppContext';
import { ChevronDown, ChevronRight, FileText, Database, Network, Server } from 'lucide-react';

const NodesPage: React.FC = () => {
  const [nodes, setNodes] = useState<NodeInfo[]>([]);
  const [selectedNode, setSelectedNode] = useState<NodeInfo | null>(null);
  const [templates, setTemplates] = useState<NodeResource[]>([]);
  const [storages, setStorages] = useState<NodeResource[]>([]);
  const [networks, setNetworks] = useState<NodeResource[]>([]);
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({});

  const { notifyError, setIsLoading, notifySuccess } = useAppContext();

  useEffect(() => {
    fetchNodes();
  }, []);

  const fetchNodes = async () => {
    setIsLoading(true);
    try {
      const response = await getNodes();
      if (response.success && response.data) {
        setNodes(response.data);
      } else {
        notifyError(response.message || '获取节点列表失败');
      }
    } catch (error: any) {
      notifyError(error.message || '获取节点列表时发生错误');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchNodeDetails = async (nodeName: string, type: 'templates' | 'storages' | 'networks') => {
    setIsLoading(true);
    try {
      let response;
      if (type === 'templates') {
        response = await getNodeTemplates(nodeName);
        if (response.success && response.data) setTemplates(response.data);
      } else if (type === 'storages') {
        response = await getNodeStorages(nodeName);
        if (response.success && response.data) setStorages(response.data);
      } else {
        response = await getNodeNetworks(nodeName);
        if (response.success && response.data) setNetworks(response.data);
      }

      if (!response.success) {
        notifyError(response.message || `获取节点 ${type} 失败`);
      } else {
        notifySuccess(`节点 ${nodeName} 的 ${type} 信息已加载`);
      }
    } catch (error: any) {
      notifyError(error.message || `获取节点 ${type} 时发生错误`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNodeSelect = (node: NodeInfo) => {
    setSelectedNode(node);
    setTemplates([]);
    setStorages([]);
    setNetworks([]);
    setExpandedDetails({});
  };

  const toggleDetail = (detailType: 'templates' | 'storages' | 'networks') => {
    if (selectedNode) {
      const currentlyExpanded = expandedDetails[detailType];
      setExpandedDetails(prev => ({ ...Object.fromEntries(Object.keys(prev).map(k => [k, false])), [detailType]: !currentlyExpanded }));
      if (!currentlyExpanded) {
         fetchNodeDetails(selectedNode.node, detailType);
      }
    }
  };
  
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600*24));
    const h = Math.floor(seconds % (3600*24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    return `${d}天 ${h}小时 ${m}分钟`;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold text-gray-800">节点管理</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {nodes.map((node) => (
          <div
            key={node.node}
            onClick={() => handleNodeSelect(node)}
            className={`p-4 bg-white rounded-lg shadow cursor-pointer hover:shadow-lg transition-shadow ${selectedNode?.node === node.node ? 'ring-2 ring-blue-500' : ''}`}
          >
            <div className="flex items-center space-x-3 mb-2">
                <Server className="text-blue-500" size={24} />
                <h2 className="text-xl font-semibold text-gray-700">{node.node}</h2>
            </div>
            <p className={`text-sm ${node.status === 'online' ? 'text-green-600' : 'text-red-600'}`}>状态: {node.status}</p>
            <p className="text-sm text-gray-500">CPU: {node.cpu.toFixed(2)}% ({node.maxcpu} 核)</p>
            <p className="text-sm text-gray-500">内存: {formatBytes(node.mem)} / {formatBytes(node.maxmem)}</p>
            <p className="text-sm text-gray-500">磁盘: {formatBytes(node.disk)} / {formatBytes(node.maxdisk)}</p>
            <p className="text-sm text-gray-500">在线时长: {formatUptime(node.uptime)}</p>
          </div>
        ))}
      </div>

      {selectedNode && (
        <div className="mt-6 p-6 bg-white rounded-lg shadow">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">节点详情: {selectedNode.node}</h2>
          <div className="space-y-3">
            <CollapsibleSection title="可用模板" icon={<FileText size={20}/>} isOpen={expandedDetails['templates']} onToggle={() => toggleDetail('templates')}>
              {templates.length > 0 ? (
                <ul className="list-disc pl-5 space-y-1 max-h-60 overflow-y-auto">
                  {templates.map((template, index) => (
                    <li key={index} className="text-sm text-gray-600">{template.volid} ({formatBytes(template.size)})</li>
                  ))}
                </ul>
              ) : <p className="text-sm text-gray-500">{expandedDetails['templates'] ? '没有可用的模板或正在加载...' : '点击展开查看模板'}</p>}
            </CollapsibleSection>

            <CollapsibleSection title="存储资源" icon={<Database size={20}/>} isOpen={expandedDetails['storages']} onToggle={() => toggleDetail('storages')}>
              {storages.length > 0 ? (
                <div className="overflow-x-auto max-h-60">
                    <table className="min-w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th scope="col" className="px-4 py-2">名称</th>
                                <th scope="col" className="px-4 py-2">类型</th>
                                <th scope="col" className="px-4 py-2">可用空间</th>
                                <th scope="col" className="px-4 py-2">总空间</th>
                                <th scope="col" className="px-4 py-2">内容</th>
                            </tr>
                        </thead>
                        <tbody>
                            {storages.map((storage, index) => (
                                <tr key={index} className="bg-white border-b">
                                    <td className="px-4 py-2">{storage.storage}</td>
                                    <td className="px-4 py-2">{storage.type}</td>
                                    <td className="px-4 py-2">{formatBytes(storage.avail)}</td>
                                    <td className="px-4 py-2">{formatBytes(storage.total)}</td>
                                    <td className="px-4 py-2">{storage.content}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
              ) : <p className="text-sm text-gray-500">{expandedDetails['storages'] ? '没有可用的存储或正在加载...' : '点击展开查看存储'}</p>}
            </CollapsibleSection>

            <CollapsibleSection title="网络接口" icon={<Network size={20}/>} isOpen={expandedDetails['networks']} onToggle={() => toggleDetail('networks')}>
              {networks.length > 0 ? (
                 <div className="overflow-x-auto max-h-60">
                    <table className="min-w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th scope="col" className="px-4 py-2">接口名称</th>
                                <th scope="col" className="px-4 py-2">类型</th>
                                <th scope="col" className="px-4 py-2">活动</th>
                                <th scope="col" className="px-4 py-2">备注</th>
                            </tr>
                        </thead>
                        <tbody>
                            {networks.map((network, index) => (
                                <tr key={index} className="bg-white border-b">
                                    <td className="px-4 py-2">{network.iface}</td>
                                    <td className="px-4 py-2">{network.type}</td>
                                    <td className="px-4 py-2">{network.active ? '是' : '否'}</td>
                                    <td className="px-4 py-2">{network.comments || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
              ) : <p className="text-sm text-gray-500">{expandedDetails['networks'] ? '没有可用的网络接口或正在加载...' : '点击展开查看网络接口'}</p>}
            </CollapsibleSection>
          </div>
        </div>
      )}
    </div>
  );
};

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, icon, isOpen, onToggle, children }) => {
  return (
    <div className="border border-gray-200 rounded-md">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 focus:outline-none"
      >
        <div className="flex items-center space-x-2">
            {icon}
            <span className="font-medium text-gray-700">{title}</span>
        </div>
        {isOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
      </button>
      {isOpen && <div className="p-3 border-t border-gray-200">{children}</div>}
    </div>
  );
};

export default NodesPage;
