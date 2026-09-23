import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import dashboardApi from '../api/dashboard';
import requestsApi from '../api/requests';
import usersApi from '../api/users';
import servicesApi from '../api/services';
import { DashboardStats, ServiceRequest, User } from '../types';
import { StatCard } from '../components/ui/StatCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { PriorityBadge } from '../components/ui/PriorityBadge';
import { DashboardCardSkeleton, TableSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { CreateRequestModal } from '../components/requests/CreateRequestModal';
import { ExportDropdown, ExportOption } from '../components/ui/ExportDropdown';
import { SystemDiagnosticsModal } from '../components/dashboard/SystemDiagnosticsModal';
import { useAdminData } from '../components/layout/AdminLayout';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getErrorMessage } from '../api/axios';
import {
  exportDashboardReportToPDF,
  exportDashboardReportToExcel,
  exportDashboardReportToCSV,
} from '../utils/exportUtils';
import {
  ClipboardList,
  Clock,
  PlayCircle,
  CheckCircle2,
  XCircle,
  Users,
  UserCheck,
  Plus,
  RefreshCw,
  ArrowRight,
  Eye,
  Activity,
  Layers,
  ShieldAlert,
  SlidersHorizontal,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  Zap,
  Gauge,
  Calendar,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshData } = useAdminData();
  const { success, info, error: toastError } = useToast();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentRequests, setRecentRequests] = useState<ServiceRequest[]>([]);
  const [allRequests, setAllRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date>(new Date());

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch primary dashboard stats and backup requests/users in parallel
      const [dashRes, reqsRes, usersRes] = await Promise.allSettled([
        dashboardApi.getStats(),
        requestsApi.getAdminRequests(),
        usersApi.getUsers(),
      ]);

      const requestsList: ServiceRequest[] = reqsRes.status === 'fulfilled' ? (reqsRes.value as ServiceRequest[]) : [];
      const usersList: User[] = usersRes.status === 'fulfilled' ? (usersRes.value as User[]) : [];
      setAllRequests(requestsList);

      // If both primary data sources failed, surface the error
      if (dashRes.status === 'rejected' && reqsRes.status === 'rejected') {
        const primaryErr = (dashRes as PromiseRejectedResult).reason || (reqsRes as PromiseRejectedResult).reason;
        setError(getErrorMessage(primaryErr) || 'Unable to fetch dashboard data from backend server.');
      }

      const d = dashRes.status === 'fulfilled' ? (dashRes.value as Partial<DashboardStats>) : null;

      // Extract unified & resilient metrics combining dashboard payload and request records
      const calculatedTotal = Math.max(d?.total_requests ?? 0, requestsList.length);
      
      const pendingCount = (d?.pending_requests !== undefined && d.pending_requests > 0)
        ? d.pending_requests
        : requestsList.filter((r) => ['CREATED', 'ASSIGNED', 'ACCEPTED'].includes(r.status)).length;
      
      const inProgCount = (d?.in_progress !== undefined && d.in_progress > 0)
        ? d.in_progress
        : requestsList.filter((r) => r.status === 'IN_PROGRESS').length;
      
      const completedCount = (d?.completed !== undefined && d.completed > 0)
        ? d.completed
        : requestsList.filter((r) => r.status === 'COMPLETED').length;
      
      const cancelledCount = (d?.cancelled !== undefined && d.cancelled > 0)
        ? d.cancelled
        : requestsList.filter((r) => r.status === 'CANCELLED').length;
      
      const customersCount = Math.max(d?.total_customers ?? 0, usersList.filter((u) => u.role === 'CUSTOMER').length);
      const agentsCount = Math.max(d?.total_agents ?? 0, usersList.filter((u) => u.role === 'AGENT').length);

      const highPrioCount = requestsList.filter((r) => r.priority === 'HIGH' || r.priority === 'CRITICAL').length;
      const medPrioCount = requestsList.filter((r) => r.priority === 'MEDIUM').length;
      const lowPrioCount = requestsList.filter((r) => r.priority === 'LOW').length;

      const fulfillmentRate = calculatedTotal > 0 ? Math.round((completedCount / calculatedTotal) * 100) : 0;
      const activeBacklog = pendingCount + inProgCount;
      const agentUtilization = agentsCount > 0 ? Number((calculatedTotal / agentsCount).toFixed(1)) : 0;
      const customerIntensity = customersCount > 0 ? Number((calculatedTotal / customersCount).toFixed(1)) : 0;

      setStats({
        total_requests: calculatedTotal,
        pending_requests: pendingCount,
        in_progress: inProgCount,
        completed: completedCount,
        cancelled: cancelledCount,
        total_customers: customersCount,
        total_agents: agentsCount,
        fulfillment_rate: fulfillmentRate,
        active_backlog: activeBacklog,
        high_priority_count: highPrioCount,
        medium_priority_count: medPrioCount,
        low_priority_count: lowPrioCount,
        agent_utilization_ratio: agentUtilization,
        customer_request_ratio: customerIntensity,
      });

      if (d?.recent_requests && d.recent_requests.length > 0) {
        setRecentRequests(d.recent_requests);
      } else {
        setRecentRequests(requestsList.slice(0, 6));
      }

      setLastSync(new Date());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Seed live operational demo requests onto the live Cloudflare Workers API
  const handleSeedLiveDemo = async () => {
    setSeeding(true);
    try {
      const count = await requestsApi.seedSampleRequests();
      if (count > 0) {
        success(`Successfully created ${count} live service requests on the API!`, 'Live Data Generated');
        await fetchDashboardData();
        refreshData();
      } else {
        info('Requests could not be automatically seeded. You can create a request manually.', 'Notice');
      }
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setSeeding(false);
    }
  };

  // Aggregate Status Distribution for Donut Chart
  const statusCounts: Record<string, number> = {
    CREATED: 0,
    ASSIGNED: 0,
    ACCEPTED: 0,
    IN_PROGRESS: 0,
    COMPLETED: 0,
    CANCELLED: 0,
  };

  allRequests.forEach((r) => {
    if (statusCounts[r.status] !== undefined) {
      statusCounts[r.status]++;
    } else {
      statusCounts[r.status] = 1;
    }
  });

  const statusChartData = Object.entries(statusCounts)
    .filter(([_, count]) => count > 0)
    .map(([name, value]) => ({
      name: name.replace('_', ' '),
      value,
      key: name,
    }));

  const STATUS_COLORS: Record<string, string> = {
    CREATED: '#0284c7', // Sky-600
    ASSIGNED: '#9333ea', // Purple-600
    ACCEPTED: '#4f46e5', // Indigo-600
    IN_PROGRESS: '#d97706', // Amber-600
    COMPLETED: '#059669', // Emerald-600
    CANCELLED: '#e11d48', // Rose-600
  };

  // Aggregate Service Type Distribution
  const serviceCounts: Record<string, number> = {};
  allRequests.forEach((r) => {
    const sName = r.service_name || 'General';
    serviceCounts[sName] = (serviceCounts[sName] || 0) + 1;
  });

  const serviceChartData = Object.entries(serviceCounts).map(([name, count]) => ({
    name,
    count,
  }));

  // Aggregate Priority Distribution
  const priorityCounts: Record<string, number> = { LOW: 0, MEDIUM: 0, HIGH: 0 };
  allRequests.forEach((r) => {
    if (priorityCounts[r.priority] !== undefined) {
      priorityCounts[r.priority]++;
    }
  });

  const priorityChartData = [
    { name: 'Low', count: priorityCounts.LOW },
    { name: 'Medium', count: priorityCounts.MEDIUM },
    { name: 'High', count: priorityCounts.HIGH },
  ];

  // Export Report Configuration
  const exportOptions: ExportOption[] = [
    {
      label: 'Executive Operations Report (PDF)',
      format: 'pdf',
      description: 'KPI summary, SLA status breakdown, and recent requests',
      onExport: () => {
        const currentStats: DashboardStats = stats || {
          total_requests: allRequests.length,
          pending_requests: allRequests.filter((r) => ['CREATED', 'ASSIGNED', 'ACCEPTED'].includes(r.status)).length,
          in_progress: allRequests.filter((r) => r.status === 'IN_PROGRESS').length,
          completed: allRequests.filter((r) => r.status === 'COMPLETED').length,
          cancelled: allRequests.filter((r) => r.status === 'CANCELLED').length,
          total_customers: 0,
          total_agents: 0,
          fulfillment_rate: 0,
          active_backlog: 0,
          high_priority_count: 0,
          medium_priority_count: 0,
          low_priority_count: 0,
        };
        exportDashboardReportToPDF(currentStats, allRequests, user?.full_name || 'Admin');
      },
    },
    {
      label: 'Executive Workbook (Excel)',
      format: 'excel',
      description: 'Multi-sheet workbook with KPIs, status shares, and master requests',
      onExport: () => {
        const currentStats: DashboardStats = stats || {
          total_requests: allRequests.length,
          pending_requests: allRequests.filter((r) => ['CREATED', 'ASSIGNED', 'ACCEPTED'].includes(r.status)).length,
          in_progress: allRequests.filter((r) => r.status === 'IN_PROGRESS').length,
          completed: allRequests.filter((r) => r.status === 'COMPLETED').length,
          cancelled: allRequests.filter((r) => r.status === 'CANCELLED').length,
          total_customers: 0,
          total_agents: 0,
          fulfillment_rate: 0,
          active_backlog: 0,
          high_priority_count: 0,
          medium_priority_count: 0,
          low_priority_count: 0,
        };
        exportDashboardReportToExcel(currentStats, allRequests);
      },
    },
    {
      label: 'Master Requests Dataset (CSV)',
      format: 'csv',
      description: 'Complete tabular CSV file of all service requests',
      onExport: () => {
        const currentStats: DashboardStats = stats || {
          total_requests: allRequests.length,
          pending_requests: allRequests.filter((r) => ['CREATED', 'ASSIGNED', 'ACCEPTED'].includes(r.status)).length,
          in_progress: allRequests.filter((r) => r.status === 'IN_PROGRESS').length,
          completed: allRequests.filter((r) => r.status === 'COMPLETED').length,
          cancelled: allRequests.filter((r) => r.status === 'CANCELLED').length,
          total_customers: 0,
          total_agents: 0,
          fulfillment_rate: 0,
          active_backlog: 0,
          high_priority_count: 0,
          medium_priority_count: 0,
          low_priority_count: 0,
        };
        exportDashboardReportToCSV(currentStats, allRequests);
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-neutral-900">Dashboard</h2>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live API
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Real-time analytics and service request operations overview • Last synced: {lastSync.toLocaleTimeString()}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Seed Sample Live Data Button */}
          <button
            type="button"
            onClick={handleSeedLiveDemo}
            disabled={seeding || loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition-colors shadow-2xs"
            title="Generate sample service requests on live Cloudflare Workers backend"
          >
            {seeding ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            )}
            <span>{seeding ? 'Generating...' : 'Seed Live Data'}</span>
          </button>

          {/* Diagnostics Modal Trigger */}
          <button
            type="button"
            onClick={() => setIsDiagnosticsOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-xl hover:bg-neutral-50 hover:border-neutral-400 transition-colors shadow-2xs"
            title="Inspect backend endpoint health and connectivity"
          >
            <Activity className="w-3.5 h-3.5 text-indigo-600" />
            <span>Diagnostics</span>
          </button>

          {/* Export Report Dropdown */}
          <ExportDropdown
            options={exportOptions}
            label="Export Report"
            disabled={loading && allRequests.length === 0}
          />

          <button
            type="button"
            onClick={fetchDashboardData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-xl hover:bg-neutral-50 transition-colors shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            id="quick-action-create-request"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Create Request</span>
          </button>
        </div>
      </div>

      {/* Error Banner if any */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
            <div>
              <span className="font-semibold">Connection Warning:</span> {error}
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setIsDiagnosticsOpen(true)}
              className="text-indigo-700 font-semibold underline hover:text-indigo-900"
            >
              Inspect Diagnostics
            </button>
            <button
              type="button"
              onClick={fetchDashboardData}
              className="font-semibold px-3 py-1 bg-white border border-rose-300 rounded-lg text-rose-800 hover:bg-rose-100 transition-colors shadow-2xs"
            >
              Retry Sync
            </button>
          </div>
        </div>
      )}

      {/* Zero requests guidance callout if database is clean */}
      {allRequests.length === 0 && !loading && (
        <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200/80 text-xs text-indigo-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-semibold text-indigo-900">Database Ready for Operations</h4>
              <p className="text-indigo-700 text-2xs mt-0.5">
                Generate demo records across AC, Plumbing, Electrical, and Cleaning to populate real-time analytics and detailed KPI reports.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleSeedLiveDemo}
              disabled={seeding}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-2xs flex items-center gap-1.5"
            >
              {seeding ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              <span>{seeding ? 'Creating...' : 'Populate Demo Requests'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Primary KPI Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <DashboardCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            id="stat-total-requests"
            title="Total Requests"
            value={stats?.total_requests ?? 0}
            subtitle="All logged service requests"
            icon={ClipboardList}
            iconBgColor="bg-indigo-50"
            iconTextColor="text-indigo-600"
            onClick={() => navigate('/requests')}
          />
          <StatCard
            id="stat-pending-requests"
            title="Pending Requests"
            value={stats?.pending_requests ?? 0}
            subtitle="Created, assigned, or accepted"
            icon={Clock}
            iconBgColor="bg-sky-50"
            iconTextColor="text-sky-600"
            badge={
              (stats?.pending_requests ?? 0) > 0
                ? { text: 'In Queue', type: 'warning' }
                : undefined
            }
            onClick={() => navigate('/requests')}
          />
          <StatCard
            id="stat-in-progress"
            title="In Progress"
            value={stats?.in_progress ?? 0}
            subtitle="Active agent maintenance"
            icon={PlayCircle}
            iconBgColor="bg-amber-50"
            iconTextColor="text-amber-600"
            badge={
              (stats?.in_progress ?? 0) > 0
                ? { text: 'Active', type: 'info' }
                : undefined
            }
            onClick={() => navigate('/requests')}
          />
          <StatCard
            id="stat-completed"
            title="Completed"
            value={stats?.completed ?? 0}
            subtitle="Successfully fulfilled services"
            icon={CheckCircle2}
            iconBgColor="bg-emerald-50"
            iconTextColor="text-emerald-600"
            badge={
              (stats?.completed ?? 0) > 0
                ? { text: 'Fulfilled', type: 'success' }
                : undefined
            }
            onClick={() => navigate('/requests')}
          />
          <StatCard
            id="stat-cancelled"
            title="Cancelled"
            value={stats?.cancelled ?? 0}
            subtitle="Terminated service requests"
            icon={XCircle}
            iconBgColor="bg-rose-50"
            iconTextColor="text-rose-600"
            onClick={() => navigate('/requests')}
          />
          <StatCard
            id="stat-total-customers"
            title="Total Customers"
            value={stats?.total_customers ?? 0}
            subtitle="Registered customer accounts"
            icon={Users}
            iconBgColor="bg-violet-50"
            iconTextColor="text-violet-600"
            onClick={() => navigate('/customers')}
          />
          <StatCard
            id="stat-total-agents"
            title="Total Agents"
            value={stats?.total_agents ?? 0}
            subtitle="Certified field service agents"
            icon={UserCheck}
            iconBgColor="bg-blue-50"
            iconTextColor="text-blue-600"
            onClick={() => navigate('/agents')}
          />
        </div>
      )}

      {/* Extended Operational Parameters & Performance KPIs */}
      {!loading && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-600 flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
              <span>Operational Performance & SLA Parameters</span>
            </h3>
            <span className="text-2xs text-neutral-400">Calculated across live records</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              id="kpi-fulfillment-rate"
              title="Fulfillment Rate"
              value={`${stats?.fulfillment_rate ?? 0}%`}
              subtitle="Completion velocity vs total tickets"
              icon={TrendingUp}
              iconBgColor="bg-emerald-50"
              iconTextColor="text-emerald-600"
              badge={{
                text: (stats?.fulfillment_rate ?? 0) >= 80 ? 'Target Met (≥80%)' : 'Under Review',
                type: (stats?.fulfillment_rate ?? 0) >= 80 ? 'success' : 'neutral',
              }}
            />
            <StatCard
              id="kpi-active-backlog"
              title="Active Backlog"
              value={stats?.active_backlog ?? 0}
              subtitle="Requests pending or under work"
              icon={Clock}
              iconBgColor="bg-amber-50"
              iconTextColor="text-amber-600"
              badge={{
                text: (stats?.active_backlog ?? 0) > 0 ? `${stats?.active_backlog} Active` : 'Queue Clear',
                type: (stats?.active_backlog ?? 0) > 0 ? 'warning' : 'success',
              }}
              onClick={() => navigate('/requests')}
            />
            <StatCard
              id="kpi-critical-load"
              title="High / Critical Priority"
              value={stats?.high_priority_count ?? 0}
              subtitle="Urgent SLA dispatch required"
              icon={AlertTriangle}
              iconBgColor="bg-rose-50"
              iconTextColor="text-rose-600"
              badge={{
                text: 'SLA < 4h',
                type: (stats?.high_priority_count ?? 0) > 0 ? 'warning' : 'neutral',
              }}
              onClick={() => navigate('/requests')}
            />
            <StatCard
              id="kpi-technician-ratio"
              title="Technician Workload"
              value={`${stats?.agent_utilization_ratio ?? 0} req/agent`}
              subtitle="Distribution per certified field agent"
              icon={Gauge}
              iconBgColor="bg-indigo-50"
              iconTextColor="text-indigo-600"
              badge={{
                text: 'Workload Index',
                type: 'info',
              }}
            />
          </div>
        </div>
      )}

      {/* Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution Donut Chart */}
        <div className="bg-white rounded-xl border border-neutral-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">
                Request Status Distribution
              </h3>
              <p className="text-xs text-neutral-500">Live operational lifecycle breakdown</p>
            </div>
            <Activity className="w-4 h-4 text-neutral-400" />
          </div>

          {statusChartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-neutral-400">
              No service requests to display.
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusChartData.map((entry) => (
                      <Cell
                        key={`cell-${entry.key}`}
                        fill={STATUS_COLORS[entry.key] || '#6366f1'}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#171717',
                      borderColor: '#262626',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '12px',
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Service Type Distribution Bar Chart */}
        <div className="bg-white rounded-xl border border-neutral-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">
                Service Type Distribution
              </h3>
              <p className="text-xs text-neutral-500">Volume across service categories</p>
            </div>
            <Layers className="w-4 h-4 text-neutral-400" />
          </div>

          {serviceChartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-neutral-400">
              No service requests to display.
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={serviceChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#171717',
                      borderColor: '#262626',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="Requests" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Recent Requests Section */}
      <div className="bg-white rounded-xl border border-neutral-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-neutral-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">Recent Service Requests</h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Latest customer service orders logged in the system
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/requests')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <TableSkeleton rows={4} cols={7} />
        ) : recentRequests.length === 0 ? (
          <EmptyState
            title="No service requests yet"
            description="Create your first service request to begin dispatching service agents."
            action={
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Create Request</span>
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50/70 border-b border-neutral-200/80 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Request ID</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Service</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Assigned Agent</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-xs">
                {recentRequests.map((req) => (
                  <tr
                    key={req.id}
                    className="hover:bg-neutral-50/80 transition-colors group cursor-pointer"
                    onClick={() => navigate(`/requests/${req.id}`)}
                  >
                    <td className="py-3.5 px-4 font-semibold text-indigo-600 whitespace-nowrap">
                      {req.request_number}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-neutral-900 whitespace-nowrap">
                      {req.customer_name || 'Customer'}
                    </td>
                    <td className="py-3.5 px-4 text-neutral-600 whitespace-nowrap">
                      {req.service_name || 'General Service'}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <PriorityBadge priority={req.priority} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge status={req.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-neutral-600 whitespace-nowrap">
                      {req.agent_name || (
                        <span className="text-neutral-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-neutral-500 whitespace-nowrap">
                      {req.created_at ? new Date(req.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/requests/${req.id}`);
                        }}
                        className="p-1.5 text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Action Navigation Shortcuts */}
      <div className="p-4 rounded-xl bg-neutral-100/60 border border-neutral-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="font-medium text-neutral-700">Quick Navigation:</div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/agents')}
            className="px-3 py-1.5 rounded-lg bg-white border border-neutral-300 font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            Manage Agents
          </button>
          <button
            type="button"
            onClick={() => navigate('/customers')}
            className="px-3 py-1.5 rounded-lg bg-white border border-neutral-300 font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            View Customers
          </button>
          <button
            type="button"
            onClick={() => navigate('/audit-logs')}
            className="px-3 py-1.5 rounded-lg bg-white border border-neutral-300 font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            View Audit Logs
          </button>
        </div>
      </div>

      {/* Create Request Modal */}
      <CreateRequestModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          fetchDashboardData();
          refreshData();
        }}
      />

      {/* System Diagnostics & Health Modal */}
      <SystemDiagnosticsModal
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
        onRefreshDashboard={fetchDashboardData}
      />
    </div>
  );
};

export default Dashboard;
