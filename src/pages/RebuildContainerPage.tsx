import React from 'react';
import { useParams } from 'react-router-dom';
import RebuildContainerForm from '../components/RebuildContainerForm';

const RebuildContainerPage: React.FC = () => {
  const { node, vmid } = useParams<{ node: string; vmid: string }>();

  if (!node || !vmid) {
    return <div className="p-6 text-center text-red-500">错误：缺少节点或 VMID 信息。</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold text-gray-800 mb-6">重建 LXC 容器 (Node: {node}, VMID: {vmid})</h1>
      <RebuildContainerForm node={node} vmid={vmid} />
    </div>
  );
};

export default RebuildContainerPage;
