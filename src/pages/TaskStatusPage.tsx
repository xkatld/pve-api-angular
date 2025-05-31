import React, { useState } from 'react';
import { getTaskStatus, getNodes } from '../apiService';
import { TaskStatusInfo, NodeInfo } from '../types';
import { useAppContext } from '../AppContext';
import { Search } from 'lucide-react';

const TaskStatusPage: React.FC = () => {
  const [nodeInput, setNodeInput] = useState('');
  const [taskIdInput, setTaskIdInput] = useState('');
  const [taskStatus, setTaskStatus] = useState<TaskStatusInfo | null>(null);
  const [availableNodes, setAvailableNodes] = useState<NodeInfo[]>([]);
  const { notifyError, setIsLoading, notifySuccess } = useAppContext();

  React.useEffect(() => {
    const fetchNodesList = async () => {
      try {
        const response = await getNodes();
        if (response.success && response.data) {
          setAvailableNodes(response.data);
          if (response.data.length > 0 && !nodeInput) {
            setNodeInput(response.data[0].node);
          }
        }
      } catch (error) {
        notifyError('获取可用节点列表失败');
      }
    };
    fetchNodesList();
  }, []);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nodeInput || !taskIdInput) {
      notifyError('请输入节点名称和任务 ID');
      return;
    }
    setIsLoading(true);
    setTaskStatus(null);
    try {
      const response = await getTaskStatus(nodeInput, taskIdInput);
      if (response.success && response.data) {
        setTaskStatus(response.data);
        notifySuccess('任务状态获取成功');
      } else {
        setTaskStatus({ status: 'error', message: response.message || '获取任务状态失败' });
        notifyError(response.message || '获取任务状态失败');
      }
    } catch (error: any) {
      setTaskStatus({ status: 'error', message: error.message || '获取任务状态时发生错误' });
      notifyError(error.message || '获取任务状态时发生错误');
    } finally {
      setIsLoading(false);
    }
  };
  
  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return '-';
    return new Date(timestamp * 1000).toLocaleString();
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h1 className="text-2xl font-semibold text-gray-800 mb-6">查询任务状态</h1>
      <form onSubmit={handleSubmit} className="space-y-4 sm:flex sm:items-end sm:space-y-0 sm:space-x-3 mb-6">
        <div>
          <label htmlFor="nodeName" className="block text-sm font-medium text-gray-700">节点名称</label>
          <select
            id="nodeName"
            value={nodeInput}
            onChange={(e) => setNodeInput(e.target.value)}
            className="mt-1 block w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            required
          >
            <option value="" disabled>选择一个节点</option>
            {availableNodes.map(node => (
              <option key={node.node} value={node.node}>{node.node}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="taskId" className="block text-sm font-medium text-gray-700">任务 ID</label>
          <input
            type="text"
            id="taskId"
            value={taskIdInput}
            onChange={(e) => setTaskIdInput(e.target.value)}
            className="mt-1 block w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="例如: UPID:node1:000ABCDE:..."
            required
          />
        </div>
        <button
          type="submit"
          className="w-full sm:w-auto flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Search size={18} className="mr-2"/>
          查询
        </button>
      </form>

      {taskStatus && (
        <div className="mt-6 p-4 border border-gray-200 rounded-md bg-gray-50">
          <h2 className="text-lg font-medium text-gray-700 mb-3">任务详情 (ID: {taskStatus.id || taskIdInput})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <p><span className="font-semibold">状态:</span> <span className={`font-bold ${taskStatus.status === 'stopped' ? 'text-green-600' : taskStatus.status === 'running' ? 'text-blue-600' : 'text-red-600'}`}>{taskStatus.status || '未知'}</span></p>
            <p><span className="font-semibold">退出状态:</span> {taskStatus.exitstatus || '-'}</p>
            <p><span className="font-semibold">类型:</span> {taskStatus.type || '-'}</p>
            <p><span className="font-semibold">开始时间:</span> {formatTimestamp(taskStatus.starttime)}</p>
            <p><span className="font-semibold">结束时间:</span> {formatTimestamp(taskStatus.endtime)}</p>
            {taskStatus.message && taskStatus.status === 'error' && (
                <p className="md:col-span-2"><span className="font-semibold">信息:</span> <span className="text-red-600">{taskStatus.message}</span></p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskStatusPage;
