import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import healthApi, { ApiHealthStatus } from '../../api/health';
import requestsApi from '../../api/requests';
import usersApi from '../../api/users';
import servicesApi from '../../api/services';
import { ServiceRequest, User, Service } from '../../types';

interface AdminLayoutContextType {
  refreshData: () => Promise<void>;
  counters: { requests: number; customers: number; agents: number };
  requests: ServiceRequest[];
  users: User[];
  services: Service[];
}

const AdminLayoutContext = createContext<AdminLayoutContextType | null>(null);

export const useAdminData = () => {
  const context = useContext(AdminLayoutContext);
  if (!context) {
    throw new Error('useAdminData must be used within AdminLayout');
  }
  return context;
};

export const AdminLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [apiHealth, setApiHealth] = useState<ApiHealthStatus>({
    online: true,
    statusText: 'Connecting...',
  });

  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [counters, setCounters] = useState({ requests: 0, customers: 0, agents: 0 });

  // Health check
  const checkHealth = useCallback(async () => {
    const status = await healthApi.checkHealth();
    setApiHealth(status);
  }, []);

  // Fetch shared layout data
  const refreshData = useCallback(async () => {
    try {
      const [reqList, userList, svcList] = await Promise.allSettled([
        requestsApi.getAdminRequests(),
        usersApi.getUsers(),
        servicesApi.getServices(),
      ]);

      const loadedReqs = reqList.status === 'fulfilled' ? reqList.value : [];
      const loadedUsers = userList.status === 'fulfilled' ? userList.value : [];
      const loadedSvcs = svcList.status === 'fulfilled' ? svcList.value : [];

      setRequests(loadedReqs);
      setUsers(loadedUsers);
      setServices(loadedSvcs);

      const customerCount = loadedUsers.filter((u) => u.role === 'CUSTOMER').length;
      const agentCount = loadedUsers.filter((u) => u.role === 'AGENT').length;

      setCounters({
        requests: loadedReqs.length,
        customers: customerCount,
        agents: agentCount,
      });
    } catch {
      // Handled silently for layout counters
    }
  }, []);

  useEffect(() => {
    checkHealth();
    refreshData();

    // Poll health every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [checkHealth, refreshData]);

  return (
    <AdminLayoutContext.Provider
      value={{
        refreshData,
        counters,
        requests,
        users,
        services,
      }}
    >
      <div className="min-h-screen bg-neutral-50/50 flex flex-col">
        {/* Persistent Desktop Sidebar / Slide-out Mobile Sidebar */}
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          counters={counters}
        />

        {/* Main Content Area (Offset for sidebar on desktop) */}
        <div className="lg:pl-64 flex flex-col min-h-screen">
          <Topbar
            onMenuToggle={() => setSidebarOpen((prev) => !prev)}
            apiHealth={apiHealth}
            searchData={{
              requests,
              users,
              services,
            }}
          />

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            <Outlet />
          </main>

          {/* Clean Admin Footer */}
          <footer className="mt-auto border-t border-neutral-200/60 bg-white py-4 px-6 text-center text-xs text-neutral-500 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>
              QuickServe Service Request Management &bull; Admin Console
            </div>
            <div className="flex items-center gap-3 text-[11px] text-neutral-400">
              <span>Backend: Cloudflare Workers</span>
              <span>&bull;</span>
              <span>API: {apiHealth.statusText}</span>
            </div>
          </footer>
        </div>
      </div>
    </AdminLayoutContext.Provider>
  );
};

export default AdminLayout;
