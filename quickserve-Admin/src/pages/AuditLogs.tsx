import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import auditApi from '../api/audit';
import { AuditLog } from '../types';
import { TableSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Pagination } from '../components/ui/Pagination';
import { ExportDropdown, ExportOption } from '../components/ui/ExportDropdown';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage, API_BASE_URL } from '../api/axios';
import {
  exportAuditLogsToPDF,
  exportAuditLogsToExcel,
  exportAuditLogsToCSV,
} from '../utils/exportUtils';
import {
  FileText,
  Search,
  RefreshCw,
  Clock,
  ShieldCheck,
  Info,
  ExternalLink,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';

export const AuditLogs: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      // Query GET /api/admin/audit-logs directly from the production API
      const responseLogs = await auditApi.getAuditLogs();
      setLogs(responseLogs);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Filter logs by search
  const filteredLogs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return logs;
    return logs.filter(
      (l) =>
        l.entity_id?.toLowerCase().includes(q) ||
        l.request_number?.toLowerCase().includes(q) ||
        l.user_id?.toLowerCase().includes(q) ||
        l.actor_name?.toLowerCase().includes(q) ||
        l.action?.toLowerCase().includes(q) ||
        l.new_status?.toLowerCase().includes(q) ||
        l.note?.toLowerCase().includes(q)
    );
  }, [logs, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(start, start + itemsPerPage);
  }, [filteredLogs, currentPage, itemsPerPage]);

  // Check for role change events
  const roleEvents = useMemo(() => {
    return logs.filter(
      (l) =>
        l.action?.toUpperCase().includes('ROLE') ||
        l.action === 'USER_ROLE_UPDATED' ||
        (l.note && l.note.toLowerCase().includes('role'))
    );
  }, [logs]);

  const exportOptions: ExportOption[] = [
    {
      label: 'Audit Trail (PDF)',
      format: 'pdf',
      description: 'Formal landscape PDF document of audit records',
      onExport: () => {
        exportAuditLogsToPDF(filteredLogs as any, user?.full_name || 'Admin');
      },
    },
    {
      label: 'Audit Records (Excel)',
      format: 'excel',
      description: 'Standard spreadsheet (.xlsx) with all fields',
      onExport: () => {
        exportAuditLogsToExcel(filteredLogs as any);
      },
    },
    {
      label: 'Raw Log Stream (CSV)',
      format: 'csv',
      description: 'Universal UTF-8 CSV text export',
      onExport: () => {
        exportAuditLogsToCSV(filteredLogs as any);
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-neutral-900">Audit Logs</h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Operational event records from <span className="font-mono">{API_BASE_URL}/api/admin/audit-logs</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <ExportDropdown
            options={exportOptions}
            label="Export Logs"
            disabled={loading && filteredLogs.length === 0}
          />

          <button
            type="button"
            onClick={fetchLogs}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-xl hover:bg-neutral-50 transition-colors shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Logs</span>
          </button>
        </div>
      </div>

      {/* Audit Log Transparency Banner */}
      <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/90 text-xs">
        <div className="flex items-start gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700 shrink-0 mt-0.5">
            <Info className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-neutral-900">
              Backend Audit Trail Verification
            </div>
            <p className="text-neutral-600 mt-1 leading-relaxed text-[11px]">
              Displaying real records directly from <code className="font-mono text-neutral-800">GET /api/admin/audit-logs</code>. No audit logs are synthesized or fabricated on the frontend.
              {roleEvents.length === 0 ? (
                <span className="block mt-1 text-neutral-600 font-medium">
                  Status: The production backend currently does not emit <code className="font-mono text-neutral-800">USER_ROLE_UPDATED</code> audit events. When backend role management and event emission are implemented, role changes will automatically appear here.
                </span>
              ) : (
                <span className="block mt-1 text-emerald-700 font-medium">
                  {roleEvents.length} role-change event(s) recorded by the backend.
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="bg-white rounded-xl border border-neutral-200/80 p-4 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search audit records by action, user ID, request ID..."
            className="w-full pl-10 pr-3.5 py-2 text-xs bg-neutral-50 hover:bg-neutral-100/60 focus:bg-white border border-neutral-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-neutral-800 placeholder:text-neutral-400"
          />
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-xl border border-neutral-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <TableSkeleton rows={8} cols={6} />
        ) : error ? (
          <div className="p-12 text-center">
            <p className="text-sm font-semibold text-rose-600 mb-2">Error Loading Audit Logs</p>
            <p className="text-xs text-neutral-500 mb-4">{error}</p>
            <button
              type="button"
              onClick={fetchLogs}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl"
            >
              Try Again
            </button>
          </div>
        ) : filteredLogs.length === 0 ? (
          <EmptyState
            title="No audit entries returned"
            description={
              searchQuery
                ? `No log events match "${searchQuery}"`
                : 'No operational activity records have been emitted by the backend API yet.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50/70 border-b border-neutral-200/80 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">Actor / User ID</th>
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-4">Request / Entity</th>
                  <th className="py-3.5 px-4">Transition</th>
                  <th className="py-3.5 px-4 text-right">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-xs">
                {paginatedLogs.map((log) => {
                  const isRoleUpdate =
                    log.action?.toUpperCase().includes('ROLE') ||
                    log.action === 'USER_ROLE_UPDATED';

                  return (
                    <tr
                      key={log.id}
                      className={`hover:bg-neutral-50/70 transition-colors ${
                        isRoleUpdate ? 'bg-emerald-50/40' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 text-neutral-500 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-neutral-400" />
                          <span>
                            {log.created_at
                              ? new Date(log.created_at).toLocaleString()
                              : 'Timestamp N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-neutral-800 whitespace-nowrap">
                        {log.user_id ? (
                          <button
                            type="button"
                            onClick={() => navigate(`/users/${log.user_id}`)}
                            className="hover:text-indigo-600 hover:underline"
                          >
                            {log.user_id}
                          </button>
                        ) : (
                          'System'
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-medium ${
                            isRoleUpdate
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-neutral-100 text-neutral-700 border border-neutral-200'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {log.entity_id || log.request_number ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (log.entity_id) navigate(`/requests/${log.entity_id}`);
                            }}
                            className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
                          >
                            <span>{log.request_number || log.entity_id?.slice(0, 8)}</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-neutral-600 whitespace-nowrap">
                        {log.new_status ? (
                          <div className="flex items-center gap-1.5">
                            {log.previous_status && (
                              <>
                                <span className="text-neutral-400">{log.previous_status}</span>
                                <span className="text-neutral-400">&rarr;</span>
                              </>
                            )}
                            <span className="font-semibold text-neutral-800">{log.new_status}</span>
                          </div>
                        ) : (
                          <span>—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right text-neutral-500 truncate max-w-xs">
                        {log.note || log.description || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredLogs.length}
          itemsPerPage={itemsPerPage}
          onPageChange={(page: number) => setCurrentPage(page)}
        />
      </div>
    </div>
  );
};

export default AuditLogs;
