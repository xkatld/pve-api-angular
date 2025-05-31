import React, { useState } from 'react';
import { useAppContext } from '../AppContext';

const SettingsPage: React.FC = () => {
  const { apiBaseUrl, apiKey, setApiConfig } = useAppContext();
  const [baseUrlInput, setBaseUrlInput] = useState(apiBaseUrl || '');
  const [keyInput, setKeyInput] = useState(apiKey || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (baseUrlInput && keyInput) {
      setApiConfig(baseUrlInput, keyInput);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-lg shadow">
      <h1 className="text-2xl font-semibold text-gray-800 mb-6">API 设置</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="apiBaseUrl" className="block text-sm font-medium text-gray-700">
            API 基础 URL (例如: http://your-pve-ip:8000/api/v1)
          </label>
          <input
            type="text"
            id="apiBaseUrl"
            value={baseUrlInput}
            onChange={(e) => setBaseUrlInput(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="http://192.168.1.10:8000/api/v1"
            required
          />
        </div>
        <div>
          <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700">
            全局 API 密钥
          </label>
          <input
            type="password"
            id="apiKey"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="您的安全 API 密钥"
            required
          />
        </div>
        <button
          type="submit"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          保存设置
        </button>
      </form>
    </div>
  );
};

export default SettingsPage;
