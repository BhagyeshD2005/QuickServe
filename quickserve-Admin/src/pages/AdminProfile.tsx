import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Avatar } from '../components/ui/Avatar';
import {
  ShieldCheck,
  Mail,
  KeyRound,
  Copy,
  Check,
  LogOut,
  Eye,
  EyeOff,
  Server,
  UserCircle,
} from 'lucide-react';

export const AdminProfile: React.FC = () => {
  const { user, token, logout } = useAuth();
  const { success } = useToast();

  const [showToken, setShowToken] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyToken = () => {
    if (!token) return;
    navigator.clipboard.writeText(token);
    setCopied(true);
    success('Admin bearer token copied to clipboard');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-neutral-900">Administrator Profile</h2>
        <p className="text-xs text-neutral-500 mt-0.5">
          Active administrative identity, credential parameters, and security tokens
        </p>
      </div>

      {/* Profile Overview Card */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <Avatar name={user?.full_name || 'Admin'} email={user?.email} size="lg" />
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="text-lg font-bold text-neutral-900">
                {user?.full_name || 'QuickServe Administrator'}
              </h3>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                <ShieldCheck className="w-3.5 h-3.5" />
                SYSTEM ADMINISTRATOR
              </span>
            </div>
            <p className="text-xs text-neutral-500">{user?.email}</p>
          </div>

          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors border border-rose-200 self-start sm:self-auto"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Account Details & API Access Tokens */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Administrator Details */}
        <div className="bg-white rounded-2xl border border-neutral-200/80 p-6 shadow-xs space-y-4">
          <h4 className="text-sm font-semibold text-neutral-900 flex items-center gap-2 border-b border-neutral-100 pb-3">
            <UserCircle className="w-4 h-4 text-indigo-600" />
            <span>Identity Attributes</span>
          </h4>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-neutral-400 block mb-0.5">Account ID</span>
              <span className="font-mono text-neutral-700">{user?.id || '—'}</span>
            </div>
            <div>
              <span className="text-neutral-400 block mb-0.5">Primary Email</span>
              <span className="font-medium text-neutral-800">{user?.email || '—'}</span>
            </div>
            <div>
              <span className="text-neutral-400 block mb-0.5">Authorization Role</span>
              <span className="font-semibold text-indigo-600">{user?.role || 'ADMIN'}</span>
            </div>
            <div>
              <span className="text-neutral-400 block mb-0.5">Registered / Verified</span>
              <span className="text-neutral-700">
                {user?.created_at ? new Date(user.created_at).toLocaleString() : 'Active session'}
              </span>
            </div>
          </div>
        </div>

        {/* Backend & Security Parameters */}
        <div className="bg-white rounded-2xl border border-neutral-200/80 p-6 shadow-xs space-y-4">
          <h4 className="text-sm font-semibold text-neutral-900 flex items-center gap-2 border-b border-neutral-100 pb-3">
            <Server className="w-4 h-4 text-indigo-600" />
            <span>Backend Integration</span>
          </h4>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-neutral-400 block mb-0.5">API Server Target</span>
              <span className="font-mono text-neutral-700 break-all">
                https://quickserve-api.quickserve-by-bhagyesh.workers.dev
              </span>
            </div>
            <div>
              <span className="text-neutral-400 block mb-0.5">Runtime Architecture</span>
              <span className="font-medium text-neutral-800">Cloudflare Workers Edge API</span>
            </div>
            <div>
              <span className="text-neutral-400 block mb-0.5">Token Specification</span>
              <span className="font-medium text-neutral-800">JWT (JSON Web Token) with Bearer Scheme</span>
            </div>
          </div>
        </div>
      </div>

      {/* Active Session JWT Token */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-indigo-600" />
            <h4 className="text-sm font-semibold text-neutral-900">Current Session Token</h4>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="p-1.5 text-neutral-500 hover:text-neutral-800 rounded-lg hover:bg-neutral-100 transition-colors"
              title={showToken ? 'Hide token' : 'Reveal token'}
            >
              {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={handleCopyToken}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Token'}</span>
            </button>
          </div>
        </div>

        <p className="text-xs text-neutral-500 leading-relaxed">
          This JWT token is automatically injected in all outbound API requests via the `Authorization: Bearer` header.
        </p>

        <div className="p-3 bg-neutral-900 text-neutral-200 rounded-xl font-mono text-[11px] break-all select-all overflow-x-auto">
          {token ? (
            showToken ? (
              token
            ) : (
              `${token.slice(0, 24)}••••••••••••••••••••••••••••••••••••••••${token.slice(-12)}`
            )
          ) : (
            <span className="text-neutral-500">No active session token present.</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;
