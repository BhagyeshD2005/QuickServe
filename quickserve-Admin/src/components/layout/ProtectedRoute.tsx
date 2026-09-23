import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, LogOut, Loader2 } from 'lucide-react';

export const ProtectedRoute: React.FC = () => {
  const { user, loading, isAuthenticated, isAdmin, isAgent, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 rounded-xl bg-indigo-600/10 flex items-center justify-center text-indigo-600 mb-4 animate-pulse">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
        <p className="text-sm font-medium text-neutral-700">Verifying session credentials...</p>
        <p className="text-xs text-neutral-400 mt-1">Connecting to QuickServe backend</p>
      </div>
    );
  }

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin() && !isAgent()) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-neutral-200 p-8 shadow-sm text-center">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-neutral-900 mb-2">Access Denied</h2>
          <p className="text-sm text-neutral-600 mb-6 leading-relaxed">
            Administrator or Service Agent privileges required. You are currently logged in as{' '}
            <span className="font-semibold text-neutral-900">{user?.email}</span> with role{' '}
            <span className="font-semibold text-rose-600">[{user?.role}]</span>.
          </p>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-xs"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign In with Admin or Agent Account</span>
          </button>
        </div>
      </div>
    );
  }

  return <Outlet />;
};

export default ProtectedRoute;
