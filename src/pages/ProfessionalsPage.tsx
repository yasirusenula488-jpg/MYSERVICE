import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { usePageMeta } from '../components/PageMeta';
import { ProviderCard } from '../components/ProviderCard';
import { useLanguage } from '../context/LanguageContext';
import { DEFAULT_CATEGORIES, getCategoryName } from '../data/categories';
import { SAMPLE_PROVIDERS } from '../data/sampleCatalog';
import { ALL_DISTRICTS, getDistrictLabel } from '../data/sriLankaLocations';
import { fetchActiveCategories, fetchPublicProviders } from '../lib/marketplaceService';
import { ProviderProfile, ServiceCategory } from '../types/marketplace';

export const ProfessionalsPage: React.FC = () => {
  const { lang, t } = useLanguage();
  usePageMeta('Find Professionals', 'Browse skilled service professionals across Sri Lanka’s 25 districts.');

  const [providers, setProviders] = useState<ProviderProfile[]>(SAMPLE_PROVIDERS);
  const [categories, setCategories] = useState<ServiceCategory[]>(DEFAULT_CATEGORIES);
  const [search, setSearch] = useState('');
  const [district, setDistrict] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  useEffect(() => {
    fetchActiveCategories().then(setCategories);
    fetchPublicProviders()
      .then((live) => setProviders([...live, ...SAMPLE_PROVIDERS]))
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return providers.filter((p) => {
      if (q) {
        const hay = `${p.fullName} ${p.businessName || ''} ${p.bio} ${p.city} ${p.district} ${(p.subcategories || []).join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (district && p.district !== district && !p.coverageDistricts.includes(district)) {
        return false;
      }
      if (categoryId && !p.categoryIds.includes(categoryId)) return false;
      if (verifiedOnly && p.verificationStatus !== 'verified') return false;
      return true;
    });
  }, [providers, search, district, categoryId, verifiedOnly]);

  return (
    <div className="bg-[#F5F8FD] min-h-screen py-8 pb-24 md:pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#142B4A] tracking-tight">
              {t('navProfessionals')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Connect with Sri Lankan tradespeople, consultants, and specialists across all 25 districts.
            </p>
          </div>
          <Link
            to="/become-provider"
            className="min-h-[44px] inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-[#2563EB] text-white text-sm font-semibold hover:bg-blue-700 transition-colors self-start"
          >
            {t('navBecomeProvider')}
          </Link>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, skill, or city..."
              className="w-full min-h-[44px] pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#2563EB]"
            />
          </div>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-[#2563EB]"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {getCategoryName(c, lang)}
              </option>
            ))}
          </select>
          <select
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-[#2563EB]"
          >
            <option value="">{t('searchAllDistricts')}</option>
            {ALL_DISTRICTS.map((d) => (
              <option key={d.id} value={d.id}>
                {getDistrictLabel(d.id, lang)}
              </option>
            ))}
          </select>
          <label className="min-h-[44px] flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-sm text-[#142B4A] cursor-pointer">
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-[#2563EB]"
            />
            <span>Verified Only</span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filtered.map((prov) => (
            <ProviderCard key={prov.id} provider={prov} categories={categories} />
          ))}
        </div>
      </div>
    </div>
  );
};
