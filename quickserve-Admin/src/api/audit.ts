import api from './axios';
import { ApiResponse, AuditLog } from '../types';

export const auditApi = {
  getAuditLogs: async (): Promise<AuditLog[]> => {
    const response = await api.get<ApiResponse<unknown>>('/api/admin/audit-logs');
    const raw = response.data?.data ?? response.data;
    if (Array.isArray(raw)) return raw as AuditLog[];
    const asRecord = raw as Record<string, unknown>;
    if (Array.isArray(asRecord?.audit_logs)) return asRecord.audit_logs as AuditLog[];
    if (Array.isArray(asRecord?.logs)) return asRecord.logs as AuditLog[];
    if (Array.isArray(asRecord?.data)) return asRecord.data as AuditLog[];
    return [];
  },
};

export default auditApi;
