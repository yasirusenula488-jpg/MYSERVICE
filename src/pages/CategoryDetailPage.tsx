import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, MapPin, Search, ShieldCheck } from 'lucide-react';
import { CategoryIcon } from '../components/CategoryIcon';
import { usePageMeta } from '../components/PageMeta';
import { ProviderCard } from '../components/ProviderCard';
import { SafeImage } from '../components/SafeImage';
import { useLanguage } from '../context/LanguageContext';
import { DEFAULT_CATEGORIES, getCategoryDescription, getCategoryName } from '../data/categories';
import { SAMPLE_LISTINGS, SAMPLE_PROVIDERS } from '../data/sampleCatalog';
import { ALL_DISTRICTS, getDistrictLabel } from '../data/sriLankaLocations';
import {
  fetchActiveCategories,
  fetchActiveListings,
  fetchPublicProviders,
} from '../lib/marketplaceService';
import { ProviderProfile, ServiceCategory, ServiceListing } from '../types/marketplace';

export const CategoryDetailPage: React.FC = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { lang, t } = useLanguage();

  const [categories, setCategories] = useState<ServiceCategory[]>(DEFAULT_CATEGORIES);
  const [listings, setListings] = useState<ServiceListing[]>(SAMPLE_LISTINGS);
  const [providers, setProviders] = useState<ProviderProfile[]>(SAMPLE_PROVIDERS);
  const [loading, setLoading] = useState(true);

  const [selectedSub, setSelectedSub] = useState(searchParams.get('sub') || '');
  const [keyword, setKeyword] = useState(searchParams.get('q') || '');
  const [district, setDistrict] = useState(searchParams.get('district') || '');

  useEffect(() => {
    setSelectedSub(searchParams.get('sub') || '');
  }, [categoryId]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchActiveCategories(),
      fetchActiveListings().catch(() => [] as ServiceListing[]),
      fetchPublicProviders().catch(() => [] as ProviderProfile[]),
    ])
      .then(([cats, liveListings, liveProviders]) => {
        setCategories(cats);
        setListings([...liveListings, ...SAMPLE_LISTINGS]);
        setProviders([...liveProviders, ...SAMPLE_PROVIDERS]);
      })
      .finally(() => setLoading(false));
  }, []);

  const category = useMemo(
    () => categories.find((c) => c.id === categoryId) || categories.find((c) => c.slug === categoryId),
    [categories, categoryId]
  );

  const catName = category ? getCategoryName(category, lang) : 'Service Category';
  usePageMeta(catName, category ? getCategoryDescription(category, lang) : 'Browse Sri Lankan services by category.');

  const filteredProviders = useMemo(() => {
    if (!category) return [];
    const q = keyword.trim().toLowerCase();
    return providers.filter((p) => {
      if (!p.categoryIds?.includes(category.id)) return false;
      if (selectedSub && !(p.subcategories || []).includes(selectedSub)) return false;
      if (district && p.district !== district && !p.coverageDistricts?.includes(district)) return false;
      if (q) {
        const hay = `${p.fullName} ${p.businessName || ''} ${p.bio} ${p.city} ${p.district} ${(p.subcategories || []).join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [category, providers, selectedSub, district, keyword]);

  const filteredListings = useMemo(() => {
    if (!category) return [];
    const q = keyword.trim().toLowerCase();
    return listings.filter((item) => {
      if (item.categoryId !== category.id) return false;
      if (selectedSub && item.subcategory !== selectedSub) return false;
      if (district && item.district !== district && !item.coverageDistricts?.includes(district)) return false;
      if (q) {
        const hay = `${item.title} ${item.description} ${item.subcategory} ${item.providerName} ${item.city} ${item.district}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [category, listings, selectedSub, district, keyword]);

  const handleSelectSub = (sub: string) => {
    const next = sub === selectedSub ? '' : sub;
    setSelectedSub(next);
    const params = new URLSearchParams(searchParams);
    if (next) params.set('sub', next);
    else params.delete('sub');
    setSearchParams(params, { replace: true });
  };

  if (!category) {
    return (
      <div className="bg-[#F5F8FD] min-h-screen py-14 px-4">
        <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-2xl p-8 text-center">
          <h1 className="font-display text-2xl font-bold text-[#142B4A] mb-2">Category Not Found</h1>
          <p className="text-sm text-slate-600 mb-6">
            Explore all 15 service categories available across Sri Lanka.
          </p>
          <Link
            to="/categories"
            className="min-h-[44px] inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-[#2563EB] text-white text-sm font-semibold"
          >
            {t('navCategories')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F5F8FD] min-h-screen pb-24 md:pb-14">
      {/* Category Header */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-9">
          <Link
            to="/categories"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2563EB] hover:underline mb-4 min-h-[36px]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            All {categories.length} Categories
          </Link>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#EAF2FF] text-[#2563EB] flex items-center justify-center shrink-0">
                <CategoryIcon name={category.iconName} className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#142B4A] tracking-tight">
                    {catName}
                  </h1>
                  {category.requiresSpecialistVerification && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5" /> Specialist Verification
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
                  {getCategoryDescription(category, lang)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <Link
                to={`/post-job?category=${category.id}`}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#2563EB] text-white text-sm font-semibold hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
              >
                {t('navPostJob')}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Search & District Filter inside Category */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-6 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder={`Search within ${catName}...`}
                className="w-full min-h-[44px] pl-10 pr-4 py-2.5 rounded-xl bg-[#F5F8FD] border border-slate-200 text-sm text-[#142B4A] focus:outline-none focus:border-[#2563EB]"
              />
            </div>
            <div className="sm:col-span-4">
              <select
                aria-label={t('searchDistrict')}
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#F5F8FD] border border-slate-200 text-sm text-[#142B4A] focus:outline-none focus:border-[#2563EB]"
              >
                <option value="">{t('searchAllDistricts')}</option>
                {ALL_DISTRICTS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {getDistrictLabel(d.id, lang)}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedSub('');
                  setKeyword('');
                  setDistrict('');
                }}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-[#142B4A] hover:bg-[#F5F8FD]"
              >
                {t('clearFilters')}
              </button>
            </div>
          </div>

          {/* Subcategory Selection Buttons */}
          <div className="mt-4 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            <button
              type="button"
              onClick={() => handleSelectSub('')}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-semibold border whitespace-nowrap shrink-0 transition-colors ${
                selectedSub === ''
                  ? 'bg-[#142B4A] text-white border-[#142B4A]'
                  : 'bg-[#F5F8FD] text-[#142B4A] border-slate-200 hover:border-[#2563EB]'
              }`}
            >
              All Specialties ({category.subcategories.length})
            </button>
            {category.subcategories.map((sub) => (
              <button
                key={sub}
                type="button"
                onClick={() => handleSelectSub(sub)}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-semibold border whitespace-nowrap shrink-0 transition-colors ${
                  selectedSub === sub
                    ? 'bg-[#2563EB] text-white border-[#2563EB]'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-[#2563EB]'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 space-y-10">
        {/* Popular Service Packages in Category */}
        <section>
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="font-display text-lg sm:text-xl font-bold text-[#142B4A]">
              Service Packages ({filteredListings.length})
            </h2>
            <Link
              to={`/services?category=${category.id}`}
              className="text-xs sm:text-sm font-semibold text-[#2563EB] hover:underline whitespace-nowrap"
            >
              {t('viewAllServices')}
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-56 bg-white border border-slate-200 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center">
              <p className="text-sm text-slate-600 mb-4">
                No published packages match this filter yet. Post a job request to receive custom quotes from providers in {catName}.
              </p>
              <Link
                to={`/post-job?category=${category.id}`}
                className="min-h-[44px] inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-[#2563EB] text-white text-sm font-semibold"
              >
                {t('requestQuote')}
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {filteredListings.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    <div className="aspect-[16/10] bg-[#EAF2FF] overflow-hidden">
                      <SafeImage
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        fallbackLabel={item.subcategory}
                      />
                    </div>
                    <div className="p-4 space-y-1.5">
                      <div className="text-xs text-slate-500 flex items-center gap-1.5">
                        <span>{item.subcategory}</span>
                        {item.isSample && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-semibold text-amber-700">{t('sampleDemoLabel')}</span>
                          </>
                        )}
                      </div>
                      <h3 className="font-bold text-[#142B4A] text-base leading-snug">{item.title}</h3>
                      <p className="text-xs text-[#2563EB] font-medium">{item.providerName}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        {item.city}, {item.district}
                      </p>
                    </div>
                  </div>
                  <div className="px-4 py-3 border-t border-slate-100 bg-[#F5F8FD]/50 flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-bold text-[#142B4A] tabular-nums">
                      LKR {item.priceLkr.toLocaleString()}
                    </span>
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/providers/${item.providerId}`}
                        className="min-h-[40px] px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-[#142B4A] hover:border-[#2563EB] inline-flex items-center"
                      >
                        {t('viewProfile')}
                      </Link>
                      <Link
                        to={`/post-job?category=${category.id}&district=${encodeURIComponent(item.district)}`}
                        className="min-h-[40px] px-3 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-semibold hover:bg-blue-700 inline-flex items-center"
                      >
                        {t('requestQuote')}
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Matching Providers */}
        <section>
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="font-display text-lg sm:text-xl font-bold text-[#142B4A]">
              Matching Professionals ({filteredProviders.length})
            </h2>
          </div>

          {filteredProviders.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-sm text-slate-600">
              No professionals match your selected filters in this category. Try selecting All Districts or posting a custom job.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {filteredProviders.map((prov) => (
                <ProviderCard key={prov.id} provider={prov} categories={categories} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
