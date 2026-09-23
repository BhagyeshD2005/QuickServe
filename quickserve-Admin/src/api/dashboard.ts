import api from './axios';
import { ApiResponse, DashboardStats } from '../types';

export const dashboardApi = {
  getStats: async (): Promise<Partial<DashboardStats>> => {
    const response = await api.get<ApiResponse<unknown>>('/api/admin/dashboard');
    if (!response.data || response.data.success === false) {
      throw new Error(response.data?.error?.message || 'Failed to load dashboard data');
    }

    const payload = (response.data.data ?? response.data) as Record<string, unknown>;
    const src = ((payload?.stats || payload?.overview || payload?.summary || payload) ?? {}) as Record<string, unknown>;

    const parseNum = (val: unknown): number => {
      if (typeof val === 'number') return isNaN(val) ? 0 : val;
      if (typeof val === 'string') {
        const parsed = parseInt(val, 10);
        return isNaN(parsed) ? 0 : parsed;
      }
      return 0;
    };

    return {
      total_requests: parseNum(src.total_requests ?? src.totalRequests ?? src.total ?? src.requests_count),
      pending_requests: parseNum(src.pending_requests ?? src.pendingRequests ?? src.pending ?? src.created ?? src.in_queue),
      in_progress: parseNum(src.in_progress ?? src.inProgress ?? src.active ?? src.processing),
      completed: parseNum(src.completed ?? src.completed_requests ?? src.completedRequests ?? src.fulfilled),
      cancelled: parseNum(src.cancelled ?? src.cancelled_requests ?? src.cancelledRequests ?? src.rejected),
      total_customers: parseNum(src.total_customers ?? src.totalCustomers ?? src.customers ?? src.users_count),
      total_agents: parseNum(src.total_agents ?? src.totalAgents ?? src.agents ?? src.active_agents ?? src.technicians),
      recent_requests: Array.isArray(src.recent_requests)
        ? src.recent_requests
        : Array.isArray(payload?.recent_requests)
        ? payload.recent_requests
        : undefined,
    };
  },
};

export default dashboardApi;
