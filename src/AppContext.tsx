import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import toast from 'react-hot-toast';
import { initializeApiClient as initApi, updateApiClientConfig } from './apiService';

interface AppContextType {
  apiBaseUrl: string | null;
  apiKey: string | null;
  setApiConfig: (baseUrl: string, key: string) => void;
  isConfigured: boolean;
  notifySuccess: (message: string) => void;
  notifyError: (message: string) => void;
  notifyInfo: (message: string) => void;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [apiBaseUrl, setApiBaseUrl] = useState<string | null>(() => localStorage.getItem('apiBaseUrl'));
  const [apiKey, setApiKey] = useState<string | null>(() => localStorage.getItem('apiKey'));
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (apiBaseUrl && apiKey) {
      try {
        initApi(apiBaseUrl, apiKey);
        setIsConfigured(true);
      } catch (error) {
        console.error("初始化API客户端失败:", error);
        setIsConfigured(false);
      }
    } else {
      setIsConfigured(false);
    }
  }, [apiBaseUrl, apiKey]);

  const setApiConfig = (baseUrl: string, key: string) => {
    localStorage.setItem('apiBaseUrl', baseUrl);
    localStorage.setItem('apiKey', key);
    setApiBaseUrl(baseUrl);
    setApiKey(key);
    try {
      updateApiClientConfig(baseUrl, key);
      setIsConfigured(true);
      toast.success('API 配置已更新');
    } catch (error) {
       console.error("更新API客户端配置失败:", error);
       toast.error('API 配置更新失败');
       setIsConfigured(false);
    }
  };

  const notifySuccess = (message: string) => toast.success(message);
  const notifyError = (message: string) => toast.error(message);
  const notifyInfo = (message: string) => toast(message); // 修改此处


  return (
    <AppContext.Provider value={{
      apiBaseUrl, apiKey, setApiConfig, isConfigured,
      notifySuccess, notifyError, notifyInfo,
      isLoading, setIsLoading
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext 必须在 AppProvider 中使用');
  }
  return context;
};
