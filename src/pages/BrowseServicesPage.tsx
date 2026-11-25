import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Filter, MapPin, Search, ShieldCheck, SlidersHorizontal, X } from 'lucide-react';
import { usePageMeta } from '../components/PageMeta';
import { SafeImage } from '../components/SafeImage';
import { useLanguage } from '../context/LanguageContext';
import { DEFAULT_CATEGORIES, getCategoryName } from '../data/categories';
import { SAMPLE_LISTINGS } from '../data/sampleCatalog';
import {
  getDistrictLabel,
  getProvinceLabel,
  SRI_LANKA_PROVINCES,
} from '../data/sriLankaLocations';
import { fetchActiveCategories, fetchActiveListings } from '../lib/marketplaceService';
import { ServiceCategory, ServiceListing } from '../types/marketplace';

export const BrowseServicesPage: React.FC = () => {
  const { lang, t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  usePageMeta('Browse & Search Services', 'Search services across Colombo, Western Province, and all 25 Sri Lankan districts.');

  const [categories, setCategories] = useState<ServiceCategory[]>(DEFAULT_CATEGORIES);
  const [allListings, setAllListings] = useState<ServiceListing[]>(SAMPLE_LISTINGS);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(8);

  // Filters synced with URL query params
  const [q, setQ] = useState(searchParams.get('q') || '');
  const [categoryId, setCategoryId] = useState(searchParams.get('category') || '');
  const [subcategory, setSubcategory] = useState(searchParams.get('sub') || '');
  const [province, setProvince] = useState(searchParams.get('province') || '');
  const [district, setDistrict] = useState(searchParams.get('district') || '');
  const [city, setCity] = useState(searchParams.get('city') || '');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [minRating, setMinRating] = useState<string>('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'featured' | 'price_asc' | 'price_desc'>('featured');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchActiveCategories(), fetchActiveListings().catch(() => [] as ServiceListing[])])
      .then(([cats, live]) => {
        setCategories(cats);
        setAllListings([...live, ...SAMPLE_LISTINGS]);
      })
      .finally(() => setLoading(false));
  }, []);

  const selectedCatObj = useMemo(
    () => categories.find((c) => c.id === categoryId),
    [categories, categoryId]
  );

  const availableDistricts = useMemo(() => {
    const prov = SRI_LANKA_PROVINCES.find((p) => p.id === province);
    return prov ? prov.districts : SRI_LANKA_PROVINCES.flatMap((p) => p.districts);
  }, [province]);

  const availableCities = useMemo(() => {
    if (!district) return [];
    const found = availableDistricts.find((d) => d.id === district);
    return found ? found.cities : [];
  }, [district, availableDistricts]);

  const filteredListings = useMemo(() => {
    const queryLower = q.trim().toLowerCase();
    const maxP = maxPrice ? Number(maxPrice) : null;
    const minR = minRating ? Number(minRating) : null;

    const list = allListings.filter((item) => {
      if (queryLower) {
        const hay = `${item.title} ${item.description} ${item.subcategory} ${item.providerName} ${item.city} ${item.district}`.toLowerCase();
        if (!hay.includes(queryLower)) return false;
      }
      if (categoryId && item.categoryId !== categoryId) return false;
      if (subcategory && item.subcategory !== subcategory) return false;
      if (province && item.province !== province) return false;
      if (district) {
        const covers = item.district === district || item.coverageDistricts?.includes(district);
        if (!covers) return false;
      }
      if (city && item.city !== city) return false;
      if (maxP !== null && Number.isFinite(maxP) && item.priceLkr > maxP) return false;
      if (minR !== null && Number.isFinite(minR) && (item.ratingAvg || 0) < minR) return false;
      if (verifiedOnly && !item.providerVerified) return false;
      return true;
    });

    if (sortBy === 'price_asc') {
      return [...list].sort((a, b) => a.priceLkr - b.priceLkr);
    }
    if (sortBy === 'price_desc') {
      return [...list].sort((a, b) => b.priceLkr - a.priceLkr);
    }
    return [...list].sort((a, b) => Number(Boolean(b.isFeatured)) - Number(Boolean(a.isFeatured)));
  }, [allListings, q, categoryId, subcategory, province, district, city, maxPrice, minRating, verifiedOnly, sortBy]);

  const clearFilters = () => {
    setQ('');
    setCategoryId('');
    setSubcategory('');
    setProvince('');
    setDistrict('');
    setCity('');
    setMaxPrice('');
    setMinRating('');
    setVerifiedOnly(false);
    setSortBy('featured');
    setSearchParams({});
  };

  return (
    <div className="bg-[#F5F8FD] min-h-screen py-8 pb-24 md:pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#142B4A] tracking-tight">
              {t('navFindServices')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Search providers who cover your Sri Lankan district, compare starting prices, and request quotations.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileFiltersOpen((prev) => !prev)}
              className="lg:hidden min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-medium text-[#142B4A]"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
            </button>
            <Link
              to="/post-job"
              className="min-h-[44px] inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-[#2563EB] text-white text-sm font-semibold hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              {t('navPostJob')}
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Filters Sidebar */}
          <aside
            className={`lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-5 space-y-4 ${
              mobileFiltersOpen ? 'block' : 'hidden lg:block'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="inline-flex items-center gap-2 text-sm font-bold text-[#142B4A]">
                <Filter className="w-4 h-4 text-[#2563EB]" />
                Filters
              </span>
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-medium text-[#2563EB] hover:underline"
              >
                {t('clearFilters')}
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Keyword or Provider</label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="AC repair, Colombo, Solar..."
                  className="w-full min-h-[44px] pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#2563EB]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Category</label>
              <select
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setSubcategory('');
                }}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-[#2563EB]"
              >
                <option value="">All 15 Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {getCategoryName(c, lang)}
                  </option>
                ))}
              </select>
            </div>

            {selectedCatObj && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Subcategory</label>
                <select
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-[#2563EB]"
                >
                  <option value="">All Specialties</option>
                  {selectedCatObj.subcategories.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t('searchProvince')}</label>
              <select
                value={province}
                onChange={(e) => {
                  setProvince(e.target.value);
                  setDistrict('');
                  setCity('');
                }}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-[#2563EB]"
              >
                <option value="">{t('searchAllProvinces')}</option>
                {SRI_LANKA_PROVINCES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {getProvinceLabel(p.id, lang)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t('searchDistrict')}</label>
              <select
                value={district}
                onChange={(e) => {
                  setDistrict(e.target.value);
                  setCity('');
                }}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-[#2563EB]"
              >
                <option value="">{t('searchAllDistricts')}</option>
                {availableDistricts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {getDistrictLabel(d.id, lang)}
                  </option>
                ))}
              </select>
            </div>

            {district && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">{t('searchCity')}</label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-[#2563EB]"
                >
                  <option value="">{t('searchAllCities')}</option>
                  {availableCities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Max LKR</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="e.g. 15000"
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#2563EB]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Min Rating</label>
                <select
                  value={minRating}
                  onChange={(e) => setMinRating(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-[#2563EB]"
                >
                  <option value="">Any</option>
                  <option value="4">4.0+</option>
                  <option value="4.5">4.5+</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2.5 text-sm text-[#142B4A] cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
                className="rounded border-slate-300 text-[#2563EB]"
              />
              <span>Admin-Verified Providers Only</span>
            </label>
          </aside>

          {/* Results Area */}
          <div className="lg:col-span-9 space-y-5">
            <div className="bg-white border border-slate-200 rounded-2xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-600">
                Showing <span className="font-semibold text-[#142B4A] tabular-nums">{filteredListings.length}</span> services
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Sort by</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'featured' | 'price_asc' | 'price_desc')}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-[#142B4A] bg-white focus:outline-none focus:border-[#2563EB]"
                >
                  <option value="featured">Featured & Relevant</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="bg-white border border-slate-200 rounded-2xl h-64 animate-pulse" />
                ))}
              </div>
            ) : filteredListings.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
                <X className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <h2 className="text-lg font-bold text-[#142B4A] mb-1">{t('noResultsTitle')}</h2>
                <p className="text-sm text-slate-600 mb-5">{t('noResultsDesc')}</p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-[#142B4A] hover:bg-slate-50"
                  >
                    {t('clearFilters')}
                  </button>
                  <Link
                    to="/post-job"
                    className="px-4 py-2 rounded-xl bg-[#2563EB] text-white text-sm font-semibold hover:bg-blue-700"
                  >
                    {t('navPostJob')}
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {filteredListings.slice(0, visibleCount).map((item) => (
                    <div
                      key={item.id}
                      className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col justify-between hover:border-[#2563EB] transition-colors"
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
                        <div className="p-5">
                          <div className="text-xs text-slate-500 flex flex-wrap items-center gap-1.5 mb-1.5">
                            <span>{item.subcategory}</span>
                            {item.isSample && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-semibold text-amber-700">{t('sampleDemoLabel')}</span>
                              </>
                            )}
                            {item.providerVerified && !item.isSample && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-semibold text-emerald-700 inline-flex items-center gap-1">
                                  <ShieldCheck className="w-3.5 h-3.5" /> Verified
                                </span>
                              </>
                            )}
                          </div>
                          <h2 className="text-base font-bold text-[#142B4A] mb-1">{item.title}</h2>
                          <p className="text-xs font-medium text-[#2563EB] mb-2">{item.providerName}</p>
                          <p className="text-sm text-slate-600 line-clamp-2 mb-3">{item.description}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              {item.city}, {item.district}
                              {item.coverageDistricts.length > 1
                                ? ` · Covers ${item.coverageDistricts.join(', ')}`
                                : ''}
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="px-4 sm:px-5 py-3.5 border-t border-slate-100 bg-[#F5F8FD]/50 space-y-2.5">
                        <div className="flex items-baseline justify-between">
                          <div>
                            <span className="font-mono text-base font-bold text-[#142B4A] tabular-nums">
                              LKR {item.priceLkr.toLocaleString()}
                            </span>
                            <span className="text-xs text-slate-500 ml-1">/{item.priceUnit || 'service'}</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Link
                            to={`/providers/${item.providerId}`}
                            className="min-h-[44px] px-3 py-2 rounded-xl bg-white border border-slate-200 text-[#142B4A] text-xs font-semibold hover:border-[#2563EB] transition-colors flex items-center justify-center text-center"
                          >
                            {t('viewProfile')}
                          </Link>
                          <Link
                            to={`/post-job?category=${encodeURIComponent(item.categoryId)}&district=${encodeURIComponent(item.district)}`}
                            className="min-h-[44px] px-3 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center text-center"
                          >
                            {t('requestQuote')}
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {visibleCount < filteredListings.length && (
                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setVisibleCount((prev) => prev + 8)}
                      className="min-h-[44px] px-6 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-[#142B4A] hover:bg-slate-50"
                    >
                      Load More Services
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
