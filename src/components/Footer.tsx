import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { BrandMark } from './BrandMark';

export const Footer: React.FC = () => {
  const { t } = useLanguage();
  const { firebaseUser } = useAuth();

  return (
    <footer className={`bg-[#142B4A] text-slate-300 border-t border-slate-800 ${firebaseUser ? 'pb-24 md:pb-0' : ''}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2.5 bg-white px-3 py-1.5 rounded-xl">
              <BrandMark />
            </div>
            <p className="text-sm text-slate-300 leading-relaxed max-w-xs">
              {t('tagline')} {t('secondaryTagline')}
            </p>
            <p className="text-xs text-slate-400">
              {t('westernLaunchNote')}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Marketplace</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/services" className="hover:text-white transition-colors">
                  {t('navFindServices')}
                </Link>
              </li>
              <li>
                <Link to="/categories" className="hover:text-white transition-colors">
                  {t('navCategories')}
                </Link>
              </li>
              <li>
                <Link to="/professionals" className="hover:text-white transition-colors">
                  {t('navProfessionals')}
                </Link>
              </li>
              <li>
                <Link to="/post-job" className="hover:text-white transition-colors">
                  {t('navPostJob')}
                </Link>
              </li>
              <li>
                <Link to="/become-provider" className="hover:text-white transition-colors">
                  {t('navBecomeProvider')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Company & Support</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/how-it-works" className="hover:text-white transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-white transition-colors">
                  About MYSERVICE
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-white transition-colors">
                  Help Center & FAQ
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-white transition-colors">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Trust & Policies</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/terms" className="hover:text-white transition-colors">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/guidelines/provider" className="hover:text-white transition-colors">
                  Provider Guidelines
                </Link>
              </li>
              <li>
                <Link to="/guidelines/customer" className="hover:text-white transition-colors">
                  Customer Guidelines
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} MYSERVICE Sri Lanka. All rights reserved.</p>
          <p>English · සිංහල · தமிழ் · All 9 Provinces & 25 Districts</p>
        </div>
      </div>
    </footer>
  );
};
