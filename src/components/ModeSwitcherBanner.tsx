import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftRight, Briefcase, Shield, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export const ModeSwitcherBanner: React.FC = () => {
  const { workspaceMode, setWorkspaceMode, providerProfile, isAdmin } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleSwitch = (mode: 'customer' | 'provider') => {
    if (mode === 'provider' && !providerProfile) {
      navigate('/become-provider');
      return;
    }
    setWorkspaceMode(mode);
    navigate(mode === 'provider' ? '/provider-dashboard' : '/dashboard');
  };

  return (
    <div className="bg-[#F5F8FD] border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
        <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
          <div className="flex items-center gap-2 min-w-0">
            <ArrowLeftRight className="w-4 h-4 text-[#2563EB] shrink-0" />
            <span className="font-semibold text-[#142B4A] truncate">{t('switchModeLabel')}</span>
            <span className="text-slate-500 hidden md:inline">
              · One MYSERVICE account · Switch seamlessly without logging out
            </span>
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="sm:hidden min-h-[36px] inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-blue-200 bg-[#EAF2FF] text-[#2563EB] text-xs font-semibold shrink-0"
            >
              <Shield className="w-3.5 h-3.5" />
              Admin
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="grid grid-cols-2 sm:inline-flex flex-1 sm:flex-initial items-center bg-white border border-slate-200 rounded-xl p-1 gap-1">
            <button
              type="button"
              onClick={() => handleSwitch('customer')}
              className={`min-h-[40px] sm:min-h-[36px] inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                workspaceMode === 'customer'
                  ? 'bg-[#2563EB] text-white'
                  : 'text-slate-600 hover:text-[#142B4A]'
              }`}
            >
              <User className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{t('customerMode')}</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitch('provider')}
              className={`min-h-[40px] sm:min-h-[36px] inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                workspaceMode === 'provider'
                  ? 'bg-[#142B4A] text-white'
                  : 'text-slate-600 hover:text-[#142B4A]'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                {providerProfile ? t('providerMode') : `Activate ${t('providerMode')}`}
              </span>
            </button>
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="hidden sm:inline-flex min-h-[40px] items-center gap-1.5 px-3.5 py-2 rounded-xl border border-blue-200 bg-[#EAF2FF] text-[#2563EB] text-xs font-semibold hover:bg-blue-100 transition-colors whitespace-nowrap shrink-0"
            >
              <Shield className="w-3.5 h-3.5" />
              {t('navAdmin')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
