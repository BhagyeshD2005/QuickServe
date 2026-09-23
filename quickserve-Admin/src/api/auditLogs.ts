import api from './axios';
import { ApiResponse, AuditLog } from '../types';

export const auditLogsApi = {
  getLogs: async (): Promise<AuditLog[]> => {
    const response = await api.get<ApiResponse<AuditLog[]>>('/api/admin/audit-logs');
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error?.message || 'Failed to load audit logs');
    }
    return response.data.data;
  },
};

export default auditLogsApi;
