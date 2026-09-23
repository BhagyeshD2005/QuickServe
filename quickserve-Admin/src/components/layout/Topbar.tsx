import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Menu,
  Search,
  Bell,
  ChevronDown,
  UserCircle,
  LogOut,
  ExternalLink,
  ClipboardList,
  User,
  Wrench,
  CheckCircle2,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../ui/Avatar';
import { PulseBeacon } from '../ui/AnimatedSvg';
import { ApiHealthStatus } from '../../api/health';
import { ServiceRequest, User as UserType, Service } from '../../types';

interface TopbarProps {
  onMenuToggle: () => void;
  apiHealth: ApiHealthStatus;
  searchData?: {
    requests: ServiceRequest[];
    users: UserType[];
    services: Service[];
  };
}

export const Topbar: React.FC<TopbarProps> = ({
  onMenuToggle,
  apiHealth,
  searchData,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Dropdown states
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute page title based on path
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 'Dashboard Overview';
    if (path.startsWith('/requests/')) return 'Request Details';
    if (path === '/requests') return 'Service Requests';
    if (path.startsWith('/customers/')) return 'Customer Profile';
    if (path === '/customers') return 'Customer Management';
    if (path.startsWith('/agents/')) return 'Agent Profile';
    if (path === '/agents') return 'Service Agents';
    if (path === '/services') return 'Service Catalog';
    if (path === '/audit-logs') return 'System Audit Logs';
    if (path === '/profile') return 'Admin Profile';
    return 'QuickServe Administration';
  };

  // Perform search filtering
  const query = searchQuery.trim().toLowerCase();
  const filteredRequests = query
    ? (searchData?.requests || []).filter(
        (r) =>
          r.request_number?.toLowerCase().includes(query) ||
          r.customer_name?.toLowerCase().includes(query) ||
          r.service_name?.toLowerCase().includes(query) ||
          r.status?.toLowerCase().includes(query)
      ).slice(0, 4)
    : [];

  const filteredUsers = query
    ? (searchData?.users || []).filter(
        (u) =>
          u.full_name?.toLowerCase().includes(query) ||
          u.email?.toLowerCase().includes(query)
      ).slice(0, 4)
    : [];

  const filteredServices = query
    ? (searchData?.services || []).filter(
        (s) =>
          s.name?.toLowerCase().includes(query) ||
          s.description?.toLowerCase().includes(query)
      ).slice(0, 3)
    : [];

  const totalResults =
    filteredRequests.length + filteredUsers.length + filteredServices.length;

  return (
    <header
      id="admin-topbar"
      className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-xs border-b border-neutral-200/80 px-4 sm:px-6 flex items-center justify-between gap-4"
    >
      {/* Left: Mobile hamburger & Page Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onMenuToggle}
          className="lg:hidden p-2 -ml-1 text-neutral-500 hover:text-neutral-800 rounded-lg hover:bg-neutral-100 transition-colors"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <h1 className="text-base sm:text-lg font-semibold text-neutral-900 tracking-tight truncate">
          {getPageTitle()}
        </h1>
      </div>

      {/* Middle: Global Search */}
      <div ref={searchRef} className="relative hidden md:block max-w-md w-full">
        <div className="relative">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            id="global-search-input"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => setIsSearchOpen(true)}
            placeholder="Search request #, customer, agent, service..."
            className="w-full pl-9 pr-8 py-1.5 text-xs bg-neutral-50 hover:bg-neutral-100/70 focus:bg-white border border-neutral-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-neutral-800 placeholder:text-neutral-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setIsSearchOpen(false);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Global Search Dropdown */}
        {isSearchOpen && searchQuery.trim().length > 0 && (
          <div className="absolute left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-neutral-200 p-2 max-h-96 overflow-y-auto z-50">
            {totalResults === 0 ? (
              <div className="p-4 text-center text-xs text-neutral-500">
                No matching results found for "{searchQuery}"
              </div>
            ) : (
              <div className="space-y-3">
                {/* Requests */}
                {filteredRequests.length > 0 && (
                  <div>
                    <div className="text-[10px] font-semibold text-neutral-400 uppercase px-2 mb-1">
                      Requests ({filteredRequests.length})
                    </div>
                    {filteredRequests.map((req) => (
                      <button
                        key={req.id}
                        type="button"
                        onClick={() => {
                          navigate(`/requests/${req.id}`);
                          setIsSearchOpen(false);
                          setSearchQuery('');
                        }}
                        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-neutral-50 text-left transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <ClipboardList className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <div>
                            <span className="text-xs font-semibold text-neutral-900">
                              {req.request_number}
                            </span>
                            <span className="text-xs text-neutral-500 ml-2">
                              {req.customer_name || 'Customer'} • {req.service_name}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
                          {req.status}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Users / Customers / Agents */}
                {filteredUsers.length > 0 && (
                  <div>
                    <div className="text-[10px] font-semibold text-neutral-400 uppercase px-2 mb-1">
                      Users ({filteredUsers.length})
                    </div>
                    {filteredUsers.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          if (u.role === 'AGENT') {
                            navigate(`/agents/${u.id}`);
                          } else {
                            navigate(`/customers/${u.id}`);
                          }
                          setIsSearchOpen(false);
                          setSearchQuery('');
                        }}
                        className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-neutral-50 text-left transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                          <div>
                            <span className="text-xs font-semibold text-neutral-900">
                              {u.full_name}
                            </span>
                            <span className="text-xs text-neutral-500 ml-2">{u.email}</span>
                          </div>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 font-medium">
                          {u.role}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Services */}
                {filteredServices.length > 0 && (
                  <div>
                    <div className="text-[10px] font-semibold text-neutral-400 uppercase px-2 mb-1">
                      Services
                    </div>
                    {filteredServices.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          navigate('/services');
                          setIsSearchOpen(false);
                          setSearchQuery('');
                        }}
                        className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-neutral-50 text-left transition-colors"
                      >
                        <Wrench className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="text-xs font-semibold text-neutral-900">{s.name}</span>
                        <span className="text-xs text-neutral-500 truncate">{s.description}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: API Health, Notifications, Profile */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        {/* API Health Pill */}
        <div
          id="api-health-indicator"
          title={`API Base: ${apiHealth.name || 'QuickServe API'}${
            apiHealth.latencyMs ? ` (${apiHealth.latencyMs}ms)` : ''
          }`}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border select-none transition-colors ${
            apiHealth.online
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}
        >
          <PulseBeacon color={apiHealth.online ? 'emerald' : 'rose'} size="sm" />
          <span className="hidden sm:inline">{apiHealth.statusText || 'API Status'}</span>
        </div>

        {/* Notifications Dropdown */}
        <div ref={notificationsRef} className="relative">
          <button
            type="button"
            id="notifications-button"
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="p-2 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded-xl transition-colors relative"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-600 ring-2 ring-white" />
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-neutral-200 p-4 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100 mb-3">
                <span className="text-xs font-semibold text-neutral-900">Notifications</span>
                <span className="text-[10px] text-neutral-400">Live API updates</span>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-start gap-2.5 text-xs text-neutral-600 p-2 rounded-lg bg-indigo-50/50 border border-indigo-100">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-neutral-900 block">Cloudflare API Connected</span>
                    <span className="text-neutral-500 text-[11px]">Real-time worker endpoints active.</span>
                  </div>
                </div>
                <div className="text-[11px] text-neutral-400 text-center py-2">
                  No unread alerts
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Admin Profile Dropdown */}
        <div ref={profileRef} className="relative">
          <button
            type="button"
            id="user-profile-button"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 p-1.5 hover:bg-neutral-100 rounded-xl transition-colors"
          >
            <Avatar name={user?.full_name || 'Admin'} email={user?.email} size="sm" />
            <div className="hidden sm:block text-left">
              <div className="text-xs font-semibold text-neutral-900 leading-tight">
                {user?.full_name?.split(' ')[0] || 'Bhagyesh'}
              </div>
              <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200/60">
                {user?.role || 'ADMIN'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-neutral-200 py-1.5 z-50">
              <div className="px-4 py-2.5 border-b border-neutral-100">
                <div className="text-xs font-semibold text-neutral-900 truncate">
                  {user?.full_name || 'Administrator'}
                </div>
                <div className="text-[11px] text-neutral-500 truncate">{user?.email}</div>
              </div>

              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileOpen(false);
                    navigate('/profile');
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-neutral-700 hover:bg-neutral-50 text-left transition-colors"
                >
                  <UserCircle className="w-4 h-4 text-neutral-400" />
                  <span>Admin Profile</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsProfileOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 text-left transition-colors"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
