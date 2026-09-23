import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import AdminLayout from './components/layout/AdminLayout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import RequestsList from './pages/RequestsList';
import RequestDetails from './pages/RequestDetails';
import CustomersList from './pages/CustomersList';
import CustomerDetails from './pages/CustomerDetails';
import AgentsList from './pages/AgentsList';
import AgentDetails from './pages/AgentDetails';
import ServicesList from './pages/ServicesList';
import UsersList from './pages/UsersList';
import UserDetails from './pages/UserDetails';
import AuditLogs from './pages/AuditLogs';
import AdminProfile from './pages/AdminProfile';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            {/* Public Auth Route */}
            <Route path="/login" element={<Login />} />

            {/* Protected Admin Routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AdminLayout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/requests" element={<RequestsList />} />
                <Route path="/requests/:id" element={<RequestDetails />} />
                <Route path="/users" element={<UsersList />} />
                <Route path="/users/:id" element={<UserDetails />} />
                <Route path="/customers" element={<CustomersList />} />
                <Route path="/customers/:id" element={<CustomerDetails />} />
                <Route path="/agents" element={<AgentsList />} />
                <Route path="/agents/:id" element={<AgentDetails />} />
                <Route path="/services" element={<ServicesList />} />
                <Route path="/audit-logs" element={<AuditLogs />} />
                <Route path="/profile" element={<AdminProfile />} />
              </Route>
            </Route>

            {/* Catch-all 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
