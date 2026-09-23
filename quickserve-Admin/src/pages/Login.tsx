import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Zap,
  Lock,
  Mail,
  KeyRound,
  ShieldCheck,
  Loader2,
  ChevronDown,
  ChevronUp,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { DispatchRadar, PulseBeacon } from '../components/ui/AnimatedSvg';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, loginWithToken, error: authError } = useAuth();
  const { success, error: toastError } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Direct JWT token auth configuration area
  const [showTokenConfig, setShowTokenConfig] = useState(false);
  const [directToken, setDirectToken] = useState('');
  const [tokenSubmitting, setTokenSubmitting] = useState(false);

  // Forgot password modal
  const [showForgotModal, setShowForgotModal] = useState(false);

  const sessionExpired = searchParams.get('session_expired') === 'true';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toastError('Please enter both email and password.');
      return;
    }

    setSubmitting(true);
    try {
      const user = await login({ email: email.trim(), password });
      success(`Welcome back, ${user.full_name || 'Admin'}!`, 'Authentication Successful');
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid credentials or non-admin account';
      toastError(msg, 'Sign In Failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDirectTokenLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directToken.trim()) {
      toastError('Please paste a valid JWT Bearer token.');
      return;
    }

    setTokenSubmitting(true);
    try {
      const user = await loginWithToken(directToken.trim());
      success(`Authenticated as ${user.full_name} (${user.role})`, 'Token Session Verified');
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid or non-admin token';
      toastError(msg, 'Token Authentication Failed');
    } finally {
      setTokenSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col justify-center lg:flex-row">
      {/* Left side: Branding & Hero */}
      <div className="lg:w-1/2 p-8 sm:p-12 lg:p-16 flex flex-col justify-between bg-neutral-950 text-white border-b lg:border-b-0 lg:border-r border-neutral-800">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
              <Zap className="w-5 h-5 fill-white" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight">QuickServe</span>
              <p className="text-xs text-indigo-400 font-medium">Service Request Management</p>
            </div>
          </div>
        </div>

        <div className="my-8 lg:my-0 max-w-md">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-800/60 text-indigo-300 text-xs font-semibold mb-5">
            <PulseBeacon color="indigo" size="sm" />
            <span>Enterprise Operations Console</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight mb-3">
            Manage service operations from one centralized workspace.
          </h2>
          <p className="text-sm text-neutral-400 leading-relaxed mb-6">
            Manage customers, service agents, assignments, lifecycle status, and system audit logs in real time.
          </p>

          {/* Aesthetic Animated SVG Dispatch Radar */}
          <div className="my-6 p-4 rounded-2xl bg-neutral-900/70 border border-neutral-800/80 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-radial from-indigo-500/10 to-transparent pointer-events-none" />
            <DispatchRadar theme="dark" size={240} />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-neutral-800">
            <div>
              <div className="text-base font-bold text-white flex items-center gap-1.5">
                <PulseBeacon color="emerald" size="sm" />
                Live API
              </div>
              <div className="text-xs text-neutral-400">Cloudflare Workers</div>
            </div>
            <div>
              <div className="text-base font-bold text-white">ADMIN & AGENT</div>
              <div className="text-xs text-neutral-400">Role-Based Access Control</div>
            </div>
          </div>
        </div>

        <div className="text-xs text-neutral-500">
          QuickServe Operations Console &bull; Connected to Cloudflare API
        </div>
      </div>

      {/* Right side: Login Card */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-neutral-50">
        <div className="w-full max-w-md bg-white rounded-2xl border border-neutral-200/90 p-8 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-neutral-900 tracking-tight">Welcome back</h2>
            <p className="text-xs text-neutral-500 mt-1">
              Sign in with your QuickServe administrator or service agent account.
            </p>
          </div>

          {sessionExpired && (
            <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0 text-amber-600" />
              <span>Your session has expired. Please sign in again.</span>
            </div>
          )}

          {authError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{authError}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="admin-email"
                className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5"
              >
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  id="admin-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-white border border-neutral-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="admin-password"
                  className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="password"
                  id="admin-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-white border border-neutral-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              id="admin-login-submit"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-xs disabled:opacity-50 mt-2"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
              <span>Sign In</span>
            </button>
          </form>

          {/* Collapsible Direct Token Authentication / Admin Credentials Guide */}
          <div className="mt-6 pt-5 border-t border-neutral-100">
            <button
              type="button"
              onClick={() => setShowTokenConfig(!showTokenConfig)}
              className="w-full flex items-center justify-between text-xs text-neutral-600 hover:text-neutral-900 py-1 font-medium transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                <span>Admin Token / Account Configuration</span>
              </span>
              {showTokenConfig ? (
                <ChevronUp className="w-4 h-4 text-neutral-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-neutral-400" />
              )}
            </button>

            {showTokenConfig && (
              <div className="mt-3 p-4 rounded-xl bg-neutral-50 border border-neutral-200/80 text-xs space-y-3">
                <p className="text-neutral-600 leading-relaxed">
                  Accounts with <strong className="text-neutral-900">role: ADMIN</strong> or <strong className="text-neutral-900">role: AGENT</strong> can access this dashboard.
                  Customers promoted to <span className="font-semibold text-indigo-700">AGENT</span> by an admin can sign in using their credentials or token with full technician access.
                </p>

                <form onSubmit={handleDirectTokenLogin} className="space-y-2">
                  <textarea
                    rows={2}
                    value={directToken}
                    onChange={(e) => setDirectToken(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full p-2 text-[11px] font-mono bg-white border border-neutral-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={tokenSubmitting || !directToken.trim()}
                    className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold text-white bg-neutral-800 hover:bg-neutral-900 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {tokenSubmitting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    <span>Authenticate with Token</span>
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-neutral-200 text-center">
            <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <KeyRound className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-neutral-900 mb-1">Administrator Reset</h3>
            <p className="text-xs text-neutral-600 mb-4 leading-relaxed">
              Password changes for administrative accounts are managed through the QuickServe database or via the Profile settings once logged in.
            </p>
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="w-full py-2 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
