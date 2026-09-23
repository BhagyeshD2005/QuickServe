import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import requestsApi from '../../api/requests';
import { RequestStatus } from '../../types';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../api/axios';
import { RefreshCw, Loader2 } from 'lucide-react';

interface UpdateStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestId: string;
  requestNumber?: string;
  currentStatus: RequestStatus;
  onSuccess: () => void;
}

const ALL_STATUSES: RequestStatus[] = [
  'CREATED',
  'ASSIGNED',
  'ACCEPTED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
];

export const UpdateStatusModal: React.FC<UpdateStatusModalProps> = ({
  isOpen,
  onClose,
  requestId,
  requestNumber,
  currentStatus,
  onSuccess,
}) => {
  const [newStatus, setNewStatus] = useState<RequestStatus>(currentStatus);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { success, error: toastError } = useToast();

  useEffect(() => {
    if (isOpen) {
      setNewStatus(currentStatus);
      setNote('');
    }
  }, [isOpen, currentStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newStatus === currentStatus && !note.trim()) {
      toastError('Please choose a different status or provide a note.');
      return;
    }

    setSubmitting(true);
    try {
      if (newStatus !== currentStatus) {
        await requestsApi.updateStatus(requestId, newStatus);
      }
      if (note.trim()) {
        await requestsApi.addNote(requestId, note.trim());
      }

      success('Request status updated successfully', requestNumber || 'Request Updated');
      onSuccess();
      onClose();
    } catch (err) {
      toastError(getErrorMessage(err), 'Status Update Failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      id="update-status-modal"
      isOpen={isOpen}
      onClose={onClose}
      title="Update Request Status"
      description={`Update the lifecycle status and attach an operational note for ${requestNumber || 'this request'}.`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">
            Current Status
          </label>
          <div className="px-3.5 py-2 text-xs font-semibold text-neutral-800 bg-neutral-100 rounded-xl">
            {currentStatus}
          </div>
        </div>

        <div>
          <label
            htmlFor="new-status-select"
            className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-2"
          >
            New Status
          </label>
          <select
            id="new-status-select"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value as RequestStatus)}
            className="w-full px-3.5 py-2.5 text-xs bg-white border border-neutral-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
          >
            {ALL_STATUSES.map((st) => (
              <option key={st} value={st}>
                {st.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="status-note"
            className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-2"
          >
            Status Note / Audit Reason (Optional)
          </label>
          <textarea
            id="status-note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add context or notes about this transition..."
            className="w-full px-3.5 py-2.5 text-xs bg-white border border-neutral-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors resize-none placeholder:text-neutral-400"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-xl hover:bg-neutral-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-50 shadow-xs"
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            <span>Update Status</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default UpdateStatusModal;
