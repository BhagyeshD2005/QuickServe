import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import requestsApi from '../api/requests';
import { ServiceRequest, RequestStatus, RequestPriority } from '../types';
import { StatusBadge } from '../components/ui/StatusBadge';
import { PriorityBadge } from '../components/ui/PriorityBadge';
import { TableSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Pagination } from '../components/ui/Pagination';
import { AssignAgentModal } from '../components/requests/AssignAgentModal';
import { UpdateStatusModal } from '../components/requests/UpdateStatusModal';
import { CreateRequestModal } from '../components/requests/CreateRequestModal';
import { ExportDropdown, ExportOption } from '../components/ui/ExportDropdown';
import { useAdminData } from '../components/layout/AdminLayout';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../api/axios';
import {
  exportRequestsToPDF,
  exportRequestsToExcel,
  exportRequestsToCSV,
} from '../utils/exportUtils';
import {
  Search,
  Filter,
  Plus,
  RefreshCw,
  Eye,
  UserCheck,
  RefreshCcw,
  X,
  SlidersHorizontal,
} from 'lucide-react';

export const RequestsList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { refreshData } = useAdminData();

  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state from URL query or defaults
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>(searchParams.get('priority') || 'ALL');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [assignModal, setAssignModal] = useState<{
    isOpen: boolean;
    requestId: string;
    requestNumber?: string;
    agentId?: string | null;
  }>({ isOpen: false, requestId: '', agentId: null });

  const [statusModal, setStatusModal] = useState<{
    isOpen: boolean;
    requestId: string;
    requestNumber?: string;
    currentStatus: RequestStatus;
  }>({ isOpen: false, requestId: '', currentStatus: 'CREATED' });

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await requestsApi.getAdminRequests();
      setRequests(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // Sync filters to search params
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (statusFilter !== 'ALL') params.set('status', statusFilter);
    if (priorityFilter !== 'ALL') params.set('priority', priorityFilter);
    setSearchParams(params, { replace: true });
  }, [searchQuery, statusFilter, priorityFilter, setSearchParams]);

  // Filter requests
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      // Search
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        req.request_number?.toLowerCase().includes(q) ||
        req.customer_name?.toLowerCase().includes(q) ||
        req.service_name?.toLowerCase().includes(q) ||
        req.address?.toLowerCase().includes(q);

      // Status
      const matchStatus = statusFilter === 'ALL' || req.status === statusFilter;

      // Priority
      const matchPriority = priorityFilter === 'ALL' || req.priority === priorityFilter;

      return matchSearch && matchStatus && matchPriority;
    });
  }, [requests, searchQuery, statusFilter, priorityFilter]);

  // Pagination slice
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRequests.slice(start, start + itemsPerPage);
  }, [filteredRequests, currentPage, itemsPerPage]);

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setPriorityFilter('ALL');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchQuery !== '' || statusFilter !== 'ALL' || priorityFilter !== 'ALL';

  const exportOptions: ExportOption[] = [
    {
      label: 'Requests Catalog (PDF)',
      format: 'pdf',
      description: 'Landscape printable PDF report of service requests',
      onExport: () => {
        exportRequestsToPDF(filteredRequests, user?.full_name || 'Admin');
      },
    },
    {
      label: 'Spreadsheet (.xlsx)',
      format: 'excel',
      description: 'Formatted Excel workbook with all request columns',
      onExport: () => {
        exportRequestsToExcel(filteredRequests);
      },
    },
    {
      label: 'Standard CSV (.csv)',
      format: 'csv',
      description: 'Universal CSV file for external analysis',
      onExport: () => {
        exportRequestsToCSV(filteredRequests);
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-neutral-900">Service Requests</h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Manage lifecycle, dispatch service agents, and update service progress
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <ExportDropdown
            options={exportOptions}
            label="Export Requests"
            disabled={loading && filteredRequests.length === 0}
          />

          <button
            type="button"
            onClick={fetchRequests}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-xl hover:bg-neutral-50 transition-colors shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            id="create-request-btn"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Create Request</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-neutral-200/80 p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              id="filter-search-input"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search request #, customer, service, address..."
              className="w-full pl-10 pr-3.5 py-2 text-xs bg-neutral-50 hover:bg-neutral-100/60 focus:bg-white border border-neutral-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-neutral-800 placeholder:text-neutral-400"
            />
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-3">
            <select
              id="filter-status-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-neutral-50 hover:bg-neutral-100/60 focus:bg-white border border-neutral-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-neutral-800"
            >
              <option value="ALL">All Statuses</option>
              <option value="CREATED">CREATED</option>
              <option value="ASSIGNED">ASSIGNED</option>
              <option value="ACCEPTED">ACCEPTED</option>
              <option value="IN_PROGRESS">IN PROGRESS</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="sm:col-span-3">
            <select
              id="filter-priority-select"
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-neutral-50 hover:bg-neutral-100/60 focus:bg-white border border-neutral-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-neutral-800"
            >
              <option value="ALL">All Priorities</option>
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
            </select>
          </div>
        </div>

        {/* Filter status & clear action */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 border-t border-neutral-100 text-xs text-neutral-500">
            <span>
              Found <strong className="text-neutral-900">{filteredRequests.length}</strong> matching{' '}
              {filteredRequests.length === 1 ? 'request' : 'requests'}
            </span>
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear filters</span>
            </button>
          </div>
        )}
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-xl border border-neutral-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <TableSkeleton rows={8} cols={8} />
        ) : error ? (
          <div className="p-12 text-center">
            <p className="text-sm font-semibold text-rose-600 mb-2">Error loading requests</p>
            <p className="text-xs text-neutral-500 mb-4">{error}</p>
            <button
              type="button"
              onClick={fetchRequests}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700"
            >
              Try Again
            </button>
          </div>
        ) : filteredRequests.length === 0 ? (
          <EmptyState
            title="No requests match your criteria"
            description={
              hasActiveFilters
                ? 'Try adjusting or clearing your filters to see more results.'
                : 'No service requests exist in the database yet.'
            }
            action={
              hasActiveFilters ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="px-4 py-2 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors"
                >
                  Clear Filters
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Request</span>
                </button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50/70 border-b border-neutral-200/80 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Request ID</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Service</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Assigned Agent</th>
                  <th className="py-3.5 px-4">Created At</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-xs">
                {paginatedRequests.map((req) => (
                  <tr
                    key={req.id}
                    className="hover:bg-neutral-50/70 transition-colors group cursor-pointer"
                    onClick={() => navigate(`/requests/${req.id}`)}
                  >
                    <td className="py-3.5 px-4 font-semibold text-indigo-600 whitespace-nowrap">
                      {req.request_number}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-neutral-900 whitespace-nowrap">
                      <div>{req.customer_name || 'Customer'}</div>
                      {req.customer_phone && (
                        <div className="text-[10px] text-neutral-400">{req.customer_phone}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-neutral-600 whitespace-nowrap">
                      {req.service_name || 'Service'}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <PriorityBadge priority={req.priority} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge status={req.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-neutral-600 whitespace-nowrap">
                      {req.agent_name ? (
                        <span className="font-medium text-neutral-800">{req.agent_name}</span>
                      ) : (
                        <span className="text-neutral-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-neutral-500 whitespace-nowrap">
                      {req.created_at ? new Date(req.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div
                        className="flex items-center justify-end gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setAssignModal({
                              isOpen: true,
                              requestId: req.id,
                              requestNumber: req.request_number,
                              agentId: req.assigned_agent_id,
                            })
                          }
                          className="p-1.5 text-neutral-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Assign Agent"
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setStatusModal({
                              isOpen: true,
                              requestId: req.id,
                              requestNumber: req.request_number,
                              currentStatus: req.status,
                            })
                          }
                          className="p-1.5 text-neutral-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Update Status"
                        >
                          <RefreshCcw className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => navigate(`/requests/${req.id}`)}
                          className="p-1.5 text-neutral-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredRequests.length}
          itemsPerPage={itemsPerPage}
          onPageChange={(page: number) => setCurrentPage(page)}
        />
      </div>

      {/* Assign Agent Modal */}
      <AssignAgentModal
        isOpen={assignModal.isOpen}
        onClose={() => setAssignModal((prev) => ({ ...prev, isOpen: false }))}
        requestId={assignModal.requestId}
        requestNumber={assignModal.requestNumber}
        currentAgentId={assignModal.agentId}
        onSuccess={() => {
          fetchRequests();
          refreshData();
        }}
      />

      {/* Update Status Modal */}
      <UpdateStatusModal
        isOpen={statusModal.isOpen}
        onClose={() => setStatusModal((prev) => ({ ...prev, isOpen: false }))}
        requestId={statusModal.requestId}
        requestNumber={statusModal.requestNumber}
        currentStatus={statusModal.currentStatus}
        onSuccess={() => {
          fetchRequests();
          refreshData();
        }}
      />

      {/* Create Request Modal */}
      <CreateRequestModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          fetchRequests();
          refreshData();
        }}
      />
    </div>
  );
};

export default RequestsList;
