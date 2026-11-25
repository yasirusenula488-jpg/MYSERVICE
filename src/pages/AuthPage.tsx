import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { BrandMark } from '../components/BrandMark';
import { usePageMeta } from '../components/PageMeta';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export const AuthPage: React.FC<{ mode?: 'login' | 'register' | 'forgot' }> = ({ mode = 'login' }) => {
  const { firebaseUser, signInWithGoogle, authError } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  usePageMeta(
    mode === 'register' ? 'Register on MYSERVICE' : mode === 'forgot' ? 'Account Recovery' : 'Sign In',
    'Sign in to MYSERVICE with Google to access Customer Mode and Provider Mode on one account.'
  );

  useEffect(() => {
    if (firebaseUser) {
      navigate('/dashboard');
    }
  }, [firebaseUser, navigate]);

  return (
    <div className="min-h-[80vh] bg-[#F5F8FD] flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
        <div className="mb-6">
          <BrandMark />
        </div>

        {mode === 'forgot' ? (
          <div className="space-y-4">
            <h1 className="font-display text-2xl font-bold text-[#142B4A]">
              Google Account Recovery
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              MYSERVICE uses verified Google Sign-In so you never need a separate marketplace password. If you cannot access your Google account, use Google’s official account recovery page.
            </p>
            <a
              href="https://accounts.google.com/signin/recovery"
              target="_blank"
              rel="noreferrer"
              className="block w-full text-center py-3 rounded-xl bg-[#2563EB] text-white text-sm font-semibold hover:bg-blue-700"
            >
              Open Google Account Recovery
            </a>
            <Link
              to="/login"
              className="block text-center text-sm font-medium text-[#2563EB] hover:underline"
            >
              Back to Sign In
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <h1 className="font-display text-2xl font-bold text-[#142B4A]">
                {mode === 'register' ? 'Create Your MYSERVICE Account' : t('signInTitle')}
              </h1>
              <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                {t('signInSubtitle')}
              </p>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                {authError}
              </div>
            )}

            <button
              type="button"
              onClick={signInWithGoogle}
              className="w-full py-3 px-4 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-3 shadow-xs"
            >
              <svg className="w-5 h-5 bg-white rounded-full p-0.5" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                />
              </svg>
              {t('continueWithGoogle')}
            </button>

            <div className="pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>One account includes both Customer Mode and Provider Mode</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Verified Google email keeps your account and bookings secure</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
              <Link to="/forgot-password" className="hover:text-[#2563EB]">
                Need account help?
              </Link>
              <Link to="/terms" className="hover:text-[#2563EB]">
                Terms & Privacy
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
