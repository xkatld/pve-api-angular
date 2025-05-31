import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getContainers, getNodes } from '../apiService';
import { ContainerStatus, NodeInfo } from '../types';
import { useAppContext } from '../AppContext';
import { PlusCircle, ListFilter, RefreshCw, Play, StopCircle, PowerOff, Trash2, Settings2, MonitorPlay, Server } from 'lucide-react';

const ContainersPage: React.FC = () => {
  const [containers, setContainers] = useState<ContainerStatus[]>([]);
  const [nodes, setNodes] = useState<NodeInfo[]>([]);
  const [selectedNodeFilter, setSelectedNodeFilter] = useState<string>('');
  const { notifyError, setIsLoading, notifySuccess } = useAppContext();

  useEffect(() => {
    fetchNodesAndContainers();
  }, [selectedNodeFilter]);

  const fetchNodesAndContainers = async () => {
    setIsLoading(true);
    try {
      const nodesResponse = await getNodes();
      if (nodesResponse.success && nodesResponse.data) {
        setNodes(nodesResponse.data);
      } else {
        notifyError(nodesResponse.message || '获取节点列表失败');
      }
      await fetchContainersOnly();
    } catch (error: any) {
      notifyError(error.message || '获取数据时发生错误');
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchContainersOnly = async () => {
    setIsLoading(true);
    try {
      const response = await getContainers(selectedNodeFilter || undefined);
      if (response.containers) {
        setContainers(response.containers);
      } else {
        notifyError('获取容器列表数据格式错误');
      }
    } catch (error: any) {
      notifyError(error.message || '获取容器列表时发生错误');
    } finally {
      setIsLoading(false);
    }
  }


  const formatBytes = (bytes?: number, decimals = 2) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: string) => {
    if (status === 'running') return 'text-green-500';
    if (status === 'stopped') return 'text-red-500';
    return 'text-gray-500';
  };
  
  const formatUptime = (seconds?: number) => {
    if (seconds === undefined || seconds === null) return '-';
    if (seconds === 0) return '0 分钟';
    const d = Math.floor(seconds / (3600*24));
    const h = Math.floor(seconds % (3600*24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    return `${d > 0 ? d + '天 ' : ''}${h > 0 ? h + '小时 ' : ''}${m}分钟`;
  }


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-semibold text-gray-800">容器管理</h1>
        <div className="flex items-center space-x-2">
            <button
             onClick={fetchContainersOnly}
             className="p-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center space-x-1"
            >
             <RefreshCw size={16}/>
             <span>刷新</span>
            </button>
            <Link
                to="/containers/create"
                className="p-2 text-sm bg-green-500 text-white rounded-md hover:bg-green-600 flex items-center space-x-1"
            >
                <PlusCircle size={16} />
                <span>创建容器</span>
            </Link>
        </div>
      </div>

      <div className="mb-4">
        <label htmlFor="nodeFilter" className="mr-2 text-sm font-medium text-gray-700">按节点筛选:</label>
        <select
          id="nodeFilter"
          value={selectedNodeFilter}
          onChange={(e) => setSelectedNodeFilter(e.target.value)}
          className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">所有节点</option>
          {nodes.map(node => (
            <option key={node.node} value={node.node}>{node.node}</option>
          ))}
        </select>
      </div>

      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">VMID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">名称</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">节点</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CPU</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">内存</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">在线时长</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {containers.map((ct) => (
              <tr key={`${ct.node}-${ct.vmid}`}>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{ct.vmid}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{ct.name}</td>
                <td className={`px-4 py-3 whitespace-nowrap text-sm font-semibold ${getStatusColor(ct.status)}`}>{ct.status}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{ct.node}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{(ct.cpu ?? 0 * 100).toFixed(1)}%</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {formatBytes(ct.mem)} / {formatBytes(ct.maxmem)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{formatUptime(ct.uptime)}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                   <Link to={`/containers/${ct.node}/${ct.vmid}`} className="text-blue-600 hover:text-blue-800">
                    详情/管理
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {containers.length === 0 && <p className="text-center py-4 text-gray-500">没有找到容器。</p>}
      </div>
    </div>
  );
};

export default ContainersPage;
