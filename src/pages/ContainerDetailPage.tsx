import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  getContainerStatus, startContainer, stopContainer, shutdownContainer,
  rebootContainer, deleteContainer, getContainerConsole
} from '../apiService';
import { ContainerStatus, ConsoleTicket } from '../types';
import { useAppContext } from '../AppContext';
import { Play, StopCircle, Power, RefreshCw, Trash2, Settings2, Terminal, AlertTriangle } from 'lucide-react';

const ContainerDetailPage: React.FC = () => {
  const { node, vmid } = useParams<{ node: string; vmid: string }>();
  const [container, setContainer] = useState<ContainerStatus | null>(null);
  const [consoleInfo, setConsoleInfo] = useState<ConsoleTicket | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { notifyError, notifySuccess, setIsLoading, notifyInfo } = useAppContext();
  const navigate = useNavigate();

  const fetchStatus = useCallback(async () => {
    if (!node || !vmid) return;
    setIsLoading(true);
    try {
      const data = await getContainerStatus(node, vmid);
      setContainer(data);
    } catch (error: any) {
      notifyError(error.message || '获取容器状态失败');
      navigate('/containers');
    } finally {
      setIsLoading(false);
    }
  }, [node, vmid, setIsLoading, notifyError, navigate]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleAction = async (action: () => Promise<any>, successMessage: string) => {
    setIsLoading(true);
    try {
      const response = await action();
      if (response.success) {
        notifySuccess(response.message || successMessage);
        if (response.data?.task_id) {
            notifyInfo(`任务 ID: ${response.data.task_id}. 您可以在任务状态页面跟踪进度。`);
        }
        setTimeout(fetchStatus, 2000); // Refresh status after a delay
      } else {
        notifyError(response.message || '操作失败');
      }
    } catch (error: any) {
      notifyError(error.message || '操作时发生错误');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!node || !vmid) return;
    setShowDeleteConfirm(false);
    await handleAction(() => deleteContainer(node, vmid), '删除容器任务已启动');
    navigate('/containers'); 
  };

  const handleConsole = async () => {
    if (!node || !vmid) return;
    await handleAction(async () => {
      const res = await getContainerConsole(node, vmid);
      if (res.success && res.data) setConsoleInfo(res.data);
      return res;
    }, '获取控制台信息成功');
  };
  
  const formatBytes = (bytes?: number, decimals = 2) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds?: number) => {
    if (seconds === undefined || seconds === null) return '-';
    if (seconds === 0) return '0 分钟';
    const d = Math.floor(seconds / (3600*24));
    const h = Math.floor(seconds % (3600*24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    return `${d > 0 ? d + '天 ' : ''}${h > 0 ? h + '小时 ' : ''}${m}分钟`;
  }

  if (!container) {
    return <div className="p-6 text-center">正在加载容器信息...</div>;
  }
  
  const isRunning = container.status === 'running';
  const isStopped = container.status === 'stopped';

  return (
    <div className="p-6 bg-white rounded-lg shadow space-y-6">
      <div className="flex justify-between items-start">
        <div>
            <h1 className="text-3xl font-semibold text-gray-800">容器: {container.name} ({container.vmid})</h1>
            <p className="text-gray-500">节点: {container.node}</p>
        </div>
        <button onClick={fetchStatus} className="p-2 bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200">
            <RefreshCw size={20}/>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <p><span className="font-semibold">状态:</span> <span className={`font-bold ${isRunning ? 'text-green-600' : isStopped ? 'text-red-600' : 'text-gray-600'}`}>{container.status}</span></p>
        <p><span className="font-semibold">CPU 使用率:</span> {(container.cpu ?? 0 * 100).toFixed(2)}%</p>
        <p><span className="font-semibold">内存使用:</span> {formatBytes(container.mem)} / {formatBytes(container.maxmem)}</p>
        <p><span className="font-semibold">在线时长:</span> {formatUptime(container.uptime)}</p>
      </div>

      <div className="flex flex-wrap gap-3 pt-4 border-t">
        <button
          onClick={() => handleAction(() => startContainer(node!, vmid!), '启动容器任务已启动')}
          disabled={isRunning}
          className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-300"
        > <Play size={18}/> <span>启动</span> </button>
        <button
          onClick={() => handleAction(() => shutdownContainer(node!, vmid!), '关闭容器任务已启动')}
          disabled={isStopped}
          className="flex items-center space-x-2 px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 disabled:bg-gray-300"
        > <Power size={18}/> <span>关闭</span></button>
         <button
          onClick={() => handleAction(() => stopContainer(node!, vmid!), '强制停止容器任务已启动')}
          disabled={isStopped}
          className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-300"
        > <StopCircle size={18}/> <span>强制停止</span></button>
        <button
          onClick={() => handleAction(() => rebootContainer(node!, vmid!), '重启容器任务已启动')}
          disabled={isStopped}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300"
        > <RefreshCw size={18}/> <span>重启</span></button>
         <Link
            to={`/containers/${node}/${vmid}/rebuild`}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600"
        > <Settings2 size={18}/> <span>重建</span></Link>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-red-700 text-white rounded-md hover:bg-red-800"
        > <Trash2 size={18}/> <span>删除</span></button>
        <button
          onClick={handleConsole}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800"
        > <Terminal size={18}/> <span>控制台</span></button>
      </div>
      
      {consoleInfo && (
        <div className="mt-4 p-4 bg-gray-100 rounded-md text-sm">
          <h3 className="font-semibold text-md mb-2">控制台连接信息:</h3>
          <p>主机: {consoleInfo.host} (Proxmox 主机)</p>
          <p>节点: {consoleInfo.node}</p>
          <p>端口: {consoleInfo.port}</p>
          <p>用户: {consoleInfo.user}</p>
          <p>票据 (Ticket): <span className="break-all">{consoleInfo.ticket}</span></p>
          <p className="mt-2 text-xs text-gray-500">您可能需要使用 VNC 客户端或 noVNC 连接到此控制台。</p>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm mx-auto">
            <div className="flex items-center mb-4">
                <AlertTriangle size={24} className="text-red-500 mr-3"/>
                <h3 className="text-xl font-semibold text-gray-800">确认删除</h3>
            </div>
            <p className="text-gray-600 mb-6">您确定要删除容器 {container.name} ({container.vmid}) 吗？此操作不可恢复。</p>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">取消</button>
              <button onClick={handleDelete} className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700">确认删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContainerDetailPage;
