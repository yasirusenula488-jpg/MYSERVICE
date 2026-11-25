import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { CategoryIcon } from '../components/CategoryIcon';
import { usePageMeta } from '../components/PageMeta';
import { useLanguage } from '../context/LanguageContext';
import { DEFAULT_CATEGORIES, getCategoryDescription, getCategoryName } from '../data/categories';
import { fetchActiveCategories } from '../lib/marketplaceService';
import { ServiceCategory } from '../types/marketplace';

export const CategoriesPage: React.FC = () => {
  const { lang, t } = useLanguage();
  usePageMeta('Service Categories', 'Browse all 15 service categories and specialties across Sri Lanka.');

  const [categories, setCategories] = useState<ServiceCategory[]>(DEFAULT_CATEGORIES);

  useEffect(() => {
    fetchActiveCategories().then(setCategories);
  }, []);

  return (
    <div className="bg-[#F5F8FD] min-h-screen py-8 pb-24 md:pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#142B4A] tracking-tight">
              {t('navCategories')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1.5">
              All {categories.length} main service categories and subcategories available across Sri Lanka.
            </p>
          </div>
          <Link
            to="/post-job"
            className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#2563EB] text-white text-sm font-semibold hover:bg-blue-700 transition-colors self-start"
          >
            {t('navPostJob')}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3.5">
                  <Link
                    to={`/categories/${cat.id}`}
                    className="w-11 h-11 rounded-xl bg-[#EAF2FF] text-[#2563EB] flex items-center justify-center shrink-0 hover:bg-[#2563EB] hover:text-white transition-colors"
                  >
                    <CategoryIcon name={cat.iconName} className="w-5 h-5" />
                  </Link>
                  {cat.requiresSpecialistVerification && (
                    <span className="text-xs font-medium text-emerald-700 inline-flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Specialist Verification
                    </span>
                  )}
                </div>

                <Link to={`/categories/${cat.id}`} className="group block">
                  <h2 className="text-base sm:text-lg font-bold text-[#142B4A] group-hover:text-[#2563EB] transition-colors mb-1.5">
                    {getCategoryName(cat, lang)}
                  </h2>
                </Link>
                <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                  {getCategoryDescription(cat, lang)}
                </p>

                <div className="flex flex-wrap gap-1.5 text-xs text-slate-700">
                  {cat.subcategories.map((sub) => (
                    <Link
                      key={sub}
                      to={`/categories/${cat.id}?sub=${encodeURIComponent(sub)}`}
                      className="min-h-[34px] inline-flex items-center px-2.5 py-1 rounded-lg bg-[#F5F8FD] hover:bg-[#EAF2FF] hover:text-[#2563EB] transition-colors"
                    >
                      {sub}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <Link
                  to={`/categories/${cat.id}`}
                  className="min-h-[40px] text-xs font-semibold text-[#2563EB] hover:underline inline-flex items-center gap-1"
                >
                  Open {getCategoryName(cat, lang)}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  to={`/post-job?category=${cat.id}`}
                  className="min-h-[40px] inline-flex items-center text-xs font-medium text-slate-500 hover:text-[#142B4A]"
                >
                  Post Job
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
