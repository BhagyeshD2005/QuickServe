import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import usersApi from '../api/users';
import requestsApi from '../api/requests';
import { User, ServiceRequest } from '../types';
import { Avatar } from '../components/ui/Avatar';
import { RoleBadge } from '../components/ui/RoleBadge';
import { StatusBadge } from '../components/ui/StatusBadge';
import { PriorityBadge } from '../components/ui/PriorityBadge';
import { StatCard } from '../components/ui/StatCard';
import { TableSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { PromoteAgentModal } from '../components/users/PromoteAgentModal';
import { getErrorMessage, API_BASE_URL } from '../api/axios';
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  ClipboardList,
  CheckCircle2,
  PlayCircle,
  XCircle,
  Eye,
  RefreshCw,
  UserCheck,
  ShieldAlert,
  Code,
  Check,
} from 'lucide-react';

export const UserDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [userRequests, setUserRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Promotion modal
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);

  const fetchUserData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    try {
      const [allUsers, allRequests] = await Promise.all([
        usersApi.getUsers(),
        requestsApi.getAdminRequests().catch(() => []),
      ]);

      const found = allUsers.find((u) => u.id === id);
      if (!found) {
        throw new Error(`User with ID ${id} was not found on the backend.`);
      }
      setUser(found);

      // Filter requests by user ID, email, or name
      const matched = allRequests.filter(
        (r) =>
          r.customer_id === id ||
          r.assigned_agent_id === id ||
          r.customer_email?.toLowerCase() === found.email?.toLowerCase() ||
          r.agent_email?.toLowerCase() === found.email?.toLowerCase() ||
          r.customer_name?.toLowerCase() === found.full_name?.toLowerCase()
      );
      setUserRequests(matched);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const handlePromotionSuccess = (updatedUser?: User) => {
    if (updatedUser) {
      setUser((prev) => (prev ? { ...prev, role: 'AGENT' } : null));
    }
    fetchUserData();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => navigate('/users')}
          className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Users</span>
        </button>
        <TableSkeleton rows={4} cols={5} />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => navigate('/users')}
          className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Users</span>
        </button>
        <div className="bg-white rounded-xl border border-neutral-200/80 p-12 text-center">
          <p className="text-sm font-semibold text-rose-600 mb-2">User Not Found</p>
          <p className="text-xs text-neutral-500 mb-4">{error || 'Unable to locate user details.'}</p>
          <button
            type="button"
            onClick={fetchUserData}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const isCustomer = user.role === 'CUSTOMER';
  const isAgent = user.role === 'AGENT';
  const isAdmin = user.role === 'ADMIN';

  const completedCount = userRequests.filter((r) => r.status === 'COMPLETED').length;
  const inProgressCount = userRequests.filter((r) => r.status === 'IN_PROGRESS').length;
  const cancelledCount = userRequests.filter((r) => r.status === 'CANCELLED').length;

  return (
    <div className="space-y-6">
      {/* Header & Back Link */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate('/users')}
            className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Users</span>
          </button>
          <h2 className="text-xl font-bold tracking-tight text-neutral-900">User Profile</h2>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {/* Promote to Agent Button for Customer */}
          {isCustomer && (
            <button
              type="button"
              onClick={() => setIsPromoteModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-xs"
            >
              <UserCheck className="w-4 h-4" />
              <span>Promote to Agent</span>
            </button>
          )}

          {isAgent && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 rounded-xl">
              <Check className="w-3.5 h-3.5" />
              <span>Already an Agent</span>
            </span>
          )}

          <button
            type="button"
            onClick={fetchUserData}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-xl hover:bg-neutral-50 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* User Information Card */}
      <div className="bg-white rounded-xl border border-neutral-200/80 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <Avatar name={user.full_name} email={user.email} size="lg" />
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-lg font-bold text-neutral-900">{user.full_name}</h3>
              <RoleBadge role={user.role} size="md" />
              <span className="font-mono text-2xs text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
                ID: {user.id}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-600 pt-1">
              <div className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-neutral-400" />
                <span>{user.email}</span>
              </div>
              {user.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{user.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-neutral-400">
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  Member since {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats for this User */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          title="Associated Requests"
          value={userRequests.length}
          icon={ClipboardList}
          iconBgColor="bg-indigo-50"
          iconTextColor="text-indigo-600"
        />
        <StatCard
          title="Completed"
          value={completedCount}
          icon={CheckCircle2}
          iconBgColor="bg-emerald-50"
          iconTextColor="text-emerald-600"
        />
        <StatCard
          title="In Progress"
          value={inProgressCount}
          icon={PlayCircle}
          iconBgColor="bg-amber-50"
          iconTextColor="text-amber-600"
        />
        <StatCard
          title="Cancelled"
          value={cancelledCount}
          icon={XCircle}
          iconBgColor="bg-rose-50"
          iconTextColor="text-rose-600"
        />
      </div>

      {/* Service Request History */}
      <div className="bg-white rounded-xl border border-neutral-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-neutral-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">Request History</h3>
            <p className="text-xs text-neutral-500">Service tickets linked to this user</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-700">
            {userRequests.length} total
          </span>
        </div>

        {userRequests.length === 0 ? (
          <EmptyState
            title="No service requests found"
            description="This user has not yet submitted or been assigned to any service tickets."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50/70 border-b border-neutral-200/80 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Request ID</th>
                  <th className="py-3 px-4">Service</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Assigned Agent</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-xs">
                {userRequests.map((req) => (
                  <tr
                    key={req.id}
                    className="hover:bg-neutral-50/70 transition-colors group cursor-pointer"
                    onClick={() => navigate(`/requests/${req.id}`)}
                  >
                    <td className="py-3 px-4 font-semibold text-indigo-600">{req.request_number}</td>
                    <td className="py-3 px-4 text-neutral-700">{req.service_name || 'Service'}</td>
                    <td className="py-3 px-4">
                      <PriorityBadge priority={req.priority} size="sm" />
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={req.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-neutral-600">
                      {req.agent_name || <span className="text-neutral-400 italic">Unassigned</span>}
                    </td>
                    <td className="py-3 px-4 text-neutral-500">
                      {req.created_at ? new Date(req.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/requests/${req.id}`);
                        }}
                        className="p-1.5 text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="View Request"
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

      {/* Raw Live API Record Inspector */}
      <div className="bg-white rounded-xl border border-neutral-200/80 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Code className="w-4 h-4 text-neutral-400" />
            <h3 className="text-xs font-semibold text-neutral-800 uppercase tracking-wider">
              Live Production API Payload Inspection
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setShowRawJson(!showRawJson)}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
          >
            {showRawJson ? 'Hide Raw JSON' : 'View Raw JSON'}
          </button>
        </div>

        {showRawJson && (
          <pre className="p-4 bg-neutral-900 text-emerald-400 rounded-xl font-mono text-xs overflow-x-auto">
            {JSON.stringify(user, null, 2)}
          </pre>
        )}
      </div>

      {/* Promotion Modal */}
      <PromoteAgentModal
        isOpen={isPromoteModalOpen}
        onClose={() => setIsPromoteModalOpen(false)}
        user={user}
        onSuccess={handlePromotionSuccess}
      />
    </div>
  );
};

export default UserDetails;
