import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, MessageSquare, PlusCircle, Search, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export const MobileBottomNav: React.FC = () => {
  const { firebaseUser, workspaceMode } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  if (!firebaseUser) return null;

  const dashboardPath = workspaceMode === 'provider' ? '/provider-dashboard' : '/dashboard';
  const params = new URLSearchParams(location.search);
  const currentTab = params.get('tab') || '';
  const onDashboard =
    location.pathname === '/dashboard' || location.pathname === '/provider-dashboard';

  const items = [
    {
      key: 'home',
      to: '/',
      label: t('navHome'),
      icon: Home,
      isActive: location.pathname === '/',
    },
    {
      key: 'services',
      to: '/services',
      label: t('navFindServices'),
      icon: Search,
      isActive:
        location.pathname === '/services' ||
        location.pathname === '/categories' ||
        location.pathname.startsWith('/categories/'),
    },
    {
      key: 'post-job',
      to: '/post-job',
      label: t('navPostJob'),
      icon: PlusCircle,
      isActive: location.pathname === '/post-job',
    },
    {
      key: 'messages',
      to: `${dashboardPath}?tab=messages`,
      label: t('navMessages'),
      icon: MessageSquare,
      isActive: onDashboard && currentTab === 'messages',
    },
    {
      key: 'profile',
      to: dashboardPath,
      label: t('navProfile'),
      icon: User,
      isActive: onDashboard && currentTab !== 'messages',
    },
  ];

  return (
    <nav
      aria-label="Mobile Workspace Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 pb-safe shadow-[0_-4px_16px_rgba(20,43,74,0.06)]"
    >
      <div className="grid grid-cols-5 h-14 items-center">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              to={item.to}
              className={`min-h-[44px] flex flex-col items-center justify-center px-1 transition-colors ${
                item.isActive ? 'text-[#2563EB] font-semibold' : 'text-slate-500 hover:text-[#142B4A]'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="text-[10px] mt-0.5 truncate max-w-full leading-tight">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
