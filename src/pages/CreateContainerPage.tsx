import React from 'react';
import CreateContainerForm from '../components/CreateContainerForm';

const CreateContainerPage: React.FC = () => {
  return (
    <div>
      <h1 className="text-3xl font-semibold text-gray-800 mb-6">创建新 LXC 容器</h1>
      <CreateContainerForm />
    </div>
  );
};

export default CreateContainerPage;
