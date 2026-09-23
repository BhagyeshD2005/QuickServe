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
  XCircle,
  Eye,
  RefreshCw,
  UserCheck,
} from 'lucide-react';
import { RoleBadge } from '../components/ui/RoleBadge';
import { PromoteAgentModal } from '../components/users/PromoteAgentModal';

export const CustomerDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState<User | null>(null);
  const [customerRequests, setCustomerRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);

  const fetchCustomerData = async () => {
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
        throw new Error('Customer not found');
      }
      setCustomer(found);

      // Filter requests by customer_id or matching customer name/email
      const matched = allRequests.filter(
        (r) =>
          r.customer_id === id ||
          r.customer_email?.toLowerCase() === found.email?.toLowerCase() ||
          r.customer_name?.toLowerCase() === found.full_name?.toLowerCase()
      );
      setCustomerRequests(matched);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerData();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => navigate('/customers')}
          className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Customers</span>
        </button>
        <TableSkeleton rows={4} cols={5} />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => navigate('/customers')}
          className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Customers</span>
        </button>
        <div className="bg-white rounded-xl border border-neutral-200/80 p-12 text-center">
          <p className="text-sm font-semibold text-rose-600 mb-2">Customer Not Found</p>
          <p className="text-xs text-neutral-500 mb-4">{error || 'Unable to locate customer details.'}</p>
          <button
            type="button"
            onClick={fetchCustomerData}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const completedCount = customerRequests.filter((r) => r.status === 'COMPLETED').length;
  const inProgressCount = customerRequests.filter((r) => r.status === 'IN_PROGRESS').length;
  const cancelledCount = customerRequests.filter((r) => r.status === 'CANCELLED').length;

  return (
    <div className="space-y-6">
      {/* Header & Back */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate('/customers')}
            className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Customers</span>
          </button>
          <h2 className="text-xl font-bold tracking-tight text-neutral-900">Customer Profile</h2>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {customer.role === 'CUSTOMER' && (
            <button
              type="button"
              onClick={() => setIsPromoteModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-xs"
            >
              <UserCheck className="w-4 h-4" />
              <span>Promote to Agent</span>
            </button>
          )}

          <button
            type="button"
            onClick={fetchCustomerData}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-xl hover:bg-neutral-50 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Customer Info Card */}
      <div className="bg-white rounded-xl border border-neutral-200/80 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <Avatar name={customer.full_name} email={customer.email} size="lg" />
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-lg font-bold text-neutral-900">{customer.full_name}</h3>
              <RoleBadge role={customer.role} size="md" />
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-600 pt-1">
              <div className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-neutral-400" />
                <span>{customer.email}</span>
              </div>
              {customer.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{customer.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-neutral-400">
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  Member since {customer.created_at ? new Date(customer.created_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats for this Customer */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          title="Total Orders"
          value={customerRequests.length}
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

      {/* Customer Requests History */}
      <div className="bg-white rounded-xl border border-neutral-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-neutral-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">Request History</h3>
            <p className="text-xs text-neutral-500">All service requests submitted by this customer</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-700">
            {customerRequests.length} total
          </span>
        </div>

        {customerRequests.length === 0 ? (
          <EmptyState
            title="No service requests found"
            description="This customer has not submitted any service requests yet."
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
                {customerRequests.map((req) => (
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

      {/* Promote Agent Modal */}
      <PromoteAgentModal
        isOpen={isPromoteModalOpen}
        onClose={() => setIsPromoteModalOpen(false)}
        user={customer}
        onSuccess={() => {
          fetchCustomerData();
        }}
      />
    </div>
  );
};

export default CustomerDetails;
