import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import usersApi from '../../api/users';
import requestsApi from '../../api/requests';
import { User } from '../../types';
import { useToast } from '../../context/ToastContext';
import { getErrorMessage } from '../../api/axios';
import { UserCheck, Loader2 } from 'lucide-react';

interface AssignAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestId: string;
  requestNumber?: string;
  currentAgentId?: string | null;
  onSuccess: () => void;
}

export const AssignAgentModal: React.FC<AssignAgentModalProps> = ({
  isOpen,
  onClose,
  requestId,
  requestNumber,
  currentAgentId,
  onSuccess,
}) => {
  const [agents, setAgents] = useState<User[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>(currentAgentId || '');
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { success, error: toastError } = useToast();

  useEffect(() => {
    if (isOpen) {
      setSelectedAgentId(currentAgentId || '');
      const loadAgents = async () => {
        setLoadingAgents(true);
        try {
          const list = await usersApi.getAgents();
          setAgents(list);
          if (!currentAgentId && list.length > 0) {
            setSelectedAgentId(list[0].id);
          }
        } catch (err) {
          toastError(getErrorMessage(err), 'Failed to load agents');
        } finally {
          setLoadingAgents(false);
        }
      };
      loadAgents();
    }
  }, [isOpen, currentAgentId, toastError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgentId) {
      toastError('Please select a service agent.');
      return;
    }

    setSubmitting(true);
    try {
      await requestsApi.assignAgent(requestId, selectedAgentId);
      success('Agent assigned successfully', requestNumber || 'Request Updated');
      onSuccess();
      onClose();
    } catch (err) {
      toastError(getErrorMessage(err), 'Assignment Failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      id="assign-agent-modal"
      isOpen={isOpen}
      onClose={onClose}
      title="Assign Service Agent"
      description={`Assign or reassign an active service agent to request ${requestNumber || ''}.`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {loadingAgents ? (
          <div className="py-8 text-center text-xs text-neutral-500 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
            Loading available service agents...
          </div>
        ) : agents.length === 0 ? (
          <div className="py-6 text-center text-xs text-neutral-500">
            No active agents found in the system.
          </div>
        ) : (
          <div>
            <label
              htmlFor="agent-select"
              className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-2"
            >
              Select Service Agent
            </label>
            <select
              id="agent-select"
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-white border border-neutral-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
            >
              <option value="" disabled>
                -- Choose an agent --
              </option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.full_name} ({agent.email})
                </option>
              ))}
            </select>
          </div>
        )}

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
            disabled={submitting || loadingAgents || agents.length === 0 || !selectedAgentId}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-50 shadow-xs"
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <UserCheck className="w-3.5 h-3.5" />
            )}
            <span>Assign Agent</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AssignAgentModal;
