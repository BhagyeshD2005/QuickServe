import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  Server,
  ShieldCheck,
  Clock,
  ExternalLink,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../api/axios';
import api from '../../api/axios';

interface EndpointProbe {
  name: string;
  url: string;
  method: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  statusCode?: number;
  latencyMs?: number;
  errorMsg?: string;
  responsePreview?: unknown;
}

interface SystemDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshDashboard?: () => void;
}

export const SystemDiagnosticsModal: React.FC<SystemDiagnosticsModalProps> = ({
  isOpen,
  onClose,
  onRefreshDashboard,
}) => {
  const { user, token } = useAuth();
  const [copied, setCopied] = useState(false);
  const [testingAll, setTestingAll] = useState(false);

  const [probes, setProbes] = useState<EndpointProbe[]>([
    {
      name: 'Health Check',
      url: '/api/health',
      method: 'GET',
      status: 'idle',
    },
    {
      name: 'Admin Dashboard Stats',
      url: '/api/admin/stats',
      method: 'GET',
      status: 'idle',
    },
    {
      name: 'Admin Service Requests',
      url: '/api/admin/requests',
      method: 'GET',
      status: 'idle',
    },
    {
      name: 'Admin Users Catalog',
      url: '/api/admin/users',
      method: 'GET',
      status: 'idle',
    },
    {
      name: 'Public Services Catalog',
      url: '/api/services',
      method: 'GET',
      status: 'idle',
    },
  ]);

  const runAllProbes = async () => {
    setTestingAll(true);

    const updated = await Promise.all(
      probes.map(async (probe) => {
        const start = performance.now();
        try {
          const res = await api.get(probe.url);
          const latency = Math.round(performance.now() - start);
          return {
            ...probe,
            status: 'success' as const,
            statusCode: res.status,
            latencyMs: latency,
            responsePreview: res.data,
            errorMsg: undefined,
          };
        } catch (err: unknown) {
          const latency = Math.round(performance.now() - start);
          const axiosErr = err as { response?: { status?: number; data?: unknown }; message?: string };
          return {
            ...probe,
            status: 'error' as const,
            statusCode: axiosErr?.response?.status || 0,
            latencyMs: latency,
            errorMsg: axiosErr?.message || 'Request failed',
            responsePreview: axiosErr?.response?.data,
          };
        }
      })
    );

    setProbes(updated);
    setTestingAll(false);
  };

  useEffect(() => {
    if (isOpen) {
      runAllProbes();
    }
  }, [isOpen]);

  const handleCopyDiagnostics = () => {
    const diagnosticReport = {
      timestamp: new Date().toISOString(),
      apiBaseUrl: API_BASE_URL,
      authenticatedUser: user
        ? { id: user.id, email: user.email, role: user.role }
        : 'None',
      hasToken: Boolean(token),
      endpointProbes: probes.map((p) => ({
        name: p.name,
        url: p.url,
        method: p.method,
        status: p.status,
        statusCode: p.statusCode,
        latencyMs: p.latencyMs,
        error: p.errorMsg,
      })),
    };

    navigator.clipboard.writeText(JSON.stringify(diagnosticReport, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const allHealthy = probes.every((p) => p.status === 'success');
  const hasErrors = probes.some((p) => p.status === 'error');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="System Health & API Diagnostics"
      size="lg"
    >
      <div className="space-y-5">
        {/* Status Banner */}
        <div
          className={`p-4 rounded-xl border flex items-center justify-between ${
            allHealthy
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
              : hasErrors
              ? 'bg-amber-50/70 border-amber-200 text-amber-900'
              : 'bg-neutral-50 border-neutral-200 text-neutral-800'
          }`}
        >
          <div className="flex items-center gap-3">
            {allHealthy ? (
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            ) : hasErrors ? (
              <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
                <AlertTriangle className="w-5 h-5" />
              </div>
            ) : (
              <div className="p-2 rounded-lg bg-neutral-200 text-neutral-600">
                <Activity className="w-5 h-5 animate-pulse" />
              </div>
            )}
            <div>
              <h4 className="text-sm font-semibold">
                {allHealthy
                  ? 'All Backend Systems Operational'
                  : hasErrors
                  ? 'Some Endpoints Reported Warnings or Fallbacks'
                  : 'Testing API Connectivity...'}
              </h4>
              <p className="text-xs opacity-80 mt-0.5">
                Connected to Cloudflare Worker API: <span className="font-mono">{API_BASE_URL}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={runAllProbes}
            disabled={testingAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50 transition-colors shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testingAll ? 'animate-spin' : ''}`} />
            <span>Re-test</span>
          </button>
        </div>

        {/* Authentication State Card */}
        <div className="bg-neutral-50/70 rounded-xl border border-neutral-200/80 p-3.5 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-neutral-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              Admin Session Status
            </span>
            <span className="font-mono text-neutral-500">
              Role: <span className="font-semibold text-indigo-700">{user?.role || 'Guest'}</span>
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-neutral-200/50">
            <div>
              <span className="text-neutral-500">Logged in as:</span>{' '}
              <span className="font-medium text-neutral-800">{user?.email || 'None'}</span>
            </div>
            <div>
              <span className="text-neutral-500">JWT Token:</span>{' '}
              <span className="font-mono text-neutral-700">
                {token ? `${token.substring(0, 14)}...${token.substring(token.length - 8)}` : 'No Token'}
              </span>
            </div>
          </div>
        </div>

        {/* Live Probes Table */}
        <div className="rounded-xl border border-neutral-200/80 overflow-hidden shadow-2xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-100/70 border-b border-neutral-200 text-neutral-600 uppercase font-semibold text-2xs">
              <tr>
                <th className="py-2.5 px-3.5">Endpoint</th>
                <th className="py-2.5 px-3">Method</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/60 bg-white">
              {probes.map((probe) => (
                <tr key={probe.url} className="hover:bg-neutral-50/60 transition-colors">
                  <td className="py-2.5 px-3.5">
                    <div className="font-medium text-neutral-900">{probe.name}</div>
                    <div className="font-mono text-2xs text-neutral-400">{probe.url}</div>
                    {probe.errorMsg && (
                      <div className="text-2xs text-rose-600 font-mono mt-0.5">
                        {probe.errorMsg}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-neutral-500">{probe.method}</td>
                  <td className="py-2.5 px-3 text-center">
                    {probe.status === 'loading' ? (
                      <span className="inline-flex items-center gap-1 text-neutral-400">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      </span>
                    ) : probe.status === 'success' ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-2xs">
                        <CheckCircle2 className="w-3 h-3" />
                        {probe.statusCode || 200} OK
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 text-2xs">
                        <XCircle className="w-3 h-3" />
                        {probe.statusCode || 'ERR'}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-neutral-600">
                    {probe.latencyMs !== undefined ? `${probe.latencyMs}ms` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
          <button
            type="button"
            onClick={handleCopyDiagnostics}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied to Clipboard' : 'Copy JSON Report'}</span>
          </button>

          <div className="flex items-center gap-2">
            {onRefreshDashboard && (
              <button
                type="button"
                onClick={() => {
                  onRefreshDashboard();
                  onClose();
                }}
                className="px-3.5 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-50 rounded-xl transition-colors shadow-2xs"
              >
                Reload Dashboard
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
export default SystemDiagnosticsModal;
