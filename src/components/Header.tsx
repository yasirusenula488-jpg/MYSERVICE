import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronDown,
  Globe,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Shield,
  UserCheck,
  X,
} from 'lucide-react';
import { collection, limit, onSnapshot, query, where } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { db } from '../lib/firebase';
import { LanguageCode } from '../types/marketplace';
import { BrandMark } from './BrandMark';

const LANGUAGES: { code: LanguageCode; short: string; label: string }[] = [
  { code: 'en', short: 'EN', label: 'English' },
  { code: 'si', short: 'සිං', label: 'සිංහල' },
  { code: 'ta', short: 'தமி', label: 'தமிழ்' },
];

export const Header: React.FC = () => {
  const { lang, setLang, t } = useLanguage();
  const { firebaseUser, userProfile, providerProfile, isAdmin, workspaceMode, setWorkspaceMode, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const dashboardPath = workspaceMode === 'provider' ? '/provider-dashboard' : '/dashboard';

  useEffect(() => {
    if (!firebaseUser) {
      setUnreadNotifications(0);
      return;
    }

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', firebaseUser.uid),
      limit(30)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const count = snap.docs.filter((d) => d.data()?.isRead === false).length;
        setUnreadNotifications(count);
      },
      () => {
        setUnreadNotifications(0);
      }
    );

    return unsub;
  }, [firebaseUser]);

  const navLinks = [
    { to: '/services', label: t('navFindServices') },
    { to: '/categories', label: t('navCategories') },
    { to: '/professionals', label: t('navProfessionals') },
    { to: '/post-job', label: t('navPostJob') },
    { to: '/become-provider', label: t('navBecomeProvider') },
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleOpenDashboard = (targetMode: 'customer' | 'provider') => {
    setWorkspaceMode(targetMode);
    setAccountMenuOpen(false);
    setMobileOpen(false);
    navigate(targetMode === 'provider' ? '/provider-dashboard' : '/dashboard');
  };

  const userInitial = (userProfile?.displayName || firebaseUser?.displayName || 'U')
    .slice(0, 1)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 md:h-16 flex items-center justify-between gap-2 lg:gap-6">
        {/* Zone 1: Brand Mark */}
        <Link
          to="/"
          aria-label="MYSERVICE Home"
          className="shrink-0 min-h-[44px] inline-flex items-center focus-visible:outline-2 focus-visible:outline-[#2563EB] rounded-lg"
        >
          <BrandMark />
        </Link>

        {/* Zone 2: Primary Nav Links (Desktop) */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600" aria-label="Primary Navigation">
          {navLinks.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`whitespace-nowrap shrink-0 py-1 transition-colors hover:text-[#2563EB] ${
                isActive(item.to)
                  ? 'text-[#2563EB] font-semibold underline underline-offset-8 decoration-2'
                  : ''
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Zone 3: Language Switcher + Notification Bell + Profile/Login + Mobile Drawer */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Compact Trilingual Selector (Visible on Mobile & Desktop) */}
          <div
            className="flex items-center bg-[#F5F8FD] border border-slate-200 rounded-lg p-0.5"
            role="group"
            aria-label="Language switcher"
          >
            {LANGUAGES.map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => setLang(item.code)}
                title={item.label}
                className={`min-h-[34px] px-1.5 sm:px-2 py-1 text-[11px] sm:text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  lang === item.code
                    ? 'bg-white text-[#2563EB] shadow-xs'
                    : 'text-slate-600 hover:text-[#142B4A]'
                }`}
              >
                {item.short}
              </button>
            ))}
          </div>

          {/* Notification Bell Icon */}
          <Link
            to={firebaseUser ? `${dashboardPath}?tab=notifications` : '/login'}
            aria-label={t('navNotifications')}
            title={t('navNotifications')}
            className="relative min-h-[44px] min-w-[40px] sm:min-w-[44px] flex items-center justify-center rounded-xl text-[#142B4A] hover:bg-[#F5F8FD] transition-colors shrink-0"
          >
            <Bell className="w-[18px] h-[18px] sm:w-5 sm:h-5" />
            {unreadNotifications > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-[#2563EB] text-white text-[10px] font-bold leading-4 text-center tabular-nums">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </Link>

          {/* Profile / Login Button */}
          {!firebaseUser ? (
            <Link
              to="/login"
              aria-label={t('navSignIn')}
              className="min-h-[40px] sm:min-h-[44px] px-2.5 sm:px-4 rounded-xl bg-[#2563EB] text-white text-xs sm:text-sm font-semibold hover:bg-blue-700 transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <LogIn className="w-4 h-4 sm:hidden shrink-0" />
              <span className="hidden xs:inline sm:inline">{t('navSignIn')}</span>
            </Link>
          ) : (
            <div className="relative">
              {/* Mobile Profile Shortcut: Opens active dashboard directly */}
              <Link
                to={dashboardPath}
                aria-label={t('navProfile')}
                className="sm:hidden min-h-[44px] min-w-[40px] flex items-center justify-center rounded-xl hover:bg-[#F5F8FD] shrink-0"
              >
                <span className="w-8 h-8 rounded-full bg-[#EAF2FF] border border-blue-200 text-[#2563EB] flex items-center justify-center text-xs font-bold">
                  {userInitial}
                </span>
              </Link>

              {/* Desktop / Tablet Account Dropdown */}
              <button
                type="button"
                onClick={() => setAccountMenuOpen((prev) => !prev)}
                className="hidden sm:inline-flex min-h-[44px] items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-[#F5F8FD] text-sm font-medium text-[#142B4A] transition-colors whitespace-nowrap shrink-0"
              >
                <span className="w-6 h-6 rounded-full bg-[#EAF2FF] text-[#2563EB] flex items-center justify-center text-xs font-bold shrink-0">
                  {userInitial}
                </span>
                <span className="max-w-[110px] truncate">
                  {userProfile?.displayName || firebaseUser.displayName || t('navDashboard')}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {accountMenuOpen && (
                <div
                  className="hidden sm:block absolute right-0 mt-2 w-60 bg-white border border-slate-200 rounded-2xl shadow-lg py-2 z-50"
                  onMouseLeave={() => setAccountMenuOpen(false)}
                >
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs font-semibold text-[#142B4A] truncate">
                      {userProfile?.displayName || firebaseUser.displayName}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">{firebaseUser.email}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenDashboard('customer')}
                    className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:bg-[#F5F8FD] ${
                      workspaceMode === 'customer' ? 'text-[#2563EB] font-semibold' : 'text-slate-700'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <LayoutDashboard className="w-4 h-4" />
                      {t('customerMode')}
                    </span>
                  </button>

                  {providerProfile ? (
                    <button
                      type="button"
                      onClick={() => handleOpenDashboard('provider')}
                      className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:bg-[#F5F8FD] ${
                        workspaceMode === 'provider' ? 'text-[#2563EB] font-semibold' : 'text-slate-700'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4" />
                        {t('providerMode')}
                      </span>
                    </button>
                  ) : (
                    <Link
                      to="/become-provider"
                      onClick={() => setAccountMenuOpen(false)}
                      className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 text-slate-700 hover:bg-[#F5F8FD]"
                    >
                      <UserCheck className="w-4 h-4" />
                      {t('navBecomeProvider')}
                    </Link>
                  )}

                  {isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setAccountMenuOpen(false)}
                      className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 text-[#142B4A] font-medium hover:bg-[#F5F8FD]"
                    >
                      <Shield className="w-4 h-4 text-[#2563EB]" />
                      {t('navAdmin')}
                    </Link>
                  )}

                  <div className="mt-1 pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={async () => {
                        setAccountMenuOpen(false);
                        await signOut();
                        navigate('/');
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      {t('navSignOut')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mobile Menu Button (>= 44px touch target) */}
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="lg:hidden min-h-[44px] min-w-[40px] sm:min-w-[44px] flex items-center justify-center rounded-xl text-[#142B4A] hover:bg-[#F5F8FD]"
            aria-label="Toggle Menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-3 shadow-lg max-h-[calc(100vh-56px)] overflow-y-auto">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <Globe className="w-3.5 h-3.5" /> Language
            </span>
            <div className="flex items-center gap-1 bg-[#F5F8FD] p-1 rounded-lg border border-slate-200">
              {LANGUAGES.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => setLang(item.code)}
                  className={`min-h-[36px] px-2.5 py-1 text-xs font-semibold rounded-md ${
                    lang === item.code ? 'bg-white text-[#2563EB] shadow-xs' : 'text-slate-600'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <nav className="flex flex-col space-y-1">
            <Link
              to="/"
              onClick={() => setMobileOpen(false)}
              className={`min-h-[44px] px-3 py-2.5 rounded-xl text-sm font-medium flex items-center ${
                isActive('/') ? 'bg-[#EAF2FF] text-[#2563EB]' : 'text-[#142B4A] hover:bg-[#F5F8FD]'
              }`}
            >
              {t('navHome')}
            </Link>
            {navLinks.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={`min-h-[44px] px-3 py-2.5 rounded-xl text-sm font-medium flex items-center ${
                  isActive(item.to)
                    ? 'bg-[#EAF2FF] text-[#2563EB]'
                    : 'text-[#142B4A] hover:bg-[#F5F8FD]'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            {!firebaseUser ? (
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="w-full min-h-[44px] flex items-center justify-center rounded-xl bg-[#2563EB] text-white text-sm font-semibold"
              >
                {t('navSignIn')}
              </Link>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleOpenDashboard('customer')}
                  className="w-full min-h-[44px] text-left px-3 py-2.5 rounded-xl bg-[#F5F8FD] text-sm font-medium text-[#142B4A]"
                >
                  {t('customerMode')} — {t('navDashboard')}
                </button>
                {providerProfile && (
                  <button
                    type="button"
                    onClick={() => handleOpenDashboard('provider')}
                    className="w-full min-h-[44px] text-left px-3 py-2.5 rounded-xl bg-[#EAF2FF] text-sm font-medium text-[#2563EB]"
                  >
                    {t('providerMode')} — {t('navDashboard')}
                  </button>
                )}
                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => setMobileOpen(false)}
                    className="w-full min-h-[44px] flex items-center px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-[#142B4A]"
                  >
                    {t('navAdmin')}
                  </Link>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    setMobileOpen(false);
                    await signOut();
                    navigate('/');
                  }}
                  className="w-full min-h-[44px] text-left px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  {t('navSignOut')}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
