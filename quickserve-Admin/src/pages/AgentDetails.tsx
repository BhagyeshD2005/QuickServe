import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import usersApi from '../api/users';
import requestsApi from '../api/requests';
import { User, ServiceRequest } from '../types';
import { Avatar } from '../components/ui/Avatar';
import { StatusBadge } from '../components/ui/StatusBadge';
import { PriorityBadge } from '../components/ui/PriorityBadge';
import { StatCard } from '../components/ui/StatCard';
import { TableSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { getErrorMessage } from '../api/axios';
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  ClipboardList,
  CheckCircle2,
  PlayCircle,
  Eye,
  RefreshCw,
  UserCheck,
} from 'lucide-react';

export const AgentDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [agent, setAgent] = useState<User | null>(null);
  const [assignedRequests, setAssignedRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgentData = async () => {
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
        throw new Error('Service agent not found');
      }
      setAgent(found);

      // Filter requests assigned to this agent
      const matched = allRequests.filter(
        (r) =>
          r.assigned_agent_id === id ||
          r.agent_email?.toLowerCase() === found.email?.toLowerCase() ||
          r.agent_name?.toLowerCase() === found.full_name?.toLowerCase()
      );
      setAssignedRequests(matched);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgentData();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => navigate('/agents')}
          className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Agents</span>
        </button>
        <TableSkeleton rows={4} cols={5} />
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => navigate('/agents')}
          className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Agents</span>
        </button>
        <div className="bg-white rounded-xl border border-neutral-200/80 p-12 text-center">
          <p className="text-sm font-semibold text-rose-600 mb-2">Agent Not Found</p>
          <p className="text-xs text-neutral-500 mb-4">{error || 'Unable to locate service agent details.'}</p>
          <button
            type="button"
            onClick={fetchAgentData}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const activeCount = assignedRequests.filter((r) =>
    ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'].includes(r.status)
  ).length;
  const completedCount = assignedRequests.filter((r) => r.status === 'COMPLETED').length;

  return (
    <div className="space-y-6">
      {/* Header & Back */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate('/agents')}
            className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Service Agents</span>
          </button>
          <h2 className="text-xl font-bold tracking-tight text-neutral-900">Agent Profile</h2>
        </div>

        <button
          type="button"
          onClick={fetchAgentData}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-xl hover:bg-neutral-50 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Agent Info Card */}
      <div className="bg-white rounded-xl border border-neutral-200/80 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <Avatar name={agent.full_name} email={agent.email} size="lg" />
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-lg font-bold text-neutral-900">{agent.full_name}</h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                SERVICE AGENT
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-600 pt-1">
              <div className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-neutral-400" />
                <span>{agent.email}</span>
              </div>
              {agent.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{agent.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-neutral-400">
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  Member since {agent.created_at ? new Date(agent.created_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats for this Agent */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Assigned Workload"
          value={assignedRequests.length}
          subtitle="All tasks ever assigned"
          icon={ClipboardList}
          iconBgColor="bg-indigo-50"
          iconTextColor="text-indigo-600"
        />
        <StatCard
          title="Active Tasks"
          value={activeCount}
          subtitle="Currently assigned or in-progress"
          icon={PlayCircle}
          iconBgColor="bg-amber-50"
          iconTextColor="text-amber-600"
        />
        <StatCard
          title="Completed"
          value={completedCount}
          subtitle="Fulfillments completed"
          icon={CheckCircle2}
          iconBgColor="bg-emerald-50"
          iconTextColor="text-emerald-600"
        />
      </div>

      {/* Agent Assigned Requests */}
      <div className="bg-white rounded-xl border border-neutral-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-neutral-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">Assigned Tasks</h3>
            <p className="text-xs text-neutral-500">Service requests assigned to this agent</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-700">
            {assignedRequests.length} total
          </span>
        </div>

        {assignedRequests.length === 0 ? (
          <EmptyState
            title="No tasks currently assigned"
            description="This agent has no active or historical service tasks assigned."
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
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-xs">
                {assignedRequests.map((req) => (
                  <tr
                    key={req.id}
                    className="hover:bg-neutral-50/70 transition-colors group cursor-pointer"
                    onClick={() => navigate(`/requests/${req.id}`)}
                  >
                    <td className="py-3 px-4 font-semibold text-indigo-600">{req.request_number}</td>
                    <td className="py-3 px-4 text-neutral-800 font-medium">{req.customer_name || 'Customer'}</td>
                    <td className="py-3 px-4 text-neutral-700">{req.service_name || 'Service'}</td>
                    <td className="py-3 px-4">
                      <PriorityBadge priority={req.priority} size="sm" />
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={req.status} size="sm" />
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
    </div>
  );
};

export default AgentDetails;
