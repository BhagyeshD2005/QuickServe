import React, { useState } from 'react';
import axios from 'axios';
import { User } from '../../types';
import usersApi from '../../api/users';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage, API_BASE_URL } from '../../api/axios';
import {
  UserCheck,
  AlertTriangle,
  Loader2,
  X,
  ShieldAlert,
  Info,
  Terminal,
} from 'lucide-react';

interface PromoteAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onSuccess: (updatedUser?: User) => void;
}

export const PromoteAgentModal: React.FC<PromoteAgentModalProps> = ({
  isOpen,
  onClose,
  user,
  onSuccess,
}) => {
  const { success, error: toastError } = useToast();
  const { logout } = useAuth();

  const [loading, setLoading] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  if (!isOpen || !user) return null;

  const handlePromote = async () => {
    setLoading(true);
    setErrorDetails(null);

    try {
      // Direct call to protected production endpoint
      const response = await usersApi.promoteToAgent(user.id);

      if (response && response.success !== false) {
        // Successful promotion
        success('Customer promoted to Service Agent successfully.', 'Role Updated');
        onSuccess(response.data);
        onClose();
      } else {
        throw new Error(response.error?.message || 'Role promotion failed on server.');
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;

        if (status === 401) {
          logout();
          toastError('Session expired. Please sign in again.');
          return;
        }

        if (status === 403) {
          const msg = 'You do not have permission to perform this action.';
          setErrorDetails(msg);
          toastError(msg, 'Authorization Denied');
          return;
        }

        if (status === 404) {
          const msg =
            'The production backend currently does not expose the required ADMIN role-management endpoint (PATCH /api/admin/users/:userId/role returned 404 Not Found).';
          setErrorDetails(msg);
          toastError(msg, 'Endpoint Unavailable');
          return;
        }

        if (status === 409) {
          const msg = 'This user may already have this role.';
          setErrorDetails(msg);
          toastError(msg, 'Role Conflict');
          return;
        }

        if (status === 500) {
          const msg = 'Server error. Please try again.';
          setErrorDetails(msg);
          toastError(msg, 'Server Error');
          return;
        }
      }

      const fallbackMsg = getErrorMessage(err);
      setErrorDetails(fallbackMsg);
      toastError(fallbackMsg, 'Promotion Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs transition-opacity">
      <div
        className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-neutral-200/90 relative animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="promote-modal-title"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-100 transition-colors disabled:opacity-40"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-3.5 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/70 flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h3
              id="promote-modal-title"
              className="text-base font-bold text-neutral-900 tracking-tight"
            >
              Promote {user.full_name} to Service Agent?
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Role Promotion Action &bull; User ID: <span className="font-mono text-neutral-700">{user.id}</span>
            </p>
          </div>
        </div>

        {/* Body Text */}
        <div className="space-y-3.5 my-4">
          <p className="text-xs text-neutral-600 leading-relaxed">
            After promotion, this user will be able to access Service Agent functionality and be assigned to customer service requests across the QuickServe platform.
          </p>

          {/* User Summary Box */}
          <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/80 text-xs space-y-1.5">
            <div className="flex items-center justify-between text-neutral-600">
              <span>Full Name:</span>
              <span className="font-semibold text-neutral-900">{user.full_name}</span>
            </div>
            <div className="flex items-center justify-between text-neutral-600">
              <span>Email Address:</span>
              <span className="font-medium text-neutral-800">{user.email}</span>
            </div>
            <div className="flex items-center justify-between text-neutral-600">
              <span>Current Role:</span>
              <span className="font-semibold text-neutral-700 bg-neutral-200/70 px-2 py-0.5 rounded text-[10px]">
                {user.role}
              </span>
            </div>
            <div className="flex items-center justify-between text-neutral-600">
              <span>Target Role:</span>
              <span className="font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded text-[10px]">
                AGENT
              </span>
            </div>
          </div>

          {/* Error Message Box if API call returned an error */}
          {errorDetails && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 space-y-1.5 animate-in fade-in duration-150">
              <div className="flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium leading-relaxed">{errorDetails}</div>
              </div>
              <p className="text-[11px] text-rose-700/90 pl-6">
                No mock success was created. The user remains with role CUSTOMER.
              </p>
            </div>
          )}

          {/* Technical API Contract Details Accordion */}
          <div className="border-t border-neutral-100 pt-2.5">
            <button
              type="button"
              onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
              className="text-[11px] text-neutral-500 hover:text-neutral-800 flex items-center gap-1.5 transition-colors"
            >
              <Terminal className="w-3.5 h-3.5 text-neutral-400" />
              <span>{showTechnicalDetails ? 'Hide backend API contract' : 'View backend API contract'}</span>
            </button>

            {showTechnicalDetails && (
              <div className="mt-2 p-2.5 rounded-lg bg-neutral-900 text-neutral-200 font-mono text-[11px] space-y-1 overflow-x-auto">
                <div className="text-emerald-400"># Protected Production Endpoint:</div>
                <div>PATCH {API_BASE_URL}/api/admin/users/{user.id}/role</div>
                <div className="text-neutral-400">Authorization: Bearer &lt;ADMIN_JWT&gt;</div>
                <div className="text-neutral-400">Content-Type: application/json</div>
                <div className="text-amber-300">&#123; "role": "AGENT" &#125;</div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-neutral-100">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-xl hover:bg-neutral-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handlePromote}
            disabled={loading}
            id="confirm-promote-agent-btn"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-xs disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Promoting...</span>
              </>
            ) : (
              <>
                <UserCheck className="w-3.5 h-3.5" />
                <span>Promote to Agent</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromoteAgentModal;
