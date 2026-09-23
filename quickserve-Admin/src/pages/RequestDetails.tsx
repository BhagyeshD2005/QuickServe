import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import requestsApi from '../api/requests';
import { ServiceRequest, RequestDetails as RequestDetailsType, RequestHistoryItem, RequestNote } from '../types';
import { StatusBadge } from '../components/ui/StatusBadge';
import { PriorityBadge } from '../components/ui/PriorityBadge';
import { RequestDetailsSkeleton } from '../components/ui/Skeleton';
import { RequestTimeline } from '../components/requests/RequestTimeline';
import { AssignAgentModal } from '../components/requests/AssignAgentModal';
import { UpdateStatusModal } from '../components/requests/UpdateStatusModal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useToast } from '../context/ToastContext';
import { useAdminData } from '../components/layout/AdminLayout';
import { getErrorMessage } from '../api/axios';
import { PulseBeacon } from '../components/ui/AnimatedSvg';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Wrench,
  Clock,
  UserCheck,
  RefreshCw,
  Send,
  AlertTriangle,
  History,
  MessageSquare,
  ShieldAlert,
} from 'lucide-react';

export const RequestDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const { refreshData } = useAdminData();

  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Note State
  const [noteInput, setNoteInput] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  // Modals
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const fetchRequestDetails = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await requestsApi.getRequestById(id);
      const reqObj = (data as any)?.request ? (data as any).request : data;
      const historyList = (data as any)?.history || reqObj?.history || [];
      const notesList = (data as any)?.notes || reqObj?.notes || [];
      setRequest({
        ...reqObj,
        history: historyList,
        notes: notesList,
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRequestDetails();
  }, [fetchRequestDetails]);

  // Handle adding note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !noteInput.trim()) return;

    setSubmittingNote(true);
    try {
      await requestsApi.addNote(id, noteInput.trim());
      success('Operational note added successfully');
      setNoteInput('');
      fetchRequestDetails();
    } catch (err) {
      toastError(getErrorMessage(err), 'Failed to add note');
    } finally {
      setSubmittingNote(false);
    }
  };

  // Handle cancelling request
  const handleCancelRequest = async () => {
    if (!id) return;
    setCancelling(true);
    try {
      await requestsApi.updateStatus(id, 'CANCELLED');
      await requestsApi.addNote(id, 'Request cancelled by administrator.');
      success('Request cancelled successfully');
      setIsCancelConfirmOpen(false);
      fetchRequestDetails();
      refreshData();
    } catch (err) {
      toastError(getErrorMessage(err), 'Cancellation failed');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => navigate('/requests')}
          className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Requests</span>
        </button>
        <RequestDetailsSkeleton />
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => navigate('/requests')}
          className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Requests</span>
        </button>
        <div className="bg-white rounded-xl border border-neutral-200/80 p-12 text-center">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-neutral-900 mb-1">Failed to load request</h3>
          <p className="text-xs text-neutral-500 mb-4">{error || 'Request not found'}</p>
          <button
            type="button"
            onClick={fetchRequestDetails}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const isTerminal = request.status === 'COMPLETED' || request.status === 'CANCELLED';

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => navigate('/requests')}
            className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 transition-colors mb-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Requests</span>
          </button>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-bold tracking-tight text-neutral-900 flex items-center gap-2">
              {request.status === 'IN_PROGRESS' && <PulseBeacon color="amber" size="sm" />}
              {request.status === 'COMPLETED' && <PulseBeacon color="emerald" size="sm" />}
              {request.status === 'CREATED' && <PulseBeacon color="indigo" size="sm" />}
              {request.status === 'ASSIGNED' && <PulseBeacon color="indigo" size="sm" />}
              <span>{request.request_number}</span>
            </h2>
            <StatusBadge status={request.status} size="md" />
            <PriorityBadge priority={request.priority} size="md" />
          </div>
          <p className="text-xs text-neutral-400">
            Created on{' '}
            {request.created_at ? new Date(request.created_at).toLocaleString() : 'N/A'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={fetchRequestDetails}
            className="p-2 text-neutral-600 bg-white border border-neutral-300 rounded-xl hover:bg-neutral-50 transition-colors shadow-2xs"
            title="Refresh details"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setIsAssignModalOpen(true)}
            disabled={isTerminal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 rounded-xl hover:bg-neutral-50 transition-colors shadow-2xs disabled:opacity-50"
          >
            <UserCheck className="w-4 h-4 text-indigo-600" />
            <span>{request.assigned_agent_id ? 'Reassign Agent' : 'Assign Agent'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsStatusModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Update Status</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Details & Right Context */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Service & Request Specifications */}
          <div className="bg-white rounded-xl border border-neutral-200/80 p-6 shadow-xs">
            <h3 className="text-sm font-semibold text-neutral-900 pb-3 mb-4 border-b border-neutral-100 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-indigo-600" />
              <span>Service Specifications</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-neutral-400 block mb-0.5">Service Type</span>
                <span className="font-semibold text-neutral-900 text-sm">
                  {request.service_name || 'General Service'}
                </span>
              </div>

              <div>
                <span className="text-neutral-400 block mb-0.5">Preferred Schedule</span>
                <div className="flex items-center gap-1.5 font-medium text-neutral-800">
                  <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                  <span>
                    {request.preferred_at
                      ? new Date(request.preferred_at).toLocaleString()
                      : 'Not specified'}
                  </span>
                </div>
              </div>

              <div className="sm:col-span-2">
                <span className="text-neutral-400 block mb-0.5">Service Location Address</span>
                <div className="flex items-start gap-1.5 font-medium text-neutral-800 bg-neutral-50 p-3 rounded-lg border border-neutral-200/60">
                  <MapPin className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <span>{request.address || 'Address not provided'}</span>
                </div>
              </div>

              <div className="sm:col-span-2">
                <span className="text-neutral-400 block mb-0.5">Description & Issue Details</span>
                <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200/60 text-neutral-700 leading-relaxed">
                  {request.description || 'No description provided.'}
                </div>
              </div>
            </div>
          </div>

          {/* Status Timeline Component */}
          <RequestTimeline
            currentStatus={request.status}
            history={request.history || []}
          />

          {/* Status Transition History Log */}
          <div className="bg-white rounded-xl border border-neutral-200/80 p-6 shadow-xs">
            <h3 className="text-sm font-semibold text-neutral-900 pb-3 mb-4 border-b border-neutral-100 flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-600" />
              <span>Status Transition Audit History</span>
            </h3>

            {(!request.history || request.history.length === 0) ? (
              <p className="text-xs text-neutral-400 text-center py-4">
                No status transitions recorded yet.
              </p>
            ) : (
              <div className="space-y-3">
                {request.history.map((h: RequestHistoryItem, i: number) => (
                  <div
                    key={h.id || i}
                    className="p-3 rounded-xl border border-neutral-200/60 bg-neutral-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        {h.previous_status && (
                          <>
                            <span className="font-medium text-neutral-500">{h.previous_status}</span>
                            <span className="text-neutral-400">&rarr;</span>
                          </>
                        )}
                        <span className="font-semibold text-neutral-900">{h.new_status}</span>
                      </div>
                      {h.note && (
                        <p className="text-neutral-600 mt-1 italic">"{h.note}"</p>
                      )}
                    </div>
                    <div className="text-right sm:text-right text-[11px] text-neutral-400">
                      <div>{h.changed_by_name || 'System Admin'}</div>
                      <div>{new Date(h.created_at).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Operational Notes Section */}
          <div className="bg-white rounded-xl border border-neutral-200/80 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-semibold text-neutral-900 pb-3 border-b border-neutral-100 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-600" />
              <span>Internal Operational Notes</span>
            </h3>

            {/* Note form */}
            <form onSubmit={handleAddNote} className="space-y-2">
              <textarea
                rows={2}
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Log internal admin notes, customer call summary, or technician updates..."
                className="w-full px-3.5 py-2 text-xs bg-neutral-50 hover:bg-neutral-100/60 focus:bg-white border border-neutral-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors resize-none"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submittingNote || !noteInput.trim()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-50 shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Add Note</span>
                </button>
              </div>
            </form>

            {/* Existing notes list */}
            {(!request.notes || request.notes.length === 0) ? (
              <p className="text-xs text-neutral-400 text-center py-4">No notes added yet.</p>
            ) : (
              <div className="space-y-2.5 pt-2">
                {request.notes.map((n: RequestNote) => (
                  <div
                    key={n.id}
                    className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/60 text-xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-neutral-900">
                        {n.author_name || 'Admin'}
                      </span>
                      <span className="text-[11px] text-neutral-400">
                        {new Date(n.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-neutral-700 leading-relaxed whitespace-pre-wrap">{n.note}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 Col): Customer, Agent, Danger Zone */}
        <div className="space-y-6">
          {/* Customer Profile Card */}
          <div className="bg-white rounded-xl border border-neutral-200/80 p-5 shadow-xs">
            <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-4">
              Customer Details
            </h3>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">
                {request.customer_name?.slice(0, 2).toUpperCase() || 'CU'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm text-neutral-900 truncate">
                  {request.customer_name || 'Customer'}
                </div>
                <div className="text-xs text-neutral-500">Service Customer</div>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-neutral-600 border-t border-neutral-100 pt-3">
              {request.customer_email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                  <a
                    href={`mailto:${request.customer_email}`}
                    className="hover:text-indigo-600 truncate"
                  >
                    {request.customer_email}
                  </a>
                </div>
              )}
              {request.customer_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                  <a href={`tel:${request.customer_phone}`} className="hover:text-indigo-600">
                    {request.customer_phone}
                  </a>
                </div>
              )}
            </div>

            {request.customer_id && (
              <div className="mt-4 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => navigate(`/customers/${request.customer_id}`)}
                  className="w-full py-1.5 text-center text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  View Customer Profile &rarr;
                </button>
              </div>
            )}
          </div>

          {/* Assigned Agent Card */}
          <div className="bg-white rounded-xl border border-neutral-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                Assigned Agent
              </h3>
              {request.assigned_agent_id && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Assigned
                </span>
              )}
            </div>

            {request.agent_name || request.assigned_agent_id ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                    {request.agent_name?.slice(0, 2).toUpperCase() || 'AG'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm text-neutral-900 truncate">
                      {request.agent_name}
                    </div>
                    <div className="text-xs text-neutral-500">Service Technician</div>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-neutral-600 border-t border-neutral-100 pt-3">
                  {request.agent_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      <span className="truncate">{request.agent_email}</span>
                    </div>
                  )}
                  {request.agent_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      <span>{request.agent_phone}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAssignModalOpen(true)}
                    disabled={isTerminal}
                    className="w-full py-2 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors disabled:opacity-50"
                  >
                    Reassign to Another Agent
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <UserCheck className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                <p className="text-xs text-neutral-500 mb-3">No agent has been assigned yet.</p>
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(true)}
                  disabled={isTerminal}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs disabled:opacity-50"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Assign Service Agent</span>
                </button>
              </div>
            )}
          </div>

          {/* Quick Actions & Termination */}
          {!isTerminal && (
            <div className="bg-white rounded-xl border border-rose-200 p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-semibold text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Administrative Actions</span>
              </h3>
              <p className="text-xs text-neutral-500 leading-normal">
                If the customer cancelled or work cannot be performed, terminate this request.
              </p>
              <button
                type="button"
                onClick={() => setIsCancelConfirmOpen(true)}
                className="w-full py-2 px-3 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors"
              >
                Cancel Request
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Assign Agent Modal */}
      <AssignAgentModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        requestId={request.id}
        requestNumber={request.request_number}
        currentAgentId={request.assigned_agent_id}
        onSuccess={() => {
          fetchRequestDetails();
          refreshData();
        }}
      />

      {/* Update Status Modal */}
      <UpdateStatusModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        requestId={request.id}
        requestNumber={request.request_number}
        currentStatus={request.status}
        onSuccess={() => {
          fetchRequestDetails();
          refreshData();
        }}
      />

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isCancelConfirmOpen}
        onClose={() => setIsCancelConfirmOpen(false)}
        onConfirm={handleCancelRequest}
        title="Cancel Service Request?"
        message={`Are you sure you want to terminate request ${request.request_number}? This will set the status to CANCELLED.`}
        confirmText="Yes, Cancel Request"
        cancelText="No, Keep Active"
        isDestructive={true}
        isLoading={cancelling}
      />
    </div>
  );
};

export default RequestDetails;
