import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import usersApi, { EndpointCheckResult } from '../api/users';
import { User, UserRole } from '../types';
import { Avatar } from '../components/ui/Avatar';
import { RoleBadge } from '../components/ui/RoleBadge';
import { TableSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Pagination } from '../components/ui/Pagination';
import { PromoteAgentModal } from '../components/users/PromoteAgentModal';
import { useToast } from '../context/ToastContext';
import { getErrorMessage, API_BASE_URL } from '../api/axios';
import {
  Users,
  Search,
  RefreshCw,
  Eye,
  Mail,
  Calendar,
  UserCheck,
  ShieldCheck,
  AlertTriangle,
  Info,
  ExternalLink,
  Filter,
  CheckCircle2,
  Check,
  XCircle,
} from 'lucide-react';

type RoleFilter = 'ALL' | 'CUSTOMER' | 'AGENT' | 'ADMIN';

export const UsersList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { success, error: toastError } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Role Filter
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedRole, setSelectedRole] = useState<RoleFilter>(
    (searchParams.get('role')?.toUpperCase() as RoleFilter) || 'ALL'
  );

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Promotion Modal State
  const [promoteTargetUser, setPromoteTargetUser] = useState<User | null>(null);
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);

  // Backend Endpoint Probe Status
  const [endpointProbe, setEndpointProbe] = useState<EndpointCheckResult | null>(null);
  const [probingEndpoint, setProbingEndpoint] = useState(false);

  // Fetch real users from GET /api/admin/users
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await usersApi.getUsers();
      setUsers(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // Probe whether PATCH /api/admin/users/:userId/role exists on the Cloudflare Workers API
  const probeRoleEndpoint = useCallback(async () => {
    setProbingEndpoint(true);
    try {
      const result = await usersApi.checkRoleEndpointAvailability();
      setEndpointProbe(result);
    } finally {
      setProbingEndpoint(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    probeRoleEndpoint();
  }, [fetchUsers, probeRoleEndpoint]);

  // Sync filters to search params
  const handleRoleFilterChange = (role: RoleFilter) => {
    setSelectedRole(role);
    setCurrentPage(1);
    if (role === 'ALL') {
      searchParams.delete('role');
    } else {
      searchParams.set('role', role);
    }
    setSearchParams(searchParams);
  };

  // Filtered users calculation
  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return users.filter((u) => {
      // Role match
      if (selectedRole !== 'ALL' && u.role !== selectedRole) {
        return false;
      }
      // Search match
      if (!q) return true;
      return (
        u.full_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.id?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q)
      );
    });
  }, [users, searchQuery, selectedRole]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, currentPage, itemsPerPage]);

  // Open Promote confirmation modal
  const handleOpenPromote = (userToPromote: User, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPromoteTargetUser(userToPromote);
    setIsPromoteModalOpen(true);
  };

  // Handle successful promotion
  const handlePromotionSuccess = (updatedUser?: User) => {
    if (updatedUser) {
      setUsers((prev) =>
        prev.map((u) => (u.id === updatedUser.id ? { ...u, role: 'AGENT' } : u))
      );
    }
    // Refresh the users list directly from the production API
    fetchUsers();
  };

  // Summary counts
  const customerCount = users.filter((u) => u.role === 'CUSTOMER').length;
  const agentCount = users.filter((u) => u.role === 'AGENT').length;
  const adminCount = users.filter((u) => u.role === 'ADMIN').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-neutral-900">User Management</h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Manage QuickServe customer accounts, service agents, and administrator access
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchUsers}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-xl hover:bg-neutral-50 transition-colors shadow-2xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Backend API Endpoint Contract & Status Banner */}
      <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/90 text-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700 shrink-0 mt-0.5">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-neutral-900 flex items-center gap-2 flex-wrap">
                <span>Production API Role-Management Contract:</span>
                <code className="px-1.5 py-0.5 bg-neutral-200 text-neutral-800 rounded font-mono text-[11px]">
                  PATCH /api/admin/users/:userId/role
                </code>
              </div>
              <p className="text-neutral-600 mt-1 leading-relaxed text-[11px]">
                Target endpoint: <span className="font-mono text-neutral-800">{API_BASE_URL}/api/admin/users/&#123;id&#125;/role</span> with payload <code className="font-mono text-neutral-800">&#123; "role": "AGENT" &#125;</code>.
                {endpointProbe && (
                  <span className="block mt-1">
                    {endpointProbe.available ? (
                      <span className="text-emerald-700 font-semibold inline-flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5" />
                        <span>Live Cloudflare Worker route status: Registered & Active (verified via /api registry). Ready for role promotions.</span>
                      </span>
                    ) : endpointProbe.status === 404 ? (
                      <span className="text-amber-800 font-medium">
                        Live Cloudflare Worker route status: <strong className="font-semibold">404 Not Found</strong> (endpoint not yet registered on Worker router). Calls are dispatched directly to the production API without mock fallbacks.
                      </span>
                    ) : (
                      <span className="text-neutral-700 font-medium">
                        Live Cloudflare Worker route status: HTTP {endpointProbe.status}
                      </span>
                    )}
                  </span>
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={probeRoleEndpoint}
            disabled={probingEndpoint}
            className="self-start md:self-center px-2.5 py-1.5 rounded-lg bg-white border border-neutral-300 text-[11px] font-medium text-neutral-700 hover:bg-neutral-100 transition-colors shrink-0 flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3 h-3 ${probingEndpoint ? 'animate-spin' : ''}`} />
            <span>Check Endpoint</span>
          </button>
        </div>
      </div>

      {/* Search and Role Filter Bar */}
      <div className="bg-white rounded-xl border border-neutral-200/80 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search users..."
              className="w-full pl-10 pr-3.5 py-2 text-xs bg-neutral-50 hover:bg-neutral-100/60 focus:bg-white border border-neutral-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-neutral-800 placeholder:text-neutral-400"
            />
          </div>

          {/* Role Filter Tabs (Segmented Controls) */}
          <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-xl self-start md:self-auto shrink-0">
            <button
              type="button"
              onClick={() => handleRoleFilterChange('ALL')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                selectedRole === 'ALL'
                  ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              All ({users.length})
            </button>
            <button
              type="button"
              onClick={() => handleRoleFilterChange('CUSTOMER')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                selectedRole === 'CUSTOMER'
                  ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Customer ({customerCount})
            </button>
            <button
              type="button"
              onClick={() => handleRoleFilterChange('AGENT')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                selectedRole === 'AGENT'
                  ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Agent ({agentCount})
            </button>
            <button
              type="button"
              onClick={() => handleRoleFilterChange('ADMIN')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                selectedRole === 'ADMIN'
                  ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Admin ({adminCount})
            </button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-neutral-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : error ? (
          <div className="p-12 text-center">
            <p className="text-sm font-semibold text-rose-600 mb-2">Error Loading Users</p>
            <p className="text-xs text-neutral-500 mb-4">{error}</p>
            <button
              type="button"
              onClick={fetchUsers}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl"
            >
              Try Again
            </button>
          </div>
        ) : filteredUsers.length === 0 ? (
          <EmptyState
            title="No users found"
            description={
              searchQuery || selectedRole !== 'ALL'
                ? `No users match the search query "${searchQuery}" with role filter "${selectedRole}".`
                : 'No users were returned from the production API.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50/70 border-b border-neutral-200/80 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">User ID</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Created Date</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-xs">
                {paginatedUsers.map((u) => {
                  const isCustomer = u.role === 'CUSTOMER';
                  const isAgent = u.role === 'AGENT';
                  const isAdmin = u.role === 'ADMIN';

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-neutral-50/70 transition-colors group cursor-pointer"
                      onClick={() => navigate(`/users/${u.id}`)}
                    >
                      {/* Full Name & Avatar */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <Avatar name={u.full_name} email={u.email} size="sm" />
                          <div>
                            <span className="font-semibold text-neutral-900 block">
                              {u.full_name || 'QuickServe User'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* User ID */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-neutral-500">
                        <span className="font-mono text-[11px] tabular-nums bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-700">
                          {u.id}
                        </span>
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-4 text-neutral-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-neutral-400" />
                          <span>{u.email}</span>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <RoleBadge role={u.role} size="sm" />
                      </td>

                      {/* Created Date */}
                      <td className="py-3.5 px-4 text-neutral-500 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                          <span>
                            {u.created_at
                              ? new Date(u.created_at).toLocaleDateString()
                              : 'N/A'}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          {isCustomer ? (
                            <button
                              type="button"
                              onClick={(e) => handleOpenPromote(u, e)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 transition-colors shadow-2xs"
                              title={`Promote ${u.full_name} to Service Agent`}
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Promote to Agent</span>
                            </button>
                          ) : isAgent ? (
                            <span className="text-neutral-400 text-xs px-2 py-1">—</span>
                          ) : isAdmin ? (
                            <span className="text-neutral-400 text-xs px-2 py-1">—</span>
                          ) : (
                            <span className="text-neutral-400 text-xs px-2 py-1">—</span>
                          )}

                          <button
                            type="button"
                            onClick={() => navigate(`/users/${u.id}`)}
                            className="p-1.5 text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="View User Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
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
          totalItems={filteredUsers.length}
          itemsPerPage={itemsPerPage}
          onPageChange={(page: number) => setCurrentPage(page)}
        />
      </div>

      {/* Confirmation Modal for Promotion */}
      <PromoteAgentModal
        isOpen={isPromoteModalOpen}
        onClose={() => {
          setIsPromoteModalOpen(false);
          setPromoteTargetUser(null);
        }}
        user={promoteTargetUser}
        onSuccess={handlePromotionSuccess}
      />
    </div>
  );
};

export default UsersList;
