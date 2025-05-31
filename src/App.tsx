import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { Home, Server, Settings, Container, HelpCircle, ListChecks } from 'lucide-react';
import NodesPage from './pages/NodesPage';
import ContainersPage from './pages/ContainersPage';
import SettingsPage from './pages/SettingsPage';
import TaskStatusPage from './pages/TaskStatusPage';
import { useAppContext } from './AppContext';
import CreateContainerPage from './pages/CreateContainerPage';
import ContainerDetailPage from './pages/ContainerDetailPage';
import RebuildContainerPage from './pages/RebuildContainerPage';


function App() {
  const { isConfigured, isLoading } = useAppContext();
  const location = useLocation();

  const navItems = [
    { path: "/", label: "首页", icon: <Home size={18}/> },
    { path: "/nodes", label: "节点管理", icon: <Server size={18}/> },
    { path: "/containers", label: "容器管理", icon: <Container size={18}/> },
    { path: "/tasks", label: "任务状态", icon: <ListChecks size={18}/> },
    { path: "/settings", label: "设置", icon: <Settings size={18}/> },
  ];

  if (!isConfigured && location.pathname !== '/settings') {
    return <Navigate to="/settings" replace />;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-gray-800 text-white p-4 space-y-2">
        <div className="text-2xl font-semibold mb-6 text-center">LXC 管理</div>
        <nav>
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-2 px-3 py-2.5 rounded-md hover:bg-gray-700 transition-colors ${
                location.pathname === item.path ? 'bg-blue-600 text-white' : 'text-gray-300'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>))}
        </nav>
      </aside>

      <main className="flex-1 p-6 overflow-auto">
        {isLoading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
          </div>
        )}
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/nodes" element={<NodesPage />} />
          <Route path="/containers" element={<ContainersPage />} />
          <Route path="/containers/create" element={<CreateContainerPage />} />
          <Route path="/containers/:node/:vmid" element={<ContainerDetailPage />} />
          <Route path="/containers/:node/:vmid/rebuild" element={<RebuildContainerPage />} />
          <Route path="/tasks" element={<TaskStatusPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

const DashboardPage = () => (
  <div className="p-6 bg-white rounded-lg shadow">
    <h1 className="text-3xl font-semibold text-gray-800 mb-4">欢迎使用 Proxmox LXC 管理面板</h1>
    <p className="text-gray-600">
      请使用左侧导航菜单管理您的 Proxmox VE 节点和 LXC 容器。
      如果您尚未配置 API 连接，请前往“设置”页面进行配置。
    </p>
  </div>
);


export default App;
