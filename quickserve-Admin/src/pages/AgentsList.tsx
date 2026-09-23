import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import usersApi from '../api/users';
import requestsApi from '../api/requests';
import authApi from '../api/auth';
import { User, ServiceRequest } from '../types';
import { Avatar } from '../components/ui/Avatar';
import { TableSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Pagination } from '../components/ui/Pagination';
import { Modal } from '../components/ui/Modal';
import { PromoteUserModal } from '../components/users/PromoteUserModal';
import { useAdminData } from '../components/layout/AdminLayout';
import { useToast } from '../context/ToastContext';
import { getErrorMessage } from '../api/axios';
import {
  Search,
  Plus,
  RefreshCw,
  Eye,
  Mail,
  Phone,
  UserCheck,
  UserPlus,
  Loader2,
  Calendar,
  Sparkles,
} from 'lucide-react';

export const AgentsList: React.FC = () => {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const { refreshData } = useAdminData();

  const [agents, setAgents] = useState<User[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Promote User Modal
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);

  // New Agent Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [submittingAgent, setSubmittingAgent] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [agentsList, reqsList] = await Promise.all([
        usersApi.getAgents(),
        requestsApi.getAdminRequests().catch(() => []),
      ]);
      setAgents(agentsList);
      setRequests(reqsList);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute workload per agent
  const agentWorkload = useMemo(() => {
    const map = new Map<string, { active: number; completed: number }>();
    requests.forEach((r) => {
      if (r.assigned_agent_id) {
        const current = map.get(r.assigned_agent_id) || { active: 0, completed: 0 };
        if (r.status === 'COMPLETED') {
          current.completed++;
        } else if (['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'].includes(r.status)) {
          current.active++;
        }
        map.set(r.assigned_agent_id, current);
      }
    });
    return map;
  }, [requests]);

  // Filter
  const filteredAgents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return agents;
    return agents.filter(
      (a) =>
        a.full_name?.toLowerCase().includes(q) ||
        a.email?.toLowerCase().includes(q) ||
        a.phone?.toLowerCase().includes(q)
    );
  }, [agents, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredAgents.length / itemsPerPage);
  const paginatedAgents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAgents.slice(start, start + itemsPerPage);
  }, [filteredAgents, currentPage, itemsPerPage]);

  // Handle register agent
  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName.trim() || !newEmail.trim() || !newPassword) {
      toastError('Please fill in required fields.');
      return;
    }

    setSubmittingAgent(true);
    try {
      await authApi.register({
        full_name: newFullName.trim(),
        email: newEmail.trim(),
        password: newPassword,
        phone: newPhone.trim() || undefined,
        role: 'AGENT',
      });
      success(`Service Agent ${newFullName} registered successfully`);
      setIsCreateOpen(false);
      setNewFullName('');
      setNewEmail('');
      setNewPassword('');
      setNewPhone('');
      fetchData();
    } catch (err) {
      toastError(getErrorMessage(err), 'Failed to register agent');
    } finally {
      setSubmittingAgent(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-neutral-900">Service Agents</h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Field service technicians, assignment capacity, and completed tasks
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-xl hover:bg-neutral-50 transition-colors shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {/* Promote Customer to Agent Action */}
          <button
            type="button"
            onClick={() => setIsPromoteModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/80 hover:bg-indigo-100 rounded-xl transition-colors shadow-2xs"
            title="Promote an existing customer to service agent"
          >
            <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span>Promote Customer</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Service Agent</span>
          </button>
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
            placeholder="Search agent name, email address, phone..."
            className="w-full pl-10 pr-3.5 py-2 text-xs bg-neutral-50 hover:bg-neutral-100/60 focus:bg-white border border-neutral-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-neutral-800 placeholder:text-neutral-400"
          />
        </div>
      </div>

      {/* Agents Table */}
      <div className="bg-white rounded-xl border border-neutral-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : error ? (
          <div className="p-12 text-center">
            <p className="text-sm font-semibold text-rose-600 mb-2">Error loading agents</p>
            <p className="text-xs text-neutral-500 mb-4">{error}</p>
            <button
              type="button"
              onClick={fetchData}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl"
            >
              Try Again
            </button>
          </div>
        ) : filteredAgents.length === 0 ? (
          <EmptyState
            title="No service agents found"
            description={
              searchQuery
                ? `No agents match query "${searchQuery}"`
                : 'No service agents have been registered yet.'
            }
            action={
              <button
                type="button"
                onClick={() => setIsCreateOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Add Service Agent</span>
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50/70 border-b border-neutral-200/80 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Service Agent</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4">Phone</th>
                  <th className="py-3.5 px-4">Active Tasks</th>
                  <th className="py-3.5 px-4">Completed Tasks</th>
                  <th className="py-3.5 px-4">Registered Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-xs">
                {paginatedAgents.map((agent) => {
                  const workload = agentWorkload.get(agent.id) || { active: 0, completed: 0 };
                  return (
                    <tr
                      key={agent.id}
                      className="hover:bg-neutral-50/70 transition-colors group cursor-pointer"
                      onClick={() => navigate(`/agents/${agent.id}`)}
                    >
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <Avatar name={agent.full_name} email={agent.email} size="sm" />
                          <span className="font-semibold text-neutral-900">{agent.full_name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-neutral-600 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-neutral-400" />
                          <span>{agent.email}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-neutral-600 whitespace-nowrap">
                        {agent.phone ? (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-neutral-400" />
                            <span>{agent.phone}</span>
                          </div>
                        ) : (
                          <span className="text-neutral-400 italic">Not set</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            workload.active > 0
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-neutral-100 text-neutral-600'
                          }`}
                        >
                          {workload.active} active
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {workload.completed} completed
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-neutral-500 whitespace-nowrap">
                        {agent.created_at ? new Date(agent.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/agents/${agent.id}`);
                          }}
                          className="p-1.5 text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="View Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
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
          totalItems={filteredAgents.length}
          itemsPerPage={itemsPerPage}
          onPageChange={(page: number) => setCurrentPage(page)}
        />
      </div>

      {/* Add Agent Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Register Service Agent"
        description="Add a new certified service agent to the QuickServe technician pool."
        size="md"
      >
        <form onSubmit={handleCreateAgent} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={newFullName}
              onChange={(e) => setNewFullName(e.target.value)}
              placeholder="e.g. Ramesh Kumar"
              className="w-full px-3.5 py-2.5 text-xs bg-white border border-neutral-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
              Email Address *
            </label>
            <input
              type="email"
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="agent@quickserve.com"
              className="w-full px-3.5 py-2.5 text-xs bg-white border border-neutral-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
              Temporary Password *
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full px-3.5 py-2.5 text-xs bg-white border border-neutral-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
              Contact Phone
            </label>
            <input
              type="tel"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="+91 91234 56789"
              className="w-full px-3.5 py-2.5 text-xs bg-white border border-neutral-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              disabled={submittingAgent}
              className="px-4 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-xl hover:bg-neutral-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingAgent}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-50 shadow-xs"
            >
              {submittingAgent ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <UserPlus className="w-3.5 h-3.5" />
              )}
              <span>Create Agent</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AgentsList;
