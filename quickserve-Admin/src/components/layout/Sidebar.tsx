import React from 'react';
import { NavLink as RouterNavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  UserCheck,
  UserCog,
  Wrench,
  FileText,
  UserCircle,
  LogOut,
  X,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PulseBeacon } from '../ui/AnimatedSvg';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  counters?: {
    requests?: number;
    customers?: number;
    agents?: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, counters }) => {
  const { logout, user } = useAuth();
  const location = useLocation();

  const handleNavClick = () => {
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  const navItemClass = (path: string) => {
    const isActive = location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(path));
    return `group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 ${
      isActive
        ? 'bg-indigo-600 text-white shadow-xs'
        : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/80'
    }`;
  };

  const iconClass = (path: string) => {
    const isActive = location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(path));
    return `w-4 h-4 shrink-0 transition-colors ${
      isActive ? 'text-white' : 'text-neutral-400 group-hover:text-neutral-700'
    }`;
  };

  const badgeClass = (path: string) => {
    const isActive = location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(path));
    return `px-2 py-0.5 text-[10px] font-semibold rounded-full ${
      isActive ? 'bg-indigo-700 text-indigo-100' : 'bg-neutral-100 text-neutral-600'
    }`;
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-neutral-900/40 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="admin-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white border-r border-neutral-200/90 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-neutral-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Zap className="w-4 h-4 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-neutral-900">QuickServe</span>
                <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/50">
                  Admin
                </span>
              </div>
              <p className="text-[10px] text-neutral-400 font-medium">Service Request Management</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-1 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-100"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6">
          {/* Section: Overview */}
          <div>
            <div className="px-3 mb-2 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
              Overview
            </div>
            <nav className="space-y-1">
              <RouterNavLink
                to="/dashboard"
                onClick={handleNavClick}
                className={navItemClass('/dashboard')}
              >
                <div className="flex items-center gap-2.5">
                  <LayoutDashboard className={iconClass('/dashboard')} />
                  <span>Dashboard</span>
                </div>
              </RouterNavLink>
            </nav>
          </div>

          {/* Section: Operations */}
          <div>
            <div className="px-3 mb-2 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
              Operations
            </div>
            <nav className="space-y-1">
              <RouterNavLink
                to="/requests"
                onClick={handleNavClick}
                className={navItemClass('/requests')}
              >
                <div className="flex items-center gap-2.5">
                  <ClipboardList className={iconClass('/requests')} />
                  <span>Requests</span>
                </div>
                {counters?.requests !== undefined && (
                  <span className={badgeClass('/requests')}>{counters.requests}</span>
                )}
              </RouterNavLink>

              <RouterNavLink
                to="/users"
                onClick={handleNavClick}
                className={navItemClass('/users')}
              >
                <div className="flex items-center gap-2.5">
                  <UserCog className={iconClass('/users')} />
                  <span>User Management</span>
                </div>
              </RouterNavLink>

              <RouterNavLink
                to="/customers"
                onClick={handleNavClick}
                className={navItemClass('/customers')}
              >
                <div className="flex items-center gap-2.5">
                  <Users className={iconClass('/customers')} />
                  <span>Customers</span>
                </div>
                {counters?.customers !== undefined && (
                  <span className={badgeClass('/customers')}>{counters.customers}</span>
                )}
              </RouterNavLink>

              <RouterNavLink
                to="/agents"
                onClick={handleNavClick}
                className={navItemClass('/agents')}
              >
                <div className="flex items-center gap-2.5">
                  <UserCheck className={iconClass('/agents')} />
                  <span>Service Agents</span>
                </div>
                {counters?.agents !== undefined && (
                  <span className={badgeClass('/agents')}>{counters.agents}</span>
                )}
              </RouterNavLink>

              <RouterNavLink
                to="/services"
                onClick={handleNavClick}
                className={navItemClass('/services')}
              >
                <div className="flex items-center gap-2.5">
                  <Wrench className={iconClass('/services')} />
                  <span>Services</span>
                </div>
              </RouterNavLink>
            </nav>
          </div>

          {/* Section: Monitoring */}
          <div>
            <div className="px-3 mb-2 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
              Monitoring
            </div>
            <nav className="space-y-1">
              <RouterNavLink
                to="/audit-logs"
                onClick={handleNavClick}
                className={navItemClass('/audit-logs')}
              >
                <div className="flex items-center gap-2.5">
                  <FileText className={iconClass('/audit-logs')} />
                  <span>Audit Logs</span>
                </div>
              </RouterNavLink>
            </nav>
          </div>

          {/* Section: Account */}
          <div>
            <div className="px-3 mb-2 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
              Account
            </div>
            <nav className="space-y-1">
              <RouterNavLink
                to="/profile"
                onClick={handleNavClick}
                className={navItemClass('/profile')}
              >
                <div className="flex items-center gap-2.5">
                  <UserCircle className={iconClass('/profile')} />
                  <span>Profile</span>
                </div>
              </RouterNavLink>

              <button
                type="button"
                onClick={() => {
                  handleNavClick();
                  logout();
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors text-left"
              >
                <LogOut className="w-4 h-4 text-rose-500" />
                <span>Sign Out</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Current User Quick Info */}
        {user && (
          <div className="p-3.5 border-t border-neutral-100 bg-neutral-50/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold shrink-0">
                {user.full_name?.slice(0, 2).toUpperCase() || 'AD'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-neutral-800 truncate leading-snug">
                  {user.full_name || 'Administrator'}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <PulseBeacon color="emerald" size="sm" />
                  <span className="text-[10px] text-neutral-500 truncate">Online &bull; Workers API</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};

export default Sidebar;
